"""Failure-signature registry for Phase 3.

Each signature is a real, named error pattern emitted by real toolchains.
A signature may only be used to license an INFERRED claim, and the
signature name is emitted as the claim's ``source`` so the inference is
auditable after the fact.

Two tiers:

* ``STRONG_SIGNATURES`` — a specific, machine-readable diagnostic
  (e.g. ``EADDRINUSE``, ``TS2322``, ``Cannot find module``). The code
  identifies the condition precisely; confidence is high.
* ``WEAK_SIGNATURES`` — a generic phrase (e.g. "build failed"). It only
  corroborates; it never establishes a root cause on its own.

Nothing here inspects files, network, or the environment. A signature
either matches the captured text or it does not.
"""

from dataclasses import dataclass

from app.phase3_diagnostics.evidence import FailureCategory


@dataclass(frozen=True)
class Signature:
    """One named, auditable failure signature."""

    name: str
    pattern: str
    category: FailureCategory
    cause: str
    fix: str
    strong: bool = True


STRONG_SIGNATURES: tuple[Signature, ...] = (
    # --- dependency -----------------------------------------------------
    Signature(
        name="node_module_not_found",
        pattern=r"Cannot find module '([^']+)'|"
                r"Error: Cannot find module|MODULE_NOT_FOUND",
        category=FailureCategory.DEPENDENCY,
        cause="A required module could not be resolved from node_modules.",
        fix="Run the project's install step (npm install) and confirm the "
            "package is listed in package.json dependencies.",
    ),
    Signature(
        name="python_module_not_found",
        pattern=r"ModuleNotFoundError: No module named '([^']+)'",
        category=FailureCategory.DEPENDENCY,
        cause="A required Python module is not installed in the "
              "environment running the command.",
        fix="Install the missing package into the active interpreter "
            "(pip install <module>) or run the command with the "
            "environment that has it.",
    ),
    Signature(
        name="command_not_found",
        pattern=r"'([^']+)' is not recognized as an internal or "
                r"external command|command not found: (\S+)|"
                r"sh: (\S+): command not found",
        category=FailureCategory.ENVIRONMENT,
        cause="The command binary is not present on the PATH of the "
              "execution environment.",
        fix="Install the tool or make sure it is on PATH for the server "
            "that runs the command.",
    ),
    # --- port -----------------------------------------------------------
    Signature(
        name="eaddrinuse",
        pattern=r"EADDRINUSE|address already in use|"
                r"Only one usage of each socket address",
        category=FailureCategory.PORT,
        cause="The requested TCP port is already bound by another "
              "process, so the server could not listen.",
        fix="Stop the process holding the port, or start the server on "
            "a different port.",
    ),
    # --- configuration --------------------------------------------------
    Signature(
        name="missing_script",
        pattern=r"Missing script: \"(\w+)\"|"
                r"npm ERR! missing script",
        category=FailureCategory.CONFIGURATION,
        cause="package.json does not define the script the command "
              "invoked.",
        fix="Add the missing script to package.json, or invoke a script "
            "the project actually defines.",
    ),
    Signature(
        name="missing_env_var",
        pattern=r"([A-Z][A-Z0-9_]{2,}) is not defined|"
                r"Missing required environment variable: (\w+)|"
                r"Environment variable not found: (\w+)",
        category=FailureCategory.CONFIGURATION,
        cause="A required environment variable or configuration value "
              "is not set in the environment running the command.",
        fix="Define the reported variable in the project's .env file and "
            "make sure the execution environment loads it.",
    ),
    Signature(
        name="missing_config_file",
        pattern=r"Cannot find module '(\./)?(tsconfig|package|"
                r"vite\.config|\.env)[\w.]*'|"
                r"Could not read (?:file|config)",
        category=FailureCategory.CONFIGURATION,
        cause="A configuration file the toolchain requires is absent "
              "from the workspace.",
        fix="Add the missing configuration file to the project root.",
    ),
    # --- type -----------------------------------------------------------
    Signature(
        name="typescript_error",
        pattern=r"error TS\d+:",
        category=FailureCategory.TYPE,
        cause="The TypeScript compiler reported a type error at the "
              "location it printed.",
        fix="Correct the type mismatch at the reported file and line; "
            "the compiler message names the offending types.",
    ),
    Signature(
        name="tsconfig_missing",
        pattern=r"error TS5083|Cannot read file '.*tsconfig",
        category=FailureCategory.TYPE,
        cause="tsconfig.json is missing or unreadable, so the type "
              "check cannot resolve project options.",
        fix="Add a valid tsconfig.json to the project root.",
    ),
    # --- compile --------------------------------------------------------
    Signature(
        name="python_syntax_error",
        pattern=r"SyntaxError: (.*)|IndentationError: (.*)|"
                r"File \"([^\"]+)\", line (\d+)",
        category=FailureCategory.COMPILE,
        cause="The Python source could not be parsed.",
        fix="Fix the syntax error at the reported file and line.",
    ),
    Signature(
        name="build_rollup_failed",
        pattern=r"Rollup failed to resolve import|"
                r"Could not resolve \"[^\"]+\"|"
                r"\[vite\]:? .*[Ee]rror",
        category=FailureCategory.BUILD,
        cause="The bundler could not resolve an import or module during "
              "the build.",
        fix="Install the unresolved dependency or correct the import "
            "path the bundler reported.",
    ),
    Signature(
        name="webpack_error",
        pattern=r"Module not found: Error: Can't resolve '([^']+)'|"
                r"ERROR in \./",
        category=FailureCategory.BUILD,
        cause="The bundler could not resolve a module reference.",
        fix="Install the missing dependency or fix the import path.",
    ),
    # --- lint -----------------------------------------------------------
    Signature(
        name="eslint_problems",
        pattern=r"✖\s+\d+\s+problems?|"
                r"\d+\s+problems?\s+\(\d+\s+errors?|"
                r"ESLint found \d+ error",
        category=FailureCategory.LINT,
        cause="ESLint reported rule violations; the count and per-file "
              "breakdown are printed in the output.",
        fix="Fix the reported rule violations, or run the linter's "
            "auto-fix and review the result.",
    ),
    # --- test -----------------------------------------------------------
    Signature(
        name="pytest_failed",
        pattern=r"=+ (FAILURES|ERRORS) =+|\d+ failed",
        category=FailureCategory.TEST,
        cause="The test run reported failing tests; the failure detail "
              "names the test and the assertion.",
        fix="Inspect the reported failing test output and correct the "
            "code or expectation it exercises.",
    ),
    Signature(
        name="jest_failed",
        pattern=r"Tests:\s+.*\d+ failed",
        category=FailureCategory.TEST,
        cause="The test runner reported failing test cases.",
        fix="Read the reported failing test output and correct the "
            "behaviour it asserts.",
    ),
    Signature(
        name="assertion_error",
        pattern=r"AssertionError[:(]",
        category=FailureCategory.TEST,
        cause="A test assertion failed.",
        fix="Compare the expected and actual values in the assertion "
            "message and correct the discrepancy.",
    ),
    # --- runtime --------------------------------------------------------
    Signature(
        name="unhandled_exception",
        pattern=r"UnhandledPromiseRejection|"
                r"Traceback \(most recent call last\):|"
                r"^\s*\w*(?:Error|Exception): ",
        category=FailureCategory.RUNTIME,
        cause="The program raised an unhandled exception at runtime; "
              "the traceback identifies the frame.",
        fix="Handle the exception at the reported location or correct "
            "the underlying value that caused it.",
    ),
)

# Generic phrases. These only ever corroborate a weak case; on their own
# they produce an UNKNOWN cause, never a guessed root cause.
WEAK_SIGNATURES: tuple[Signature, ...] = (
    Signature(
        name="generic_build_failed",
        pattern=r"[Bb]uild failed|Build step failed|npm ERR! build",
        category=FailureCategory.BUILD,
        cause="The build command reported failure.",
        fix="Read the full build output above for the specific error.",
        strong=False,
    ),
    Signature(
        name="generic_test_failed",
        pattern=r"FAIL\b|Tests failed",
        category=FailureCategory.TEST,
        cause="A test run reported failure.",
        fix="Read the full test output above for the specific failure.",
        strong=False,
    ),
    Signature(
        name="generic_permission",
        pattern=r"EACCES|Permission denied|Access is denied",
        category=FailureCategory.ENVIRONMENT,
        cause="The process lacked permission for the requested "
              "filesystem or network operation.",
        fix="Check the permissions of the target path for the user "
            "running the command.",
    ),
)

ALL_SIGNATURES: tuple[Signature, ...] = STRONG_SIGNATURES + WEAK_SIGNATURES


def signature_by_name(name: str) -> Signature | None:
    for signature in ALL_SIGNATURES:
        if signature.name == name:
            return signature
    return None
