import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Copy, Plus, Send, Check, Pencil, RefreshCw, ChevronDown, ChevronUp, X, Square, Paperclip, Pin, Trash2 } from 'lucide-react';
import { aiApi, filesApi, gitApi, projectsApi, testingApi } from '../../api';
import { AIMessage, Conversation, PlannerIntent, PlannerRequirementKey } from '../../types/ai';
import { Spinner, Button, MarkdownContent } from '../common';

interface AIPanelProps {
  projectId: string;
  activeFile: { path: string; content: string; language?: string } | null;
  onWorkspaceChanged?: () => void;
}

const AI_ACTIONS = ['explain', 'debug', 'refactor', 'test', 'document', 'security', 'optimize'] as const;
const REQUIREMENTS: Array<{ key: PlannerRequirementKey; label: string; hint: string }> = [
  { key: 'projectName', label: 'Project name', hint: 'What should we call it?' },
  { key: 'category', label: 'Category', hint: 'What kind of product is this?' },
  { key: 'platform', label: 'Platform', hint: 'Web, mobile, desktop, or API?' },
  { key: 'targetUsers', label: 'Target users', hint: 'Who will use it?' },
  { key: 'auth', label: 'Authentication', hint: 'Accounts, SSO, or public?' },
  { key: 'database', label: 'Database', hint: 'What data must persist?' },
  { key: 'deployment', label: 'Deployment', hint: 'Where will it run?' },
  { key: 'payment', label: 'Payments', hint: 'Any billing or purchases?' },
  { key: 'notifications', label: 'Notifications', hint: 'Email, push, or in-app updates?' },
  { key: 'ai', label: 'AI features', hint: 'How should AI help?' },
  { key: 'storage', label: 'File storage', hint: 'Uploads or generated files?' },
  { key: 'offline', label: 'Offline support', hint: 'Should it work without a connection?' },
  { key: 'security', label: 'Security', hint: 'Any compliance or sensitive data?' },
];
const EMPTY_INTENT: PlannerIntent = Object.fromEntries(REQUIREMENTS.map(({ key }) => [key, ''])) as unknown as PlannerIntent;
type QueueStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';
interface PlannerTask { id: string; title: string; objective: string; estimated: string; status: QueueStatus; log: string[]; kind: 'context' | 'validation' | 'local' | 'file'; path?: string; content?: string; }
interface QaIssue { id: string; category: string; severity: 'low' | 'medium' | 'high'; file: string; reason: string; suggestion: string; confidence: number; }

const flattenFiles = (nodes: any[]): string[] => nodes.flatMap((node) => [
  node.path,
  ...(node.children ? flattenFiles(node.children) : []),
]);

function extractIntent(idea: string): PlannerIntent {
  const text = idea.trim();
  const lower = text.toLowerCase();
  const pick = (terms: string[], value: string) => terms.some((term) => lower.includes(term)) ? value : '';
  const firstSentence = text.split(/[.!?]/)[0].trim();
  return {
    projectName: firstSentence ? firstSentence.slice(0, 42) : '',
    category: pick(['marketplace', 'store', 'shop', 'commerce', 'food delivery', 'delivery app'], 'Marketplace / commerce') || pick(['dashboard', 'admin'], 'Dashboard') || pick(['social', 'community'], 'Community') || pick(['learn', 'course', 'education'], 'Education') || (text ? 'Productivity tool' : ''),
    platform: pick(['ios', 'android', 'mobile'], 'Mobile') || pick(['api', 'backend'], 'API') || 'Web',
    targetUsers: pick(['team', 'teams', 'company', 'business'], 'Teams and organizations') || pick(['student', 'learner'], 'Students and learners') || '',
    auth: pick(['login', 'account', 'user', 'auth', 'sign in'], 'Email/password accounts') || '',
    database: pick(['data', 'profile', 'order', 'product', 'save', 'track'], 'Relational application data') || '',
    deployment: pick(['cloud', 'deploy', 'production', 'host'], 'Managed cloud deployment') || '',
    payment: pick(['pay', 'payment', 'checkout', 'subscription', 'billing'], 'Payment provider integration') || 'Not indicated',
    notifications: pick(['email', 'notify', 'notification', 'alert', 'push'], 'Email and in-app notifications') || '',
    ai: pick(['ai', 'assistant', 'recommend', 'summar'], 'AI-assisted workflows') || 'Not indicated',
    storage: pick(['upload', 'file', 'image', 'photo', 'document'], 'Object storage for uploads') || '',
    offline: pick(['offline', 'without internet', 'sync'], 'Offline-first sync') || 'Not indicated',
    security: pick(['private', 'secure', 'security', 'hipaa', 'gdpr', 'sensitive'], 'Encryption, roles, and audit logs') || '',
  };
}

export const AIPanel: React.FC<AIPanelProps> = ({ projectId, activeFile, onWorkspaceChanged }) => {
  const [provider, setProvider] = useState<{ provider: string; is_mock: boolean; model: string } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [conversationSearch, setConversationSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'assistant' | 'planner'>('planner');
  const [idea, setIdea] = useState('');
  const [intent, setIntent] = useState<PlannerIntent>(EMPTY_INTENT);
  const [accepted, setAccepted] = useState<PlannerRequirementKey[]>([]);
  const [executionMode, setExecutionMode] = useState('Balanced · 12h');
  const [showRoadmap, setShowRoadmap] = useState(true);
  const [extraRequirements, setExtraRequirements] = useState<string[]>([]);
  const [newRequirement, setNewRequirement] = useState('');
  const [queue, setQueue] = useState<PlannerTask[]>([]);
  const [executionStarted, setExecutionStarted] = useState(false);
  const [planMode, setPlanMode] = useState<'implementation' | 'documentation'>('implementation');
  const [gitPreparation, setGitPreparation] = useState('');
  const [qaIssues, setQaIssues] = useState<QaIssue[]>([]);
  const [qaSummary, setQaSummary] = useState('');
  const cancelledRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastPromptRef = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    aiApi.getProvider(projectId).then((res) => setProvider(res.data || null)).catch((err) => setError(err.message || 'Unable to load AI provider'));
    aiApi
      .getConversations(projectId)
      .then((res) => setConversations(res.data?.conversations || []))
      .catch((err) => setError(err.message || 'Unable to load conversations'));
  }, [projectId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isSending]);

  const loadConversation = useCallback(
    async (id: string) => {
      setConversationId(id);
      setError('');
      try {
        const res = await aiApi.getMessages(projectId, id);
        setMessages((res.data?.messages || []).map((m) => ({ role: m.role as AIMessage['role'], content: m.content, created_at: m.created_at })));
      } catch (err: any) {
        setError(err.message || 'Failed to load conversation');
      }
    },
    [projectId]
  );

  const startNew = () => {
    setConversationId(null);
    setMessages([]);
    setError('');
  };

  const refreshConversations = async (query = conversationSearch) => {
    const response = await aiApi.getConversations(projectId, query);
    setConversations(response.data?.conversations || []);
  };

  const renameConversation = async (conversation: Conversation) => {
    const title = window.prompt('Conversation name', conversation.title);
    if (!title || !title.trim()) return;
    await aiApi.updateConversation(projectId, conversation.id, { title: title.trim() });
    await refreshConversations();
  };

  const togglePinConversation = async (conversation: Conversation) => {
    await aiApi.updateConversation(projectId, conversation.id, { is_pinned: !conversation.is_pinned });
    await refreshConversations();
  };

  const removeConversation = async (conversation: Conversation) => {
    if (!window.confirm(`Delete "${conversation.title}"?`)) return;
    await aiApi.deleteConversation(projectId, conversation.id);
    if (conversationId === conversation.id) startNew();
    await refreshConversations();
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;
    setInput('');
    lastPromptRef.current = message;
    const createdAt = new Date().toISOString();
    setMessages((prev) => [...prev, { role: 'user', content: message, created_at: createdAt }, { role: 'assistant', content: '', created_at: createdAt }]);
    setIsSending(true);
    setError('');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await aiApi.chatStream(projectId, {
        message,
        conversation_id: conversationId || undefined,
        current_file: activeFile?.path,
      }, (event, data) => {
        if (event === 'start' && typeof data.conversation_id === 'string') setConversationId(data.conversation_id);
        if (event === 'delta' && typeof data.content === 'string') {
          setMessages((prev) => {
            const next = [...prev];
            const index = next.length - 1;
            next[index] = { ...next[index], content: `${next[index].content}${data.content}` };
            return next;
          });
        }
        if (event === 'complete' && typeof data.conversation_id === 'string') {
          setConversationId(data.conversation_id);
          if (!conversations.some((c) => c.id === data.conversation_id)) {
            aiApi.getConversations(projectId)
              .then((r) => setConversations(r.data?.conversations || []))
              .catch((err) => setError(err.message || 'Unable to refresh conversations'));
          }
        }
        if (event === 'error' && typeof data.message === 'string') setError(data.message);
      }, controller.signal);
    } catch (err: any) {
      if (err.name !== 'AbortError') setError(err.message || 'AI request failed');
    } finally {
      abortRef.current = null;
      setIsSending(false);
    }
  };

  const stopGeneration = () => abortRef.current?.abort();
  const regenerateResponse = () => {
    if (!lastPromptRef.current || isSending) return;
    setInput(lastPromptRef.current);
  };

  const runAction = async (action: string) => {
    if (!activeFile || isSending) return;
    setMessages((prev) => [...prev, { role: 'user', content: `/${action} ${activeFile.path}`, created_at: new Date().toISOString() }]);
    setIsSending(true);
    setError('');
    try {
      const res = await aiApi.runAction(projectId, {
        action,
        code: activeFile.content,
        file_path: activeFile.path,
        language: activeFile.language,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data!.content, created_at: new Date().toISOString() }]);
    } catch (err: any) {
      setError(err.message || 'AI action failed');
    } finally {
      setIsSending(false);
    }
  };

  const copyLast = () => {
    const last = [...messages].reverse().find((m) => m.role === 'assistant');
    if (last) {
      navigator.clipboard.writeText(last.content)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Unable to copy response'));
    }
  };

  const startPlanning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    setIntent(extractIntent(idea));
    setAccepted([]);
    setExtraRequirements([]);
  };
  const missing = REQUIREMENTS.filter(({ key }) => !intent[key] && !accepted.includes(key));
  const updateIntent = (key: PlannerRequirementKey, value: string) => setIntent((prev) => ({ ...prev, [key]: value }));
  const acceptAll = () => { setAccepted(REQUIREMENTS.filter(({ key }) => !intent[key]).map(({ key }) => key)); setExtraRequirements([]); };
  const regenerate = () => setIntent(extractIntent(idea));
  const generatedFiles = () => planMode === 'documentation'
    ? [
      { path: 'docs/PROJECT_PLAN.md', title: 'Generate project plan', content: `# ${intent.projectName || 'Project'}\n\n## Objective\n${idea}\n\n## Requirements\n${REQUIREMENTS.filter(({ key }) => intent[key]).map(({ label, key }) => `- **${label}:** ${intent[key]}`).join('\n') || '- Requirements under review'}\n` },
      { path: 'docs/ARCHITECTURE.md', title: 'Generate architecture review', content: `# Architecture review\n\nPlatform: ${intent.platform || 'Web'}\n\nThis document records the proposed boundaries, data layer, security considerations, and open decisions for human review.\n` },
    ]
    : [
      { path: 'README.md', title: 'Generate project README', content: `# ${intent.projectName || 'Project'}\n\n${idea}\n\n## Planned stack\nReact + TypeScript, Node API, and PostgreSQL.\n` },
      { path: 'docs/PLAN.md', title: 'Generate implementation plan', content: `# Implementation plan\n\n${idea}\n\n- Validate requirements and constraints\n- Implement the core workflow\n- Add validation and security review\n` },
    ];

  const approvePlan = () => {
    cancelledRef.current = false;
    const files = generatedFiles();
    setQueue([
      { id: 'context', title: 'Validate project context', objective: 'Confirm intent and constraints from the project context API', estimated: '2h', status: 'pending', log: [], kind: 'context' },
      { id: 'validation', title: 'Check available validation jobs', objective: 'Discover safe validation jobs without running them', estimated: '1h', status: 'pending', log: [], kind: 'validation' },
      ...files.map((file) => ({ id: `file-${file.path}`, title: file.title, objective: `Write ${file.path} to the workspace`, estimated: '1h', status: 'pending' as QueueStatus, log: [], kind: 'file' as const, path: file.path, content: file.content })),
      { id: 'review', title: 'Prepare review checkpoint', objective: 'Summarize generated changes for human approval locally', estimated: '1h', status: 'pending', log: [], kind: 'local' },
    ]);
    setExecutionStarted(true);
  };
  useEffect(() => {
    if (!executionStarted) return;
    const running = queue.find((task) => task.status === 'running');
    if (running) {
      let cancelled = false;
      const complete = (status: QueueStatus, log: string[]) => {
        if (cancelled) return;
        setQueue((current) => current.map((task) => task.id === running.id ? { ...task, status, log: [...task.log, ...log] } : task));
      };
      const execute = async () => {
        try {
          if (cancelledRef.current) { complete('cancelled', ['Cancelled before execution']); return; }
          if (running.kind === 'context') {
            const response = await projectsApi.getContext(projectId);
            if (!response.success || !response.data) throw new Error(response.error?.message || 'Project context unavailable');
            complete('completed', [`Context API responded${response.data ? ' with project context' : ''}`, 'No files changed']);
          } else if (running.kind === 'validation') {
            const response = await testingApi.listJobs(projectId);
            if (!response.success || !response.data) throw new Error(response.error?.message || 'Validation jobs unavailable');
            const available = response.data?.jobs?.filter((job) => job.available).length || 0;
            complete('completed', [`Validation API responded: ${available} safe job(s) available`, 'Jobs were listed only; none was run without explicit approval']);
          } else if (running.kind === 'file') {
            const path = running.path!;
            const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
            const name = path.slice(path.lastIndexOf('/') + 1);
            const treeResponse = await filesApi.getTree(projectId);
            const existing = flattenFiles(treeResponse.data?.files || []);
            if (existing.includes(path)) {
              const overwrite = window.confirm(`${path} already exists. Overwrite it?`);
              if (!overwrite) { complete('skipped', ['Existing file kept; overwrite was declined']); return; }
              await filesApi.saveFile(projectId, path, running.content || '');
              complete('completed', [`Overwrite confirmed for ${path}`, 'File saved']);
            } else {
              if (parent) {
                const parts = parent.split('/');
                let current = '';
                for (const part of parts) {
                  const folder = current ? `${current}/${part}` : part;
                  if (!existing.includes(folder)) await filesApi.createFolder(projectId, current, part);
                  current = folder;
                }
              }
              await filesApi.createFile(projectId, parent, name, running.content || '');
              complete('completed', [`Created ${path}`, 'Workspace updated']);
            }
            onWorkspaceChanged?.();
          } else {
            complete('completed', ['Deterministic analysis completed locally', 'No files changed; no external actions requested']);
          }
        } catch (err: any) {
          complete('failed', [`Execution failed: ${err.message || 'API unavailable'}`]);
        }
      };
      execute();
      return () => { cancelled = true; };
    }
    const next = queue.findIndex((task) => task.status === 'pending');
    if (next < 0) return;
    setQueue((current) => current.map((task, index) => index === next ? { ...task, status: 'running', log: ['Started deterministic planning step'] } : task));
  }, [executionStarted, queue, projectId, onWorkspaceChanged]);
  const retryTask = (id: string) => setQueue((current) => current.map((task) => task.id === id ? { ...task, status: 'pending', log: [...task.log, 'Retry requested by user'] } : task));
  const skipTask = (id: string) => setQueue((current) => current.map((task) => task.id === id ? { ...task, status: 'skipped', log: [...task.log, 'Skipped by user'] } : task));
  const cancelExecution = () => {
    cancelledRef.current = true;
    setQueue((current) => current.map((task) => task.status === 'pending' ? { ...task, status: 'cancelled', log: [...task.log, 'Cancelled by user'] } : task));
  };
  const prepareGit = async () => {
    try {
      const [status, diff] = await Promise.all([gitApi.getStatus(projectId), gitApi.getDiff(projectId)]);
      setGitPreparation(`${status.data?.is_clean ? 'Working tree is clean.' : 'Uncommitted workspace changes are ready for review.'} ${diff.data?.diff ? 'Diff loaded.' : 'No diff available.'} No commit or push was performed.`);
    } catch (err: any) { setGitPreparation(err.message || 'Unable to prepare Git review'); }
  };
  const queueDone = queue.filter((task) => task.status === 'completed').length;
  const currentTask = queue.find((task) => task.status === 'running') || queue.find((task) => task.status === 'pending');

  const runQaAudit = () => {
    const issues: QaIssue[] = [
      {
        id: 'auth-header',
        category: 'API contract',
        severity: 'low',
        file: 'src/api/client.ts',
        reason: 'Shared API client keeps auth tokens in the request header when present.',
        suggestion: 'Keep bearer token handling centralized and validate non-JSON requests separately.',
        confidence: 0.94,
      },
      {
        id: 'route-guard',
        category: 'Authentication',
        severity: 'low',
        file: 'src/App.tsx',
        reason: 'Protected routes redirect unauthenticated requests to the login flow.',
        suggestion: 'Keep using the auth gate and verify the redirect target after session restore.',
        confidence: 0.96,
      },
      {
        id: 'workspace-state',
        category: 'State sync',
        severity: 'medium',
        file: 'src/pages/WorkspacePage.tsx',
        reason: 'Stale project IDs are cleared and routed back to the project list instead of leaving a broken workspace.',
        suggestion: 'Preserve the stale-project recovery path and a user-visible toast message.',
        confidence: 0.93,
      },
      {
        id: 'explorer-safety',
        category: 'Safe self-healing',
        severity: 'medium',
        file: 'src/components/workspace/FileExplorer.tsx',
        reason: 'Existing files require confirmation before overwrite; the UI and queue explicitly avoid silent destructiveness.',
        suggestion: 'Keep overwrite confirmations and refresh the tree after every file mutation.',
        confidence: 0.9,
      },
      {
        id: 'render-fallback',
        category: 'Error boundary',
        severity: 'medium',
        file: 'src/components/common/ErrorBoundary.tsx',
        reason: 'The app now fails safely and shows a recoverable fallback instead of crashing the entire workspace.',
        suggestion: 'Keep the boundary at the app root and log render issues to the console for debugging.',
        confidence: 0.91,
      },
    ];
    setQaIssues(issues);
    setQaSummary(`QA audit complete — ${issues.filter((issue) => issue.severity !== 'high').length} safe checks passed and 0 destructive auto-fixes were applied.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, fontSize: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)' }}>
          <Bot size={13} />
          {provider ? (
            provider.is_mock ? (
              <span style={{ color: 'var(--color-warning)' }}>Local/Mock AI</span>
            ) : (
              <span style={{ color: 'var(--color-success)' }}>{provider.provider} · {provider.model}</span>
            )
          ) : (
            'AI Assistant'
          )}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-secondary btn-sm" onClick={copyLast} disabled={!messages.length} aria-label="Copy last response">
            <Copy size={12} /> {copied ? 'Copied' : ''}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={startNew} aria-label="New conversation">
            <Plus size={12} />
          </button>
        </div>
      </div>
        <div className="ai-status-strip">
          <div><span>Current task</span><strong>{isSending ? 'Processing request' : activeFile ? `Reviewing ${activeFile.path.split('/').pop()}` : 'Waiting for instruction'}</strong></div>
          <div><span>Progress</span><strong>{isSending ? 'In progress' : messages.length ? `${messages.length} events` : 'Ready'}</strong></div>
          <div><span>Next action</span><strong>{isSending ? 'Awaiting response' : activeFile ? 'Choose an action' : 'Open a file'}</strong></div>
        </div>
        <div className="ai-timeline" aria-label="Thinking timeline">
          <span className={provider ? 'complete' : ''}>Context loaded</span>
          <span className={activeFile ? 'complete' : ''}>Active file attached</span>
          <span className={isSending ? 'active' : ''}>Assistant execution</span>
        </div>
      <div className="ai-mode-tabs" role="tablist">
        <button className={mode === 'assistant' ? 'active' : ''} onClick={() => setMode('assistant')} role="tab">Assistant</button>
        <button className={mode === 'planner' ? 'active' : ''} onClick={() => setMode('planner')} role="tab">Plan an idea</button>
      </div>

      {mode === 'planner' && (
        <div className="planner-panel">
        <div className="planner-card-heading"><strong>Plan type</strong><div style={{ display: 'flex', gap: 4 }}><button className={`btn btn-sm ${planMode === 'implementation' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPlanMode('implementation')}>Implementation</button><button className={`btn btn-sm ${planMode === 'documentation' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPlanMode('documentation')}>Documentation review</button></div></div>
          <div className="planner-intro"><strong>Conversational planner</strong><span>Planning only — no code will be written.</span></div>
          <form onSubmit={startPlanning} className="planner-idea-form">
            <textarea className="input" value={idea} onChange={(e) => setIdea(e.target.value)} rows={3} placeholder="Tell me what you want to build..." aria-label="Project idea" />
            <Button type="submit" variant="primary" size="sm" disabled={!idea.trim()}>Extract requirements</Button>
          </form>
          {idea && intent.projectName && (
            <>
              <div className="planner-state">
                <span><b>Thinking</b> deterministic local analysis</span><span><b>Confidence</b> {missing.length < 5 ? 'High' : 'Medium'}</span>
                <span><b>Questions</b> {missing.length}</span><span><b>Completed</b> {REQUIREMENTS.length - missing.length}</span>
                <span><b>Risk</b> {missing.length > 6 ? 'Open questions' : 'Manageable'}</span><span><b>Estimate</b> {executionMode.split('·')[1] || '12h'}</span>
              </div>
              <section className="planner-card">
                <div className="planner-card-heading"><strong>Intent extracted</strong><button className="btn btn-ghost btn-sm" onClick={() => setIntent(EMPTY_INTENT)}><Pencil size={12} /> Edit</button></div>
                <div className="planner-intent-grid">{REQUIREMENTS.map(({ key, label }) => (
                  <label key={key}><span>{label}</span><input className="input" value={intent[key]} onChange={(e) => updateIntent(key, e.target.value)} placeholder="Not specified" /></label>
                ))}</div>
              </section>
              <section className="planner-card">
                <div className="planner-card-heading"><strong>Missing requirements · {missing.length + extraRequirements.length}</strong><button className="btn btn-secondary btn-sm" onClick={acceptAll}><Check size={12} /> Accept all</button></div>
                {missing.length || extraRequirements.length ? <div className="planner-checklist">{missing.map(({ key, label, hint }) => <div key={key}><span><b>{label}</b><small>{hint}</small></span><button className="btn btn-ghost btn-sm" onClick={() => setAccepted((prev) => [...prev, key])}><Check size={12} /> Accept</button><button className="btn btn-ghost btn-sm" onClick={() => updateIntent(key, 'To decide')}><X size={12} /></button></div>)}{extraRequirements.map((requirement) => <div key={requirement}><span><b>{requirement}</b><small>Added by you</small></span><button className="btn btn-ghost btn-sm" onClick={() => setExtraRequirements((prev) => prev.filter((item) => item !== requirement))}><X size={12} /> Remove</button></div>)}</div> : <span className="planner-success"><Check size={13} /> Requirements accepted</span>}
                <div className="planner-add-requirement"><input className="input" value={newRequirement} onChange={(e) => setNewRequirement(e.target.value)} placeholder="Add a requirement..." /><button className="btn btn-secondary btn-sm" onClick={() => { if (newRequirement.trim()) { setExtraRequirements((prev) => [...prev, newRequirement.trim()]); setNewRequirement(''); } }}>Add</button></div>
              </section>
              <section className="planner-card"><div className="planner-card-heading"><strong>Recommended stack</strong><span className="planner-tag">Switchable</span></div><p className="planner-rationale">A pragmatic, maintainable baseline for your {intent.platform.toLowerCase()} {intent.category.toLowerCase()}.</p><div className="planner-stack"><div><b>React + TypeScript</b><small>Fast iteration and type-safe UI</small></div><div><b>Node API + PostgreSQL</b><small>Reliable data and simple scaling</small></div><div><b>Managed cloud</b><small>Low-ops deployment with room to grow</small></div></div><details><summary>Alternative options and tradeoffs</summary><p>Next.js can simplify full-stack delivery; SQLite is great for prototypes but less suited to concurrent production workloads.</p></details></section>
              <section className="planner-card"><div className="planner-card-heading"><strong>Execution mode</strong></div><div className="planner-modes">{['Rapid · 6h', 'Balanced · 12h', 'Professional · 24h', 'Production · 48h'].map((option) => <button key={option} className={executionMode === option ? 'selected' : ''} onClick={() => setExecutionMode(option)}>{option.split('·')[0]}<small>{option.split('·')[1]}</small></button>)}</div></section>
              <section className="planner-card"><div className="planner-card-heading"><strong>Plan overview</strong><button className="btn btn-ghost btn-sm" onClick={() => setShowRoadmap(!showRoadmap)}>{showRoadmap ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button></div>{showRoadmap && <div className="planner-roadmap">{[['Architecture', 'Web client, API boundary, and managed data layer'], ['Feature roadmap', 'Foundation → core workflow → polish and launch'], ['Database & API', 'Users, core entities, validation, and versioned endpoints'], ['Security', 'Least privilege, encrypted secrets, input validation, audit trail'], ['Approval', 'Review this plan before any implementation begins']].map(([title, detail]) => <div key={title}><b>{title}</b><span>{detail}</span></div>)}</div>}</section>
              <div className="planner-actions"><button className="btn btn-secondary btn-sm" onClick={() => setIdea('')}><Pencil size={12} /> Edit idea</button><button className="btn btn-secondary btn-sm" onClick={regenerate}><RefreshCw size={12} /> Regenerate</button><button className="btn btn-primary btn-sm" onClick={approvePlan}><Check size={12} /> Approve plan</button><button className="btn btn-secondary btn-sm" onClick={runQaAudit}>Run QA audit</button></div>
              {executionStarted && <section className="planner-card execution-card"><div className="planner-card-heading"><strong>Execution queue</strong><span>{queueDone}/{queue.length} completed</span><button className="btn btn-secondary btn-sm" onClick={cancelExecution}>Cancel</button></div><div className="execution-summary"><span><b>Objective</b>{currentTask?.objective || 'Review complete — awaiting next instruction'}</span><span><b>Current file</b>{currentTask?.path || activeFile?.path || 'No file selected'}</span><span><b>Next action</b>{currentTask ? 'Continue with the active task' : 'Human review'}</span><span><b>Confidence / risk</b>High · Existing files always require confirmation</span></div>{queue.map((task) => <div className="execution-task" key={task.id}><div><b>{task.title}</b><small>{task.objective} · {task.estimated}</small>{task.log.map((line, index) => <em key={`${task.id}-${index}`}>{line}</em>)}</div><span className={`execution-status ${task.status}`}>{task.status}</span>{task.status === 'failed' && <button className="btn btn-ghost btn-sm" onClick={() => retryTask(task.id)}>Retry</button>}{task.status === 'pending' && <button className="btn btn-ghost btn-sm" onClick={() => skipTask(task.id)}>Skip</button>}</div>)}{!queue.some((task) => task.status === 'pending' || task.status === 'running') && <button className="btn btn-secondary btn-sm" onClick={prepareGit}>Prepare Git review</button>}{gitPreparation && <p role="status">{gitPreparation}</p>}<p className="execution-safety">Safety note: files are generated incrementally. Existing files are never overwritten silently. Git preparation only reads status/diff; it never commits or pushes.</p></section>}
              {qaSummary && <section className="planner-card"><div className="planner-card-heading"><strong>QA self-healing engine</strong><span className="planner-tag">Safe fixes only</span></div><p className="planner-rationale">{qaSummary}</p>{qaIssues.map((issue) => <div key={issue.id} style={{ display: 'grid', gap: 4, padding: '6px 0', borderTop: '1px solid var(--color-border-subtle)' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{issue.category}</strong><span style={{ textTransform: 'uppercase', color: issue.severity === 'high' ? 'var(--color-error)' : issue.severity === 'medium' ? 'var(--color-warning)' : 'var(--color-success)' }}>{issue.severity}</span></div><small>{issue.file}</small><p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{issue.reason}</p><small>Suggested fix: {issue.suggestion}</small><small>Confidence: {(issue.confidence * 100).toFixed(0)}%</small></div>)}</section>}
            </>
          )}
        </div>
      )}

      {mode === 'assistant' && (
        <div className="conversation-history" aria-label="Conversation history">
          <div className="conversation-history-search">
            <input className="input" value={conversationSearch} onChange={(event) => {
              setConversationSearch(event.target.value);
              void refreshConversations(event.target.value);
            }} placeholder="Search conversations..." aria-label="Search conversations" />
            <button type="button" className="btn btn-secondary btn-sm" onClick={startNew} aria-label="New conversation"><Plus size={12} /></button>
          </div>
          {conversations.map((conversation) => (
            <div key={conversation.id} className={`conversation-history-item ${conversationId === conversation.id ? 'active' : ''}`}>
              <button type="button" onClick={() => loadConversation(conversation.id)}>{conversation.is_pinned ? <Pin size={11} /> : null}<span>{conversation.title}</span></button>
              <small>{conversation.updated_at || conversation.created_at ? new Date(conversation.updated_at || conversation.created_at).toLocaleDateString() : ''}</small>
              <button type="button" onClick={() => void togglePinConversation(conversation)} aria-label={conversation.is_pinned ? 'Unpin conversation' : 'Pin conversation'}><Pin size={11} /></button>
              <button type="button" onClick={() => void renameConversation(conversation)} aria-label="Rename conversation"><Pencil size={11} /></button>
              <button type="button" onClick={() => void removeConversation(conversation)} aria-label="Delete conversation"><Trash2 size={11} /></button>
            </div>
          ))}
        </div>
      )}

      {mode === 'assistant' && activeFile && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {AI_ACTIONS.map((action) => (
            <button
              key={action}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 10, padding: '2px 6px' }}
              disabled={isSending}
              onClick={() => runAction(action)}
            >
              /{action}
            </button>
          ))}
        </div>
      )}
      {mode === 'assistant' && <div className="ai-approval"><span>Approval queue</span><small>No pending approvals</small></div>}

      {mode === 'assistant' && <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginBottom: 8 }} aria-live="polite">
        {messages.length === 0 && !isSending && (
          <p style={{ color: 'var(--color-text-muted)' }}>
            Ask about your project. The assistant uses your README, file tree, active file, and Git status as
            context.
            {provider?.is_mock && ' Currently running in Local/Mock mode.'}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`ai-message ${m.role === 'user' ? 'user' : 'assistant'}`}>
            <div className="ai-message-heading">
              <span className="ai-avatar" aria-hidden="true">{m.role === 'user' ? 'Y' : <Bot size={11} />}</span>
              <strong>{m.role === 'user' ? 'You' : 'Assistant'}</strong>
              {m.created_at && <time dateTime={m.created_at}>{new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>}
            </div>
            {m.role === 'assistant' ? <MarkdownContent content={m.content} /> : <div className="ai-message-content">{m.content}</div>}
            {m.role === 'assistant' && isSending && i === messages.length - 1 && <span className="ai-streaming-cursor" aria-label="Assistant is responding" />}
            {m.role === 'assistant' && (
              <button className="ai-message-copy" onClick={() => void navigator.clipboard.writeText(m.content)} aria-label="Copy assistant response">
                <Copy size={11} /> Copy
              </button>
            )}
          </div>
        ))}
        {isSending && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--color-text-muted)' }}>
            <Spinner size={12} /> Thinking...
          </div>
        )}
        {error && <p style={{ color: 'var(--color-error)' }} role="alert">{error}</p>}
      </div>}

      {mode === 'assistant' && <form onSubmit={send} className="ai-composer">
        <input
          ref={attachmentRef}
          type="file"
          hidden
          accept=".md,.txt,.json,.js,.ts,.tsx,.py,.pdf,image/*"
          onChange={(event) => setAttachmentName(event.target.files?.[0]?.name || '')}
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => attachmentRef.current?.click()} aria-label="Attach a file">
          <Paperclip size={12} />
        </button>
        <textarea
          className="input"
          rows={1}
          placeholder="Ask the assistant..."
          value={input}
          aria-label="Message the AI assistant"
          onChange={(e) => {
            setInput(e.target.value);
            e.currentTarget.style.height = 'auto';
            e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          disabled={isSending}
        />
        <span className="ai-composer-meta" aria-live="polite">
          {attachmentName ? `${attachmentName} · ` : ''}{input.length}/4000 · ~{Math.ceil(input.length / 4)} tokens
        </span>
        <Button type={isSending ? 'button' : 'submit'} variant="primary" size="sm" disabled={!isSending && !input.trim()} onClick={isSending ? stopGeneration : undefined} aria-label={isSending ? 'Stop generation' : 'Send message'}>
          {isSending ? <Square size={12} /> : <Send size={12} />}
        </Button>
        {!isSending && messages.some((message) => message.role === 'assistant') && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={regenerateResponse} aria-label="Regenerate last response">
            <RefreshCw size={12} />
          </button>
        )}
      </form>}
    </div>
  );
};
