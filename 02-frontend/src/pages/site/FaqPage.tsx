import React from 'react';
import { useSeo } from '../../hooks/useSeo';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is DEVOS v1.0.0?',
    a: 'DEVOS v1.0.0 is a project-aware AI developer workspace. Each project gets an isolated workspace with a file explorer, code viewer, sandboxed terminal, Git integration, GitHub connection, a testing center, and an AI assistant that uses your project context.',
  },
  {
    q: 'Can I create and upload files?',
    a: 'Yes. Inside a project workspace, the Files panel offers New File, New Folder, and Upload Files. Upload uses your browser file picker: selected files are copied into the active project (up to 10MB per file, 20 files per batch). Executable formats (.exe, .bat, .ps1 and similar) are blocked. Folder uploads are not supported — import a Git repository instead for whole trees.',
  },
  {
    q: 'Does DEVOS v1.0.0 support GitHub?',
    a: 'Yes. If the server is configured with GitHub OAuth credentials, Settings shows a Connect GitHub flow and you can import repository data. If OAuth is not configured, the GitHub integration honestly reports "Not connected" and no fabricated repositories are shown.',
  },
  {
    q: 'Which AI providers are supported?',
    a: 'Google Gemini and OpenAI. The provider is selected server-side via AI_PROVIDER with the matching API key. The current provider is displayed in the AI panel header.',
  },
  {
    q: 'What happens when no AI API key is configured?',
    a: 'DEVOS v1.0.0 falls back to a clearly labelled Local/Mock mode. Responses are deterministic development placeholders and are visibly marked as mock in both the API and the UI — they are never presented as real model output.',
  },
  {
    q: 'What can I run in the terminal?',
    a: 'An allowlist of development commands — git, npm, node, python, pip, pytest, cargo, ls, cat, echo, pwd, tree — executed without a shell, inside your project workspace only, with a timeout and output cap. Anything else is rejected with a clear error.',
  },
  {
    q: 'Is my code private?',
    a: 'Projects, files, conversations, activity, and terminal history are owned by your account. Every project-scoped API endpoint enforces authentication and ownership; requests from other accounts are denied. Sensitive files (.env, private keys) are never served by the file API or included in AI context.',
  },
  {
    q: 'Does DEVOS v1.0.0 use cookies?',
    a: 'No. Authentication uses a bearer token stored in your browser local storage, so DEVOS v1.0.0 sets no cookies and requires no consent banner by default. A consent control only appears if an administrator configures the optional analytics endpoint.',
  },
];

export const FaqPage: React.FC = () => {
  useSeo({
    title: 'FAQ',
    description: 'Answers about DEVOS v1.0.0: files and upload, GitHub connection, AI providers and mock mode, terminal allowlist, privacy, and cookies.',
    canonicalPath: '/faq',
  });

  return (
    <div className="site-narrow">
      <h1>Frequently asked questions</h1>
      <div>
        {FAQS.map((item) => (
          <div className="faq-item" key={item.q}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
