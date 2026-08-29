# DEVOS Ponytail Rules v1.0

Mission: Build production-ready software with the least necessary code.

## Golden Rule
Before writing new code:
1. Reuse existing project code.
2. Use the standard library.
3. Use framework-native features.
4. Use existing dependencies.
5. Write minimal new code only if required.

Never create duplicate utilities.

## Development Loop
Inspect ? Understand ? Plan ? Implement ? Build ? Test ? Verify

## Repository Inspection
Always run first:
- git status
- git branch --show-current
- git log -1 --oneline
- git diff --check

## Code Rules
- Keep functions small.
- Avoid duplicate helpers.
- Preserve existing architecture.
- Never refactor without evidence.

## Security
Never expose:
- API keys
- Tokens
- Secrets

Never:
- force push
- rewrite history
- weaken authentication

## Verification
Frontend:
npm run build

Backend:
python -m pytest

Never claim success without evidence.
