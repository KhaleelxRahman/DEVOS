import os

repo = 'c:/Users/DELL/DEVOS v1.0.0'
out_path = os.path.join(repo, 'FULL_FILE_INVENTORY.md')

root_files = []
for entry in sorted(os.listdir(repo)):
    full = os.path.join(repo, entry)
    if os.path.isfile(full):
        root_files.append((entry, os.path.getsize(full)))

header = """# FULL FILE INVENTORY - DEVOS v1.0.0

## Group 1: Root Files

| # | File | Size (bytes) | Type | Purpose / Contents | Git Status / Notes |
|---|------|-------------|------|-------------------|-------------------|"""

lines = [header]
for i, (name, size) in enumerate(root_files, 1):
    lines.append("| {} | `{}` | {} | {} | {} | {} |".format(i, name, size, "-", "-", "-"))

with open(out_path, 'w', encoding='utf-8') as f:
    f.write("\n".join(lines))
    f.write("\n")

print("Wrote Group 1 skeleton: {} files".format(len(root_files)))
for n, s in root_files:
    print("  {} ({})".format(n, s))
