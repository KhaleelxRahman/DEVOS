"""Symbol, import, and export extraction for indexed project files.

Python is parsed with the stdlib ``ast`` module, so class/function names and
line numbers are real parser output rather than a guess. JavaScript/TypeScript
use a deliberately narrow regex pass: without a language server available in
the backend, a wrong regex is better than a fabricated symbol, so only
high-confidence declaration forms are recorded.
"""

from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field

# Extensions the extractor understands at all. Anything else is indexed as
# plain text with no symbols, which is honest about what is known.
_PY = (".py",)
_JS_TS = (".ts", ".tsx", ".js", ".jsx")


@dataclass
class SymbolRecord:
    name: str
    kind: str
    line: int
    signature: str | None = None
    parent: str | None = None


@dataclass
class FileFacts:
    """What the extractor learned about one file."""

    symbols: list[SymbolRecord] = field(default_factory=list)
    imports: list[str] = field(default_factory=list)
    exports: list[str] = field(default_factory=list)
    # A parse failure is reported, never silently swallowed.
    parse_error: str | None = None


def _python_facts(source: str) -> FileFacts:
    facts = FileFacts()
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        # Still usable: text search works even when the file will not parse.
        facts.parse_error = f"{type(exc).__name__}: {exc}"
        return facts

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            facts.symbols.append(
                SymbolRecord(node.name, "class", node.lineno, f"class {node.name}")
            )
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            args = [a.arg for a in node.args.args]
            prefix = "async def" if isinstance(node, ast.AsyncFunctionDef) else "def"
            facts.symbols.append(
                SymbolRecord(
                    node.name,
                    "function",
                    node.lineno,
                    f"{prefix} {node.name}({', '.join(args)})",
                )
            )
        elif isinstance(node, ast.Import):
            facts.imports.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            module = node.module or "."
            facts.imports.append(module)
            facts.exports.extend(alias.name for alias in node.names)

    return facts


# Only unambiguous top-level declarations. `const`/`let`/`var`, `function`,
# `class`, and `export` forms; deliberately no arrow-function heuristics,
# because mislabelling a call site as a definition would be a false symbol.
# Only unambiguous top-level declarations: `function`, `class`, and `const`
# forms, with or without `export`. Deliberately no arrow-function heuristics,
# because mislabelling a call site as a definition would be a false symbol.
#
# re.MULTILINE is required on every one of these: `^` otherwise matches only at
# offset 0 of the whole file, so nothing past the first line would ever be
# found. The leading `\s*` is bounded to horizontal whitespace so `^` cannot
# walk down into a later line and produce a bogus match.
_JS_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = tuple(
    (re.compile(pattern, re.MULTILINE), kind)
    for pattern, kind in (
        (r"^[ \t]*export\s+default\s+(?:async\s+)?function\s+(\w+)", "function"),
        (r"^[ \t]*export\s+(?:async\s+)?function\s+(\w+)", "function"),
        (r"^[ \t]*export\s+class\s+(\w+)", "class"),
        (r"^[ \t]*(?:async\s+)?function\s+(\w+)", "function"),
        (r"^[ \t]*class\s+(\w+)", "class"),
        (r"^[ \t]*export\s+const\s+(\w+)", "const"),
        (r"^[ \t]*const\s+(\w+)\s*=\s*(?:async\s*)?\(", "function"),
    )
)

_JS_IMPORT = re.compile(
    r"""^\s*(?:import|export)\b[^'"]*from\s*['"]([^'"]+)['"]""", re.MULTILINE
)
_JS_BARE_IMPORT = re.compile(r"""^\s*import\s*['"]([^'"]+)['"]""", re.MULTILINE)


def _js_facts(source: str) -> FileFacts:
    facts = FileFacts()
    for pattern, kind in _JS_PATTERNS:
        for match in pattern.finditer(source):
            name = match.group(1)
            facts.symbols.append(
                SymbolRecord(name, kind, source[: match.start()].count("\n") + 1)
            )
    facts.imports.extend(_JS_IMPORT.findall(source))
    facts.imports.extend(_JS_BARE_IMPORT.findall(source))

    exported = re.findall(
        r"^\s*export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)", source, re.M
    )
    facts.exports.extend(exported)
    return facts


def extract(path: str, source: str) -> FileFacts:
    """Return the real symbols/imports/exports found in one file."""
    lowered = path.lower()
    if lowered.endswith(_PY):
        return _python_facts(source)
    if lowered.endswith(_JS_TS):
        return _js_facts(source)
    return FileFacts()