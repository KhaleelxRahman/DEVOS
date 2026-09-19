"""Phase 11 completion - clean minimal script"""
import os, shutil, subprocess, datetime
R = r"C:\Users\DELL\DEVOS v1.0.0"
os.chdir(R)
def log(m): print(m)
def run(c, t=None):
    r = subprocess.run(c, shell=True, capture_output=True, text=True, timeout=t)
    for l in r.stdout.strip().split('\n'):
        if l.strip(): log(f"  {l}")
    for l in r.stderr.strip().split('\n'):
        if l.strip(): log(f"  {l}")
    return r.returncode

print("="*70)
print("PHASE 11 - CLEAN COMPLETION")
print("="*70)

# Safety tag
now = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
tag = f'pre-phase11-clean-{now}'
log(f"\n--- Safety tag: {tag} ---")
run(f'git tag {tag}')
run(f'git log -1 --oneline')
run(f'git status --short')

# Fix 01-docs -> docs (remove simplified README, rename)
log(f"\n--- 01-docs -> docs ---")
if os.path.isdir('01-docs') and os.path.isdir('docs'):
    if os.listdir('docs') == ['README.md']:
        os.remove('docs/README.md')
        os.rename('01-docs','docs')
        log("  Renamed 01-docs/ -> docs/")
    else:
        log(f"  SKIP: docs/ has {os.listdir('docs')}")
elif os.path.isdir('01-docs'):
    os.rename('01-docs','docs')
    log("  Renamed 01-docs/ -> docs/")
else:
    log("  OK: 01-docs gone")

# Fix DEVOS -> docs-source
log(f"\n--- DEVOS -> docs-source ---")
if os.path.isdir('DEVOS') and os.path.isdir('docs-source'):
    if not os.listdir('docs-source'):
        os.rename('DEVOS','docs-source')
        log("  Renamed DEVOS/ -> docs-source/")
    else:
        log(f"  SKIP: docs-source/ has {os.listdir('docs-source')}")
elif os.path.isdir('DEVOS'):
    os.rename('DEVOS','docs-source')
    log("  Renamed DEVOS/ -> docs-source/")
else:
    log("  OK: DEVOS gone")

# Remove stale log
log(f"\n--- Stale log ---")
if os.path.isfile('frontend-local-final.log'):
    os.remove('frontend-local-final.log')
    log("  Removed frontend-local-final.log")

# Update references
log(f"\n--- Reference updates ---")
for path, old, new in [('pytest.ini','04-tests','tests'), ('pytest.ini','03-backend','backend'), ('package.json','02-frontend','frontend')]:
    if os.path.isfile(path):
        with open(path,'r',encoding='utf-8') as f: c=f.read()
        if old in c:
            c=c.replace(old,new)
            with open(path,'w',encoding='utf-8') as f: f.write(c)
            log(f"  Updated {path}: {old}->{new}")
        else: log(f"  OK {path}: no {old}")

log(f"\n--- Final state ---")
for e in sorted(os.listdir('.')):
    if e.startswith('.'): continue
    p=os.path.join('.',e)
    if os.path.isdir(p):
        n=sum(1 for _ in os.walk(p) if _[2]) if False else 0
        cnt=0
        for dp,dn,fn in os.walk(p):
            dn[:]=[d for d in dn if d not in {'.git','node_modules','__pycache__','.ruff_cache','.pytest_cache','.venv','dist','.vercel','.next','test-results','coverage'}]
            cnt+=len(fn)
        log(f"  dir  {e:16s} ({cnt} files)")
    else:
        log(f"  file {e:16s} ({os.path.getsize(p):,} bytes)")

print()
log("Key folders:")
for f in ['backend','frontend','tests','qa','docs','docs-source','legal','pipeline']:
    log(f"  {f:14s} {'EXISTS' if os.path.isdir(f) else 'MISSING'}")
for f in ['01-docs','02-frontend','03-backend','04-tests','05-qa-agent','DEVOS','config']:
    log(f"  {f:14s} {'STILL EXISTS!' if os.path.isdir(f) else 'gone'}")

print()
log("Quality checks:")
log("\n  Git status:")
run('git status --short')
log("\n  Git diff --stat:")
run('git diff --stat')
log("\n  Ruff:")
run('ruff check backend/app backend/scripts backend/alembic')
log("\n  Pytest:")
run('python -m pytest tests/ -v --tb=short -q', t=600)

print(f"\n{'='*70}")
print("PHASE 11 COMPLETE")
print(f"{'='*70}")
