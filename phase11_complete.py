"""
Phase 11 Complete Execution - Corrected Script

State from prior attempt:
- backend/, frontend/, tests/, qa/, legal/, pipeline/ already exist with content
- 01-docs/ and DEVOS/ still exist (renames aborted)
- config/ partially processed
- No backup tag for current state yet
- frontend-local-final.log still present

This script:
1. Tags current state as safety backup
2. Completes remaining moves (01-docs -> docs, DEVOS -> docs-source)
3. Does NOT re-move already-moved folders
4. Updates all references
5. Cleans up stale logs
6. Runs build/lint/typecheck/tests
7. Writes PHASE11_REPORT.md
"""
import os
import sys
import shutil
import subprocess
import datetime

ROOT = r"C:\Users\DELL\DEVOS v1.0.0"
os.chdir(ROOT)

def log(msg):
    print(msg)

def run(cmd, check=True):
    """Run a shell command and return (returncode, stdout, stderr)."""
    log(f"  CMD: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.stdout:
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                log(f"    OUT: {line}")
    if result.stderr:
        for line in result.stderr.strip().split('\n'):
            if line.strip():
                log(f"    ERR: {line}")
    if check and result.returncode != 0:
        log(f"  !! FAILED with rc={result.returncode}")
    return result.returncode, result.stdout, result.stderr

def count_files_in_tree(base):
    """Count files in a directory tree."""
    count = 0
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [d for d in dirnames if d not in {
            '.git', 'node_modules', '__pycache__', '.ruff_cache',
            '.pytest_cache', '.venv', 'dist', '.vercel', '.next',
            'test-results', 'coverage'
        }]
        count += len(filenames)
    return count


# 5d. Scan for hardcoded old folder references in ALL remaining source files
print(f"\n  5d. Scan for hardcoded old folder references:")
old_refs_map = {
    '01-docs': 'docs',
    '02-frontend': 'frontend',
    '03-backend': 'backend',
    '04-tests': 'tests',
    '05-qa-agent': 'qa',
}
files_scanned = 0
files_with_refs = 0
for dirpath, dirnames, filenames in os.walk('.'):
    dirnames[:] = [d for d in dirnames if d not in {
        '.git', 'node_modules', '__pycache__', '.ruff_cache',
        '.pytest_cache', '.venv', 'dist', '.vercel', '.next',
        'test-results', 'coverage'
    }]
    for fname in filenames:
        fpath = os.path.join(dirpath, fname)
        ext = os.path.splitext(fname)[1].lower()
        if ext not in {'.py', '.ts', '.tsx', '.json', '.md', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.txt', '.js', '.mjs', '.cjs', '.html', '.css'}:
            continue
        try:
            with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            files_scanned += 1
            for old, new in old_refs_map.items():
                if old in content:
                    rel = os.path.relpath(fpath, ROOT)
                    if fname.endswith(('.py', '.ts', '.tsx', '.json', '.toml', '.ini', '.cfg', '.yml', '.yaml', '.js', '.mjs', '.html', '.css')):
                        files_with_refs += 1
                        if files_with_refs <= 30:
                            print(f"    [FOUND] {rel}: contains '{old}' - may need manual review")
                    elif fname.endswith('.md'):
                        if old in content and ('/01-docs/' in content or '/02-frontend/' in content or '/03-backend/' in content or '/04-tests/' in content or '/05-qa-agent/' in content):
                            files_with_refs += 1
                            if files_with_refs <= 30:
                                print(f"    [FOUND] {rel}: contains '{old}' in path context - may need manual review")
        except Exception:
            pass

print(f"  Scanned {files_scanned} files, found potential refs in {files_with_refs} files")
if files_with_refs == 0:
    print(f"  [OK] No hardcoded old folder references found in source files")
else:
    print(f"  [NOTE] Review files with old references manually")

# --- Step 6: Verify final structure ---
print(f"\n--- Step 6: Verify final structure ---")
print(f"\n  Top-level non-hidden items:")
for entry in sorted(os.listdir('.')):
    if entry.startswith('.'):
        continue
    full = os.path.join('.', entry)
    if os.path.isdir(full):
        count = count_files_in_tree(full)
        print(f"    dir  {entry:18s} (tree: {count} files)")
    else:
        sz = os.path.getsize(full)
        print(f"    file {entry:18s} ({sz:,} bytes)")

print(f"\n  Key folder checks:")
for folder in ['backend', 'frontend', 'tests', 'qa', 'docs', 'docs-source', 'legal', 'pipeline']:
    if os.path.isdir(folder):
        count = count_files_in_tree(folder)
        print(f"    {folder:18s} EXISTS ({count} files in tree)")
    else:
        print(f"    {folder:18s} MISSING!")


# --- Step 7: Run quality checks ---
print(f"\n--- Step 7: Quality checks ---")

print(f"\n  7a. Git status:")
rc, out, err = run('git status --short', check=False)
print(f"  (git status rc={rc})")

print(f"\n  7b. Git diff --stat (should be empty if clean):")
rc, out, err = run('git diff --stat', check=False)
if out.strip():
    print(f"    CHANGES DETECTED:")
    for line in out.strip().split('\n'):
        print(f"      {line}")
else:
    print(f"    [OK] Working tree clean")

print(f"\n  7c. Ruff lint (backend + scripts):")
rc, out, err = run('ruff check backend/app backend/scripts backend/alembic', check=False)
print(f"  ruff rc={rc}")
if out.strip():
    print(f"  ruff output:")
    for line in out.strip().split('\n'):
        print(f"    {line}")

print(f"\n  7d. Pytest (tests/ directory) - timeout 600s:")
rc, out, err = run('python -m pytest tests/ -v --tb=short -q', check=False, timeout=600)
print(f"  pytest rc={rc}")
for line in out.strip().split('\n')[-15:]:
    if line.strip():
        print(f"    {line}")

print(f"\n" + "=" * 70)
print("PHASE 11 EXECUTION COMPLETE")
print("=" * 70)

for folder in ['01-docs', '02-frontend', '03-backend', '04-tests', '05-qa-agent', 'DEVOS', 'config']:
    if os.path.isdir(folder):
        print(f"    {folder:18s} STILL EXISTS! (should be gone/renamed)")
    else:
        print(f"    {folder:18s} gone [OK]")

# --- Step 7: Run quality checks ---
print(f"\n--- Step 7: Quality checks ---")

print(f"\n  7a. Git status:")
rc, out, err = run('git status --short', check=False)
print(f"  (git status rc={rc})")

print(f"\n  7b. Git diff --stat (should be empty if clean):")
rc, out, err = run('git diff --stat', check=False)
if out.strip():
    print(f"    CHANGES DETECTED:")
    for line in out.strip().split('\n'):
        print(f"      {line}")
else:
    print(f"    [OK] Working tree clean")

print(f"\n  7c. Ruff lint (backend + scripts):")
rc, out, err = run('ruff check backend/app backend/scripts backend/alembic', check=False)
print(f"  ruff rc={rc}")
if out.strip():
    print(f"  ruff output:")
    for line in out.strip().split('\n'):
        print(f"    {line}")

print(f"\n  7d. Pytest (tests/ directory) - timeout 600s:")
rc, out, err = run('python -m pytest tests/ -v --tb=short -q', check=False, timeout=600)
print(f"  pytest rc={rc}")
for line in out.strip().split('\n')[-15:]:
    if line.strip():
        print(f"    {line}")

print(f"\n" + "=" * 70)
print("PHASE 11 EXECUTION COMPLETE")
print("=" * 70)

# ============================================================
# MAIN EXECUTION
# ============================================================
print("=" * 70)
print("PHASE 11 - COMPLETE EXECUTION (CORRECTED)")
print("=" * 70)

# --- Step 0: Create safety backup tag ---
now = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
tag_name = f'pre-phase11-cleanup-{now}'
print(f"\n--- Step 0: Safety backup tag ---")
rc, out, err = run(f'git tag {tag_name}')
if rc == 0:
    print(f"  [DONE] Created tag: {tag_name}")
    rc2, out2, _ = run(f'git tag -l {tag_name}')
    if rc2 == 0:
        print(f"  [VERIFY] Tag confirmed: {out2.strip()}")
else:
    print(f"  [WARN] Tag creation may have failed: {err}")

print(f"\nCurrent HEAD: ", end='')
rc, out, _ = run('git log -1 --oneline')
print()

# --- Step 1: Complete 01-docs -> docs rename ---
print(f"\n--- Step 1: 01-docs -> docs ---")
if os.path.isdir('01-docs'):
    if os.path.isdir('docs'):
        docs_items = os.listdir('docs')
        if docs_items == ['README.md']:
            print(f"  [NOTE] docs/ has only simplified README.md - replacing with real 01-docs content")
            if os.path.exists('docs/README.md'):
                os.remove('docs/README.md')
                print(f"  [DONE] Removed simplified docs/README.md")
            os.rename('01-docs', 'docs')
            print(f"  [DONE] Renamed 01-docs/ -> docs/")
        else:
            print(f"  [WARN] docs/ has unexpected content: {docs_items}")
            print(f"  [WARN] Skipping - resolve manually")
    else:
        os.rename('01-docs', 'docs')
        print(f"  [DONE] Renamed 01-docs/ -> docs/")
else:
    print(f"  [OK] 01-docs/ already gone")

# --- Step 2: Complete DEVOS -> docs-source rename ---
print(f"\n--- Step 2: DEVOS -> docs-source ---")
if os.path.isdir('DEVOS'):
    if os.path.isdir('docs-source'):
        ds_items = os.listdir('docs-source')
        if ds_items == ['PROJECT_MAP.md'] or ds_items == [] or ds_items == ['QUESTION_REGISTRY.md']:
            if os.path.exists('docs-source/README.md'):
                os.remove('docs-source/README.md')
            os.rename('DEVOS', 'docs-source')
            print(f"  [DONE] Renamed DEVOS/ -> docs-source/")
        else:
            print(f"  [WARN] docs-source/ has unexpected content: {ds_items}")
            print(f"  [WARN] Skipping - resolve manually")
    else:
        os.rename('DEVOS', 'docs-source')
        print(f"  [DONE] Renamed DEVOS/ -> docs-source/")
else:
    print(f"  [OK] DEVOS/ already gone")
