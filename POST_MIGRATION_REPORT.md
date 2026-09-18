## DEVOS Post-Migration Report
Generated: 09/19/2026 01:22:14


---
## Git Status

On branch phase0-foundation-lock-20260901-2310
Your branch is ahead of 'origin/phase0-foundation-lock-20260901-2310' by 2 commits.
  (use "git push" to publish your local commits)

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	new file:   frontend/.gitignore

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	POST_MIGRATION_REPORT.md



---
## Git Cached Summary

 create mode 100644 frontend/.gitignore


---
## Nested Git Check

PASS - No nested .git folders found.

---
## Frontend npm install


up to date, audited 102 packages in 12s

27 packages are looking for funding
  run `npm fund` for details

2 vulnerabilities (1 low, 1 moderate)

To address all issues, run:
  npm audit fix

Run `npm audit` for details.


---
## Frontend Build


> devos-frontend@1.0.0 build
> node scripts/generate-sitemap.mjs && tsc && vite build

[36mvite v8.2.2 [32mbuilding client environment for production...[36m[39m
transforming...
G£ô 1738 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                             3.05 kB Göé gzip:  0.99 kB
dist/assets/index-Cjt2JZrc.css             52.28 kB Göé gzip:  9.46 kB
dist/assets/rolldown-runtime-hePW80VL.js    0.71 kB Göé gzip:  0.42 kB
dist/assets/icons-DkOb0LnX.js              24.64 kB Göé gzip:  8.87 kB
dist/assets/index-Cta7k9xP.js             177.78 kB Göé gzip: 45.82 kB
dist/assets/vendor-BRsXNvzh.js            188.12 kB Göé gzip: 62.11 kB

[32mG£ô built in 676ms[39m


---
## Frontend Lint


> devos-frontend@1.0.0 lint
> tsc --noEmit



---
## Backend Compile

Listing 'app'...
Listing 'app\\api'...
Listing 'app\\api\\v1'...
Listing 'app\\core'...
Listing 'app\\db'...
Listing 'app\\integrations'...
Listing 'app\\integrations\\github'...
Listing 'app\\models'...
Listing 'app\\prompts'...
Listing 'app\\schemas'...
Listing 'app\\services'...
Listing 'app\\services\\ai'...
Listing 'app\\services\\context'...


---
## Backend Tests


============================== warnings summary ===============================
..\.venv\Lib\site-packages\_pytest\config\__init__.py:1624
  c:\Users\DELL\DEVOS v1.0.0\.venv\Lib\site-packages\_pytest\config\__init__.py:1624: PytestConfigWarning: No files were found in testpaths; consider removing or adjusting your testpaths configuration. Searching recursively from the current directory instead.
    self.args, self.args_source = self._decide_args(

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
1 warning in 0.23s

