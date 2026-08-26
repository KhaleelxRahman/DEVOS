import os
from typing import List, Optional
from app.services.project_service import ProjectService
from app.schemas.file import FileNodeResponse, FileContentResponse
from app.core.errors import FileNotFoundException, FileAccessDeniedException

SENSITIVE_PATTERNS = {
    ".env", ".env.local", ".env.production", ".env.development",
    "credentials.json", "secrets.json", "id_rsa", "id_ed25519"
}

SENSITIVE_EXTENSIONS = {".key", ".pem", ".p12", ".pfx"}

# Directories never exposed through the file API or the AI context engine
EXCLUDED_DIRECTORIES = {
    "node_modules", "__pycache__", "dist", "build", ".venv", "venv",
    "target", ".next", ".cache", "coverage",
}

EXTENSION_LANGUAGE_MAP = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".json": "json",
    ".html": "html",
    ".css": "css",
    ".md": "markdown",
    ".sql": "sql",
    ".sh": "shell",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".txt": "plaintext",
}

class FileService:
    @staticmethod
    def is_sensitive(name: str) -> bool:
        if name in SENSITIVE_PATTERNS or name.startswith(".env."):
            return True
        _, ext = os.path.splitext(name.lower())
        return ext in SENSITIVE_EXTENSIONS

    @staticmethod
    def validate_safe_path(project_id: str, relative_path: str) -> str:
        project_root = os.path.abspath(ProjectService.get_project_storage_path(project_id))
        clean_rel = relative_path.lstrip("/\\")
        target_path = os.path.abspath(os.path.join(project_root, clean_rel))

        # Check path traversal
        if not target_path.startswith(project_root):
            raise FileAccessDeniedException("Path traversal attempt detected")

        # Check sensitive file
        if FileService.is_sensitive(os.path.basename(target_path)):
            raise FileAccessDeniedException("Access to sensitive credentials file is blocked")

        return target_path

    @staticmethod
    def get_file_tree(project_id: str) -> List[FileNodeResponse]:
        project_root = os.path.abspath(ProjectService.get_project_storage_path(project_id))
        
        def walk_dir(current_path: str, rel_path: str = "") -> List[FileNodeResponse]:
            nodes: List[FileNodeResponse] = []
            try:
                entries = sorted(os.scandir(current_path), key=lambda e: (not e.is_dir(), e.name.lower()))
            except Exception:
                return nodes

            for entry in entries:
                if (
                    entry.name.startswith(".git")
                    or entry.name in EXCLUDED_DIRECTORIES
                ):
                    continue
                
                # Check sensitive
                if FileService.is_sensitive(entry.name):
                    continue

                item_rel_path = os.path.join(rel_path, entry.name).replace("\\", "/")

                if entry.is_dir():
                    children = walk_dir(entry.path, item_rel_path)
                    nodes.append(
                        FileNodeResponse(
                            name=entry.name,
                            path=item_rel_path,
                            type="directory",
                            children=children,
                        )
                    )
                else:
                    _, ext = os.path.splitext(entry.name)
                    stat = entry.stat()
                    nodes.append(
                        FileNodeResponse(
                            name=entry.name,
                            path=item_rel_path,
                            type="file",
                            size=stat.st_size,
                            extension=ext.lstrip(".").lower(),
                        )
                    )
            return nodes

        return walk_dir(project_root)

    @staticmethod
    def get_file_content(project_id: str, relative_path: str) -> FileContentResponse:
        abs_path = FileService.validate_safe_path(project_id, relative_path)

        if not os.path.isfile(abs_path):
            raise FileNotFoundException()

        stat = os.stat(abs_path)
        if stat.st_size > 2 * 1024 * 1024:  # 2MB cap for viewer
            raise FileAccessDeniedException("File exceeds maximum viewable size (2MB)")

        try:
            with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception as e:
            raise FileAccessDeniedException(f"Unable to read file: {str(e)}")

        _, ext = os.path.splitext(abs_path)
        language = EXTENSION_LANGUAGE_MAP.get(ext.lower(), "plaintext")

        return FileContentResponse(
            name=os.path.basename(abs_path),
            path=relative_path.replace("\\", "/"),
            content=content,
            language=language,
            size=stat.st_size,
        )

    # --- Mutation operations (authenticated, owner-scoped, path-validated) ---

    BLOCKED_UPLOAD_EXTENSIONS = {".exe", ".bat", ".cmd", ".ps1", ".msi", ".com", ".scr"}
    MAX_FILE_WRITE_BYTES = 2 * 1024 * 1024
    MAX_UPLOAD_BYTES = 10 * 1024 * 1024
    MAX_UPLOADS_PER_REQUEST = 20

    @staticmethod
    def _validate_new_name(project_id: str, parent_rel: str, name: str) -> str:
        if not name or name.strip() != name:
            raise FileAccessDeniedException("Invalid name")
        if name in (".", "..") or "/" in name or "\\" in name or "\x00" in name:
            raise FileAccessDeniedException("Invalid name: path separators are not allowed")
        if name.startswith("."):
            raise FileAccessDeniedException("Hidden files and folders are not allowed")
        if FileService.is_sensitive(name):
            raise FileAccessDeniedException("This filename is reserved for sensitive credentials and is not allowed")
        rel = f"{parent_rel.rstrip('/')}/{name}" if parent_rel else name
        return FileService.validate_safe_path(project_id, rel)

    @staticmethod
    def create_file(project_id: str, parent_rel: str, name: str, content: str = "") -> FileContentResponse:
        abs_path = FileService._validate_new_name(project_id, parent_rel, name)
        if os.path.exists(abs_path):
            raise FileAccessDeniedException("A file or folder with this name already exists")
        if len(content.encode("utf-8")) > FileService.MAX_FILE_WRITE_BYTES:
            raise FileAccessDeniedException("File content exceeds the 2MB limit")
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, "x", encoding="utf-8") as f:
            f.write(content)
        return FileService.get_file_content(project_id, f"{parent_rel.rstrip('/') + '/' if parent_rel else ''}{name}")

    @staticmethod
    def create_folder(project_id: str, parent_rel: str, name: str) -> str:
        abs_path = FileService._validate_new_name(project_id, parent_rel, name)
        if os.path.exists(abs_path):
            raise FileAccessDeniedException("A file or folder with this name already exists")
        os.makedirs(abs_path)
        return f"{parent_rel.rstrip('/') + '/' if parent_rel else ''}{name}"

    @staticmethod
    def save_file(project_id: str, relative_path: str, content: str) -> FileContentResponse:
        abs_path = FileService.validate_safe_path(project_id, relative_path)
        if not os.path.isfile(abs_path):
            raise FileNotFoundException()
        if len(content.encode("utf-8")) > FileService.MAX_FILE_WRITE_BYTES:
            raise FileAccessDeniedException("File content exceeds the 2MB limit")
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(content)
        return FileService.get_file_content(project_id, relative_path)

    @staticmethod
    def rename(project_id: str, relative_path: str, new_name: str) -> str:
        abs_path = FileService.validate_safe_path(project_id, relative_path)
        if not os.path.exists(abs_path):
            raise FileNotFoundException()
        parent_abs = os.path.dirname(abs_path)
        project_root = os.path.abspath(ProjectService.get_project_storage_path(project_id))
        if os.path.abspath(parent_abs) == project_root and os.path.isdir(abs_path):
            raise FileAccessDeniedException("Cannot rename the project root")
        parent_rel = os.path.relpath(parent_abs, project_root).replace("\\", "/")
        parent_rel = "" if parent_rel == "." else parent_rel
        new_abs = FileService._validate_new_name(project_id, parent_rel, new_name)
        if os.path.exists(new_abs):
            raise FileAccessDeniedException("A file or folder with this name already exists")
        os.rename(abs_path, new_abs)
        return f"{parent_rel + '/' if parent_rel else ''}{new_name}"

    @staticmethod
    def delete(project_id: str, relative_path: str) -> None:
        import shutil
        abs_path = FileService.validate_safe_path(project_id, relative_path)
        project_root = os.path.abspath(ProjectService.get_project_storage_path(project_id))
        if os.path.abspath(abs_path) == project_root:
            raise FileAccessDeniedException("Cannot delete the project root")
        if not os.path.exists(abs_path):
            raise FileNotFoundException()
        if os.path.isdir(abs_path):
            shutil.rmtree(abs_path)
        else:
            os.remove(abs_path)

    @staticmethod
    def save_upload(project_id: str, parent_rel: str, filename: str, data: bytes) -> str:
        if len(data) > FileService.MAX_UPLOAD_BYTES:
            raise FileAccessDeniedException(f"File exceeds the {FileService.MAX_UPLOAD_BYTES // (1024*1024)}MB upload limit")
        safe_name = os.path.basename(filename.replace("\\", "/"))
        _, ext = os.path.splitext(safe_name.lower())
        if ext in FileService.BLOCKED_UPLOAD_EXTENSIONS:
            raise FileAccessDeniedException(f"File type {ext} is not allowed")
        abs_path = FileService._validate_new_name(project_id, parent_rel, safe_name)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        if os.path.exists(abs_path):
            # Overwriting via upload is allowed only for identical re-upload UX;
            # rename first if the user needs to keep both copies.
            raise FileAccessDeniedException("A file or folder with this name already exists")
        with open(abs_path, "xb") as f:
            f.write(data)
        return f"{parent_rel.rstrip('/') + '/' if parent_rel else ''}{safe_name}"
