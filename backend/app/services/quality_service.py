"""Phase 2C — quality tooling detection for a project workspace.

Detection reads the project's REAL configuration files (package.json,
tsconfig.json, pytest configuration) and maps each canonical operation
(BUILD / TEST / LINT / TYPECHECK) to the exact command the Phase 2B
execution engine will run. Commands are drawn only from the execution
policy's approved vocabulary — project files never inject new commands
into the runner.

Phase 2C performs detection only; all subprocess logic stays in
ExecutionService (Phase 2B owns the process engine).
"""

import json
import os
import shutil

from app.schemas.execution import QualityOperationInfo
from app.services.project_service import ProjectService

# Canonical order (recommended quality order: typecheck -> lint -> test -> build).
OPERATION_ORDER = ("TYPECHECK", "LINT", "TEST", "BUILD")

# npm's placeholder default test script is not a real test suite.
_NPM_DEFAULT_TEST_PREFIX = "error: no test specified"


def _read_text(project_root: str, name: str) -> str | None:
    path = os.path.join(project_root, name)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except Exception:
        return None


def _which(tool: str) -> bool:
    return shutil.which(tool) is not None


def _info(operation: str, tool: str, command: str, args: list[str],
          source: str) -> QualityOperationInfo:
    available = _which(tool)
    return QualityOperationInfo(
        operation=operation,
        supported=True,
        available=available,
        command=command,
        arguments=args,
        source=source,
        reason=None if available else f"'{tool}' is not installed on this server",
    )


def _unsupported(operation: str, reason: str) -> QualityOperationInfo:
    return QualityOperationInfo(
        operation=operation, supported=False, available=False,
        command=None, arguments=None, source=None, reason=reason,
    )


def _has_python_tests(project_root: str) -> str | None:
    """Return the config source if a real pytest suite is configured."""
    if os.path.isfile(os.path.join(project_root, "pytest.ini")):
        return "pytest.ini"
    pyproject = _read_text(project_root, "pyproject.toml")
    if pyproject and "[tool.pytest" in pyproject:
        return "pyproject.toml"
    tests_dir = os.path.join(project_root, "tests")
    if os.path.isdir(tests_dir):
        try:
            for entry in os.scandir(tests_dir):
                if entry.is_file() and entry.name.startswith("test_") \
                        and entry.name.endswith(".py"):
                    return "tests/"
        except Exception:
            pass
    return None


def _detect_npm_operation(scripts: dict, deps: dict, project_root: str,
                          operation: str) -> QualityOperationInfo:
    """Detect one npm-package.json operation from real scripts."""
    script_key = {
        "BUILD": "build", "TEST": "test", "LINT": "lint",
    }.get(operation)
    if operation == "TYPECHECK":
        for key, command in (
            ("type-check", "npm run type-check"),
            ("typecheck", "npm run typecheck"),
        ):
            if key in scripts:
                return _info("TYPECHECK", "npm", command, [], "package.json")
        if os.path.isfile(os.path.join(project_root, "tsconfig.json")) \
                and "typescript" in deps:
            return _info("TYPECHECK", "npx", "npx --yes tsc --noEmit", [],
                         "tsconfig.json")
        return _unsupported(
            "TYPECHECK",
            "No 'type-check'/'typecheck' script in package.json and no "
            "tsconfig.json + typescript dependency",
        )
    if script_key is None:  # pragma: no cover - defensive
        return _unsupported(operation, "Unknown quality operation")
    if script_key not in scripts:
        return _unsupported(
            operation, f"No '{script_key}' script in package.json")
    if script_key == "test" and (scripts.get("test") or "").strip().lower() \
            .startswith(_NPM_DEFAULT_TEST_PREFIX):
        return _unsupported(
            "TEST", "package.json contains only npm's default placeholder "
            "test script")
    command = "npm test" if script_key == "test" else f"npm run {script_key}"
    return _info(operation, "npm", command, [], "package.json")


class QualityService:
    """Phase 2C detection: project configuration -> authoritative commands."""

    @staticmethod
    def detect(project_id: str) -> list[QualityOperationInfo]:
        project_root = ProjectService.get_project_storage_path(project_id)
        pkg_raw = _read_text(project_root, "package.json")
        pkg: dict = {}
        if pkg_raw is not None:
            try:
                loaded = json.loads(pkg_raw)
                pkg = loaded if isinstance(loaded, dict) else {}
            except json.JSONDecodeError:
                pkg = {}
        scripts_value = pkg.get("scripts")
        scripts = scripts_value if isinstance(scripts_value, dict) else {}
        deps: dict = {}
        for key in ("dependencies", "devDependencies"):
            value = pkg.get(key)
            if isinstance(value, dict):
                deps.update(value)

        py_tests_source = _has_python_tests(project_root)
        results: list[QualityOperationInfo] = []

        for operation in OPERATION_ORDER:
            if operation == "TEST" and py_tests_source:
                results.append(_info(
                    "TEST", "pytest", "pytest", ["-q"], py_tests_source))
            elif pkg_raw is not None:
                results.append(_detect_npm_operation(
                    scripts, deps, project_root, operation))
            else:
                results.append(_unsupported(
                    operation,
                    "No project configuration detected in the workspace",
                ))
        return results

    @staticmethod
    def detect_operation(project_id: str, operation: str) -> QualityOperationInfo:
        for info in QualityService.detect(project_id):
            if info.operation == operation:
                return info
        return QualityOperationInfo(
            operation=operation, supported=False, available=False,
            command=None, arguments=None, source=None,
            reason="Unknown quality operation",
        )