from typing import Dict

def generate_suggestion(code: str) -> Dict[str, str]:
    """
    Lightweight AI placeholder.
    Replace with OpenAI integration later.
    """

    suggestion = "Code reviewed successfully."

    if "TODO" in code:
        suggestion = "Found TODO comment. Consider completing the implementation."

    return {
        "status": "success",
        "suggestion": suggestion
    }
