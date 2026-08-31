import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CONTEXT_FILE = ROOT / "data/context/project_context.json"

def search_files(query: str):
    if not CONTEXT_FILE.exists():
        return {"status":"error","message":"Project context not found."}

    data = json.loads(CONTEXT_FILE.read_text(encoding="utf-8"))

    matches = [
        f for f in data["files"]
        if query.lower() in f["path"].lower()
    ]

    return {
        "status":"success",
        "query":query,
        "matches":matches[:20],
        "total":len(matches)
    }
