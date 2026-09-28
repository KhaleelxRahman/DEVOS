"""Phase 6 service: the single canonical index and search layer.

Phase 3 (diagnosis) and Phase 4 (repair) both need real repository context.
They use this one layer rather than each growing its own grep, so indexing,
freshness, and project scoping behave identically everywhere.

Two properties this service owns:

* **Freshness** - queries compare stored content hashes against the files on
  disk and refresh before answering, so a Phase 4 repair is visible to the very
  next query. No stale context.
* **Scoping** - every read filters on ``project_id``, so a query for one project
  cannot return another project's files even for an identical path.
"""

from __future__ import annotations

import hashlib
import math
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.repo_index import RepoFile, RepoIndex, RepoSymbol
from app.models.user import User
from app.phase6_repo_index.extractor import extract
from app.services.file_service import EXCLUDED_DIRECTORIES
from app.services.project_service import ProjectService

# Mirrors FileService's sensitive-file policy. The indexer is a second reader of
# the same project files, so it must honour the same exclusions rather than
# quietly widening what the file API already refuses to expose.
SENSITIVE_BASENAMES = {".env", "credentials.json", "secrets.json", "id_rsa", "id_ed25529"}
SENSITIVE_EXTENSIONS = {".key", ".pem", ".p12", ".pfx"}
MAX_INDEXED_BYTES = 512 * 1024
TOKEN_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")

LANGUAGES = {
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
    ".yml": "yaml",
    ".yaml": "yaml",
    ".txt": "plaintext",
}


class ProjectNotIndexedError(Exception):
    """Raised when a query arrives before the project has been indexed."""


@dataclass
class SearchHit:
    path: str
    score: float
    kind: str = "file"
    symbol: str | None = None
    line: int | None = None
    snippet: str | None = None

    def to_dict(self) -> dict:
        return {
            "path": self.path,
            "score": round(self.score, 4),
            "kind": self.kind,
            "symbol": self.symbol,
            "line": self.line,
            "snippet": self.snippet,
        }


def _hash_bytes(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _tokenize(text: str) -> list[str]:
    """Split identifiers so ``get_project`` also matches ``getProject``."""
    tokens: list[str] = []
    for raw in TOKEN_RE.findall(text):
        tokens.append(raw.lower())
        for part in re.findall(r"[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[a-z0-9]+", raw):
            if part.lower() != raw.lower():
                tokens.append(part.lower())
    return tokens


def _is_indexable(path: Path) -> bool:
    if path.name in SENSITIVE_BASENAMES or path.suffix.lower() in SENSITIVE_EXTENSIONS:
        return False
    if any(part in EXCLUDED_DIRECTORIES for part in path.parts):
        return False
    return True


class RepoIndexService:
    """Builds, refreshes, and queries the project index."""

    @staticmethod
    async def _get_or_create_index(db: AsyncSession, project_id: str) -> RepoIndex:
        index = (
            await db.execute(select(RepoIndex).where(RepoIndex.project_id == project_id))
        ).scalar_one_or_none()
        if index is None:
            index = RepoIndex(project_id=project_id)
            db.add(index)
            await db.flush()
        return index

    @staticmethod
    async def _files(db: AsyncSession, project_id: str) -> list[RepoFile]:
        """Every indexed file for one project. Always project-scoped."""
        return list(
            (
                await db.execute(
                    select(RepoFile).where(RepoFile.project_id == project_id)
                )
            )
            .scalars()
            .all()
        )

    @staticmethod
    async def _symbols(db: AsyncSession, project_id: str) -> list[RepoSymbol]:
        return list(
            (
                await db.execute(
                    select(RepoSymbol).where(RepoSymbol.project_id == project_id)
                )
            )
            .scalars()
            .all()
        )

    @staticmethod
    def _disk_hashes(project_id: str) -> dict[str, str]:
        """Content hash of each indexable file, keyed by relative POSIX path."""
        root = Path(ProjectService.get_project_storage_path(project_id))
        found: dict[str, str] = {}
        for disk_path in sorted(root.rglob("*")):
            if not disk_path.is_file() or not _is_indexable(disk_path):
                continue
            try:
                raw = disk_path.read_bytes()
            except OSError:
                continue
            if len(raw) > MAX_INDEXED_BYTES:
                continue
            try:
                raw.decode("utf-8")
            except UnicodeDecodeError:
                continue  # binary or non-UTF-8: not text context
            found[disk_path.relative_to(root).as_posix()] = _hash_bytes(raw)
        return found

    @staticmethod
    async def index_project(
        db: AsyncSession,
        user: User,
        project_id: str,
        reason: str = "full",
    ) -> RepoIndex:
        """Re-index a project from the real files on disk.

        ``reason`` records why the refresh happened (``full``, ``manual``,
        ``stale``) so freshness is auditable rather than assumed.
        """
        await ProjectService.get_for_user(db, project_id, user.id)  # ownership
        index = await RepoIndexService._get_or_create_index(db, project_id)

        # Replace wholesale: a file deleted on disk must disappear from the
        # index, so partial reuse here would resurrect it forever.
        #
        # RepoSymbol rows are deleted explicitly as well. The ORM-level
        # "delete-orphan" cascade only fires when a parent is removed through
        # the session; a bulk ``delete()`` statement bypasses it, so relying on
        # the cascade alone would leave orphaned symbols behind and they would
        # resurface in symbol search for a file that no longer exists.
        await db.execute(
            delete(RepoSymbol).where(RepoSymbol.project_id == project_id)
        )
        await db.execute(delete(RepoFile).where(RepoFile.index_id == index.id))

        root = Path(ProjectService.get_project_storage_path(project_id))
        term_frequencies: Counter[str] = Counter()
        document_frequencies: Counter[str] = Counter()
        total_terms = 0

        for rel, digest in RepoIndexService._disk_hashes(project_id).items():
            source = (root / rel).read_text(encoding="utf-8")
            facts = extract(rel, source)
            tokens = _tokenize(source)
            term_frequencies.update(tokens)
            document_frequencies.update(set(tokens))
            total_terms += len(tokens)

            file_row = RepoFile(
                index_id=index.id,
                project_id=project_id,
                path=rel,
                language=LANGUAGES.get(Path(rel).suffix.lower()),
                size_bytes=len(source.encode("utf-8")),
                line_count=source.count("\n") + 1,
                content_hash=digest,
                content=source,
            )
            db.add(file_row)
            await db.flush()

            for sym in facts.symbols:
                db.add(
                    RepoSymbol(
                        file_id=file_row.id,
                        project_id=project_id,
                        path=rel,
                        name=sym.name,
                        kind=sym.kind,
                        line=sym.line,
                        signature=sym.signature,
                        parent=sym.parent,
                        imports=sorted(set(facts.imports)) or None,
                        exports=sorted(set(facts.exports)) or None,
                    )
                )

        index.generation += 1
        index.file_count = len(RepoIndexService._disk_hashes(project_id))
        # Flush first: the symbol rows above are only pending in the session,
        # so a SELECT would otherwise count zero. This must be counted from the
        # rows just written for THIS index, not from every symbol row carrying
        # the project_id, or a stale row would inflate the total.
        await db.flush()
        index.symbol_count = len(
            (
                await db.execute(
                    select(RepoSymbol).where(RepoSymbol.project_id == project_id)
                )
            )
            .scalars()
            .all()
        )
        index.term_frequencies = dict(term_frequencies)
        index.document_frequencies = dict(document_frequencies)
        index.total_terms = total_terms
        index.last_reindex_reason = reason
        await db.commit()
        await db.refresh(index)
        return index

    @staticmethod
    async def refresh_if_stale(
        db: AsyncSession, user: User, project_id: str
    ) -> bool:
        """Re-index only when the files on disk no longer match the index.

        Returns True when a refresh happened. This is the incremental path: an
        unchanged project costs one hash pass and no re-parse.
        """
        await ProjectService.get_for_user(db, project_id, user.id)
        index = (
            await db.execute(select(RepoIndex).where(RepoIndex.project_id == project_id))
        ).scalar_one_or_none()
        if index is None:
            return False

        stored = {
            path: digest
            for path, digest in (
                await db.execute(
                    select(RepoFile.path, RepoFile.content_hash).where(
                        RepoFile.index_id == index.id
                    )
                )
            ).all()
        }
        if stored == RepoIndexService._disk_hashes(project_id):
            return False
        await RepoIndexService.index_project(db, user, project_id, reason="stale")
        return True

    @staticmethod
    async def stats(db: AsyncSession, user: User, project_id: str) -> dict:
        index = (
            await db.execute(select(RepoIndex).where(RepoIndex.project_id == project_id))
        ).scalar_one_or_none()
        if index is None:
            raise ProjectNotIndexedError(
                "This project has no index yet. POST to /repo-index first."
            )
        languages: Counter[str] = Counter()
        for file_row in await RepoIndexService._files(db, project_id):
            if file_row.language:
                languages[file_row.language] += 1
        return {
            "project_id": project_id,
            "generation": index.generation,
            "file_count": index.file_count,
            "symbol_count": index.symbol_count,
            "last_reindex_reason": index.last_reindex_reason,
            "languages": dict(languages),
        }

    @staticmethod
    async def find_files(
        db: AsyncSession, user: User, project_id: str, query: str
    ) -> list[dict]:
        """Filename search over the project's real indexed paths."""
        await ProjectService.get_for_user(db, project_id, user.id)
        needle = query.lower()
        rows = await RepoIndexService._files(db, project_id)
        return [
            {"path": f.path, "language": f.language, "size_bytes": f.size_bytes}
            for f in sorted(rows, key=lambda f: f.path)
            if needle in f.path.lower()
        ]

    @staticmethod
    async def search_text(
        db: AsyncSession, user: User, project_id: str, query: str, limit: int = 20
    ) -> list[SearchHit]:
        """Literal text search returning real matching lines."""
        await ProjectService.get_for_user(db, project_id, user.id)
        needle = query.lower()
        hits: list[SearchHit] = []
        for file_row in await RepoIndexService._files(db, project_id):
            for number, line in enumerate((file_row.content or "").splitlines(), 1):
                if needle in line.lower():
                    hits.append(
                        SearchHit(
                            path=file_row.path,
                            score=1.0,
                            kind="text",
                            line=number,
                            snippet=line.strip()[:200],
                        )
                    )
        return hits[:limit]

    @staticmethod
    async def search_symbols(
        db: AsyncSession, user: User, project_id: str, query: str, limit: int = 25
    ) -> list[dict]:
        """Symbol search over real extracted definitions."""
        await ProjectService.get_for_user(db, project_id, user.id)
        needle = query.lower()
        exact, partial = [], []
        for sym in await RepoIndexService._symbols(db, project_id):
            if sym.name.lower() == needle:
                exact.append(sym)
            elif needle in sym.name.lower():
                partial.append(sym)
        return [
            {
                "name": s.name,
                "kind": s.kind,
                "path": s.path,
                "line": s.line,
                "signature": s.signature,
            }
            for s in (exact + partial)[:limit]
        ]

    @staticmethod
    async def find_references(
        db: AsyncSession, user: User, project_id: str, name: str, limit: int = 25
    ) -> list[dict]:
        """Find real usages of a symbol, excluding its own definition lines."""
        await ProjectService.get_for_user(db, project_id, user.id)
        pattern = re.compile(rf"\b{re.escape(name)}\b")
        definitions = {
            (s.path, s.line)
            for s in await RepoIndexService._symbols(db, project_id)
            if s.name == name
        }
        results: list[dict] = []
        for file_row in await RepoIndexService._files(db, project_id):
            for number, line in enumerate((file_row.content or "").splitlines(), 1):
                if pattern.search(line) and (file_row.path, number) not in definitions:
                    results.append(
                        {
                            "path": file_row.path,
                            "line": number,
                            "snippet": line.strip()[:200],
                        }
                    )
        return results[:limit]

    @staticmethod
    async def search_semantic(
        db: AsyncSession, user: User, project_id: str, query: str, limit: int = 10
    ) -> list[SearchHit]:
        """Rank real files by TF-IDF against the query terms.

        Retrieval, not dumping: only the highest-scoring files come back, and a
        query with no matching term yields an empty list rather than a guess.
        """
        await ProjectService.get_for_user(db, project_id, user.id)
        index = (
            await db.execute(select(RepoIndex).where(RepoIndex.project_id == project_id))
        ).scalar_one_or_none()
        if index is None or not index.term_frequencies or not index.total_terms:
            return []

        terms = set(_tokenize(query))
        if not terms:
            return []

        df = index.document_frequencies or {}
        total_docs = max(index.file_count, 1)
        scores: list[tuple[float, RepoFile]] = []
        for file_row in await RepoIndexService._files(db, project_id):
            file_tokens = _tokenize(file_row.content or "")
            if not file_tokens:
                continue
            local_tf = Counter(file_tokens)
            score = 0.0
            for term in terms:
                freq = local_tf.get(term, 0)
                if not freq:
                    continue
                idf = math.log(total_docs / (1 + df.get(term, 0))) + 1.0
                score += (freq / len(file_tokens)) * idf
            if score > 0:
                scores.append((score, file_row))
        scores.sort(key=lambda pair: pair[0], reverse=True)
        return [
            SearchHit(path=f.path, score=round(score, 4), kind="semantic")
            for score, f in scores[:limit]
        ]

    @staticmethod
    async def get_architecture(
        db: AsyncSession, user: User, project_id: str
    ) -> dict:
        """Describe the project's real structure from its indexed symbols."""
        await ProjectService.get_for_user(db, project_id, user.id)
        symbols = await RepoIndexService._symbols(db, project_id)
        by_kind: Counter[str] = Counter(s.kind for s in symbols)
        imports: set[str] = set()
        for sym in symbols:
            imports.update(sym.imports or [])
        return {
            "project_id": project_id,
            "symbols_by_kind": dict(by_kind),
            "internal_modules": sorted(
                imp for imp in imports if not imp.startswith((".", "/"))
            )[:50],
            "total_symbols": len(symbols),
        }
