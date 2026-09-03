const fs = require('fs');
let code = fs.readFileSync('src/components/onboarding/OnboardingModal.tsx', 'utf8');

const lines = code.split('\n');
const startIdx = lines.findIndex(l => l.includes('{/* Step 3: Connect GitHub */}'));
const endIdx = lines.findIndex(l => l.includes('{/* Step 4: Ready to Start */}'));

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `
        {/* Step 3: Connect GitHub */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: '10px 0' }}>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--color-text-primary)' }}>
                Connect your GitHub Account (Optional)
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                Sync private repositories, create automated pull requests, and trigger CI/CD pipelines.
              </p>
            </div>
            
            <div style={{ padding: '16px', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <GitHubConnectButton fullWidth />
            </div>
          </div>
        )}
`;

  const newLines = [
    ...lines.slice(0, startIdx),
    replacement,
    ...lines.slice(endIdx)
  ];
  
  let newCode = newLines.join('\n');
  if (!newCode.includes('GitHubConnectButton')) {
    newCode = newCode.replace(
      "import { Button } from '../common';",
      "import { Button } from '../common';\nimport { GitHubConnectButton } from '../auth/GitHubConnectButton';"
    );
  }
  fs.writeFileSync('src/components/onboarding/OnboardingModal.tsx', newCode);
  console.log("Success");
}
