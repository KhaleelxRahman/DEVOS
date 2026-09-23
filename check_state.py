import os
os.chdir(r'C:\Users\DELL\DEVOS v1.0.0')
print('=== docs/ tree ===')
for dp, dn, fn in os.walk('docs'):
    dn[:] = [d for d in dn if d not in {'.git','node_modules','__pycache__','.ruff_cache','.pytest_cache','.venv','dist','.vercel','.next','test-results','coverage'}]
    for d in dn:
        rel = os.path.relpath(os.path.join(dp,d), 'docs')
        print(f'dir  docs/{rel}')
    for f in fn:
        rel = os.path.relpath(os.path.join(dp,f), 'docs')
        sz = os.path.getsize(os.path.join(dp,f))
        print(f'file docs/{rel} ({sz} bytes)')
print()
print('=== 01-docs/ tree ===')
if os.path.isdir('01-docs'):
    for dp, dn, fn in os.walk('01-docs'):
        dn[:] = [d for d in dn if d not in {'.git','node_modules','__pycache__','.ruff_cache','.pytest_cache','.venv','dist','.vercel','.next','test-results','coverage'}]
        for d in dn:
            rel = os.path.relpath(os.path.join(dp,d), '01-docs')
            print(f'dir  01-docs/{rel}')
        for f in fn:
            rel = os.path.relpath(os.path.join(dp,f), '01-docs')
            sz = os.path.getsize(os.path.join(dp,f))
            print(f'file 01-docs/{rel} ({sz} bytes)')
else:
    print('  GONE')
print()
print('=== DEVOS/ tree ===')
if os.path.isdir('DEVOS'):
    for dp, dn, fn in os.walk('DEVOS'):
        dn[:] = [d for d in dn if d not in {'.git','node_modules','__pycache__','.ruff_cache','.pytest_cache','.venv','dist','.vercel','.next','test-results','coverage'}]
        for d in dn:
            rel = os.path.relpath(os.path.join(dp,d), 'DEVOS')
            print(f'dir  DEVOS/{rel}')
        for f in fn:
            rel = os.path.relpath(os.path.join(dp,f), 'DEVOS')
            sz = os.path.getsize(os.path.join(dp,f))
            print(f'file DEVOS/{rel} ({sz} bytes)')
else:
    print('  GONE')
print()
print('=== frontend-local-final.log ===')
print('  EXISTS' if os.path.isfile('frontend-local-final.log') else '  GONE')
print()
import subprocess
r = subprocess.run('git status --short', shell=True, capture_output=True, text=True)
print('=== git status --short ===')
print(r.stdout if r.stdout.strip() else '[OK] clean')
print()
r = subprocess.run('git log -1 --oneline', shell=True, capture_output=True, text=True)
print('=== git log -1 --oneline ===')
print(r.stdout.strip())
print()
r = subprocess.run('git tag -l "pre-phase11*"', shell=True, capture_output=True, text=True)
print('=== backup tags ===')
print(r.stdout.strip())
