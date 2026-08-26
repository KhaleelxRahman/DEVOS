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
