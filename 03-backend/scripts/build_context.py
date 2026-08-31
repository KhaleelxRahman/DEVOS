import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

IGNORE = {
    "node_modules",
    "__pycache__",
    ".git",
    "dist",
    ".ruff_cache",
    ".pytest_cache"
}

files=[]

for path in ROOT.rglob("*"):
    if path.is_file():
        if any(part in IGNORE for part in path.parts):
            continue
        try:
            files.append({
                "path": str(path.relative_to(ROOT)),
                "size": path.stat().st_size
            })
        except Exception:
            pass

output=ROOT/"03-backend/data/context/project_context.json"

output.write_text(
    json.dumps({"total_files":len(files),"files":files},indent=2),
    encoding="utf-8"
)

print(f"Indexed {len(files)} files.")
