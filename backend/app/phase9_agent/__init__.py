"""Phase 9 agent safety helpers.

Three responsibilities, deliberately separate from the orchestrator:

* ``redaction``  - secrets never leave the machine, in either direction.
* ``validation`` - raw model output is never trusted or executed directly.
* ``planner`` / ``coder`` - real model use, through the existing AIService,
  with a deterministic fallback that is honestly labelled.
"""
