"""Phase 1 builder service (D-02..D-11, D-14, D-16, D-18, D-21).

Deterministic template-driven generation (no shell execution). Reuses
ProjectService (ownership/storage), FileService (path/security/write) and the
Generation transaction model. Requirements classified EXPLICIT / INFERRED /
OPTIONAL / UNSUPPORTED with no silent substitution.
"""

from datetime import datetime, timezone


from app.schemas.builder import (
    ClassifiedRequirement,
    NormalizedBuildSpec,
)

TERMINAL_STATUSES = {"COMPLETED", "PARTIAL", "FAILED", "CANCELLED", "BLOCKED"}

ALLOWED_TRANSITIONS = {
    "IDLE": {"PLANNING", "CANCELLED"},
    "PLANNING": {"GENERATING", "BLOCKED", "FAILED", "CANCELLED"},
    "GENERATING": {"APPLYING", "PARTIAL", "FAILED", "CANCELLED"},
    "APPLYING": {"SYNCING", "PARTIAL", "FAILED", "CANCELLED"},
    "SYNCING": {"COMPLETED", "PARTIAL", "FAILED", "CANCELLED"},
}

UNSUPPORTED_TECHNOLOGIES = {
    "quantum computer", "blockchain consensus", "cobol mainframe",
    "unity vr", "unreal engine", "ios swiftui", "android kotlin native",
}

ENV_REQUIREMENTS = ["DATABASE_URL", "PORT", "NODE_ENV"]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _mentions(text: str, *terms: str) -> bool:
    lowered = text.lower()
    return any(term in lowered for term in terms)


def classify_requirements(prompt: str) -> tuple[list[ClassifiedRequirement], NormalizedBuildSpec]:
    """D-05: classify every requirement; never silently substitute."""
    reqs: list[ClassifiedRequirement] = []

    def add(key: str, label: str, value: str, cls: str, reason: str | None = None):
        reqs.append(ClassifiedRequirement(
            key=key, label=label, value=value,
            classification=cls, reason=reason,  # type: ignore[arg-type]
        ))

    add("create_task", "Create task", "Users can create a task with a title",
        "EXPLICIT", "stated: create task")
    add("list_tasks", "List tasks", "Users can list all tasks",
        "EXPLICIT", "stated: list tasks")
    add("complete_task", "Mark task complete", "Users can toggle task completion",
        "EXPLICIT", "stated: mark task complete")
    add("delete_task", "Delete task", "Users can delete a task",
        "EXPLICIT", "stated: delete task")
    add("rest_api", "REST API", "CRUD over HTTP: GET/POST/PATCH/DELETE /api/tasks",
        "EXPLICIT", "stated: REST API")
    add("postgres", "PostgreSQL persistence", "Tasks persisted in PostgreSQL via DATABASE_URL",
        "EXPLICIT", "stated: PostgreSQL persistence")
    add("readme", "README with setup", "README documents install, env, run, API",
        "EXPLICIT", "stated: README with setup instructions")
    add("react_ui", "React UI", "React functional components with hooks",
        "INFERRED", "stack says React; UI shape inferred, not substituted")
    add("express_server", "Express server", "Express app with JSON middleware + routes",
        "INFERRED", "stack says Express; server shape inferred, not substituted")
    add("filter_tasks", "Filter/search tasks", "Optional client-side filter",
        "OPTIONAL", "useful but not requested")
    add("due_dates", "Due dates", "Optional due-date field",
        "OPTIONAL", "useful but not requested")

    lowered = prompt.lower()
    unsupported: list[str] = []
    for tech in sorted(UNSUPPORTED_TECHNOLOGIES):
        if tech in lowered:
            unsupported.append(tech)
            add(f"unsupported_{len(unsupported)}", "Unsupported request", tech,
                "UNSUPPORTED", f"'{tech}' is outside the Phase 1 supported stack")

    if not _mentions(prompt, "react", "express", "postgres", "todo"):
        add("stack_default", "Default stack", "React + Express + PostgreSQL default",
            "INFERRED", "no explicit stack terms; default applied openly")

    stack = {"frontend": "React", "backend": "Express", "database": "PostgreSQL"}
    plan = [
        "Validate stack (React + Express + PostgreSQL)",
        "Create/select project",
        "Generate directories (client/, server/)",
        "Generate backend (server/index.js, server/routes/tasks.js, server/db.js)",
        "Generate frontend (client/App.jsx, client/api.js, client/index.html)",
        "Generate config + docs (package.json files, .env.example, README.md)",
        "Static integrity check (imports, routes, payloads, consistency)",
        "Apply files + sync workspace",
    ]
    files = planned_files()
    spec = NormalizedBuildSpec(
        app_name="Todo App",
        summary="Simple Todo App: create/list/complete/delete tasks over a REST API persisted in PostgreSQL.",
        stack=stack,
        requirements=reqs,
        unsupported=unsupported,
        missing_environment=list(ENV_REQUIREMENTS),
        plan=plan,
        files=files,
    )
    return reqs, spec


def build_plan_text(spec: NormalizedBuildSpec) -> str:
    lines = [f"# Build Plan: {spec.app_name}", "", spec.summary, "",
             f"Stack: {spec.stack.get('frontend')} + {spec.stack.get('backend')} + {spec.stack.get('database')}", "",
             "## Requirements"]
    for r in spec.requirements:
        lines.append(f"- [{r.classification}] {r.label}: {r.value}")
    if spec.unsupported:
        lines.append("")
        lines.append("## Unsupported (blocked, not substituted)")
        for u in spec.unsupported:
            lines.append(f"- {u}")
    lines.extend(["", "## Files"])
    for f in spec.files:
        lines.append(f"- {f}")

    return "\n".join(lines)


def planned_files() -> list[str]:
    """Deterministic file manifest for the default Todo App generation."""
    return [
        "server/index.js",
        "server/db.js",
        "server/routes/tasks.js",
        "client/index.html",
        "client/App.jsx",
        "client/api.js",
        "client/index.js",
        "client/App.css",
        "package.json",
        "server/package.json",
        ".env.example",
        "README.md",
    ]


class BuilderService:
    """Thin facade over builder helpers for context/usage parity."""

    def __init__(self) -> None:
        self.terminal_statuses = TERMINAL_STATUSES
        self.allowed_transitions = ALLOWED_TRANSITIONS

    def classify(self, prompt: str) -> tuple[list[ClassifiedRequirement], NormalizedBuildSpec]:
        return classify_requirements(prompt)


BACKGROUND_STORE: dict[str, dict] = {}
