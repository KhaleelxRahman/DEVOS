const fs = require('fs');
let code = fs.readFileSync('src/components/auth/UserProfileModal.tsx', 'utf8');

const githubSection = `
          {/* GitHub Connection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              GitHub Integration
            </label>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
              Connect your GitHub account to enable native Git workflows and repository access.
            </div>
            <GitHubConnectButton />
          </div>
`;

// we need to replace the block that starts with "<label...GitHub Username</label>"
const regex = /<label[^>]*>[\s\S]*?GitHub Username[\s\S]*?<\/label>[\s\S]*?<div style={{ position: 'relative' }}>[\s\S]*?<input[\s\S]*?onChange=\{\(e\) => setGithubUsername\(e\.target\.value\)\}[\s\S]*?\/>[\s\S]*?<\/div>/;
code = code.replace(regex, githubSection);

if (!code.includes('GitHubConnectButton')) {
  code = code.replace(
    "import { Button } from '../common/Button';",
    "import { Button } from '../common/Button';\nimport { GitHubConnectButton } from './GitHubConnectButton';"
  );
}

fs.writeFileSync('src/components/auth/UserProfileModal.tsx', code);
