# FAQ

**Does DEVOS require an external AI provider?** No. It runs in clearly labelled
Local/Mock mode when no provider is configured.

**Can DEVOS browse my whole computer?** No. File access is limited to the
project workspace.

**Where are GitHub tokens stored?** Server-side only; they are not returned to
the browser.

**Can I deploy with SQLite?** SQLite is suitable for local development.
Production deployments should use the configured PostgreSQL option.
