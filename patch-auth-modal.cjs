const fs = require('fs');
let code = fs.readFileSync('src/components/auth/AuthModal.tsx', 'utf8');

const divider = `
          {/* GitHub Auth Section */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--space-4) 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                <div style={{ padding: '0 12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>OR</div>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GitHubConnectButton fullWidth />
              </div>
            </>
          )}
`;

code = code.replace(
  "{/* Submit Button */}",
  divider + "\n          {/* Submit Button */}"
);

// Add import
if (!code.includes('GitHubConnectButton')) {
  code = code.replace(
    "import { Button, Input, Modal, Badge } from '../common';",
    "import { Button, Input, Modal, Badge } from '../common';\nimport { GitHubConnectButton } from './GitHubConnectButton';"
  );
}

fs.writeFileSync('src/components/auth/AuthModal.tsx', code);
