import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Bot, FolderGit2, GitBranch, Rocket, Send, Sparkles, Code2, Bug, BookOpen, RefreshCw } from 'lucide-react';
import { Button, Badge, Spinner } from '../components/common';
import { useProject } from '../hooks/useProject';
import { Link, useNavigate } from 'react-router-dom';
import { aiApi, projectsApi } from '../api';
import { Project } from '../types/project';
import { useSeo } from '../hooks/useSeo';
import { useToast } from '../components/common/Toast';

const SUGGESTED_PROMPTS = [
  { icon: Code2, label: 'Build a responsive Todo app', prompt: 'Build a responsive Todo app with React and TypeScript' },
  { icon: Bug, label: 'Debug my current project', prompt: 'Help me debug issues in my current project' },
  { icon: BookOpen, label: 'Explain this code', prompt: 'Explain how the code in my active file works' },
  { icon: RefreshCw, label: 'Refactor this component', prompt: 'Suggest improvements to refactor my current component' },
];

export const DashboardPage: React.FC = () => {
  useSeo({ title: 'DEVOS — AI Workspace', noindex: true });

  const { activeProject } = useProject();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    projectsApi.list().then((res) => setProjects(res.data?.projects || [])).catch(() => setProjects([]));
  }, []);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    if (!activeProject) {
      toast('Select or create a project first to start a conversation.', 'info');
      return;
    }

    setIsSending(true);
    try {
      const convRes = await aiApi.createConversation(activeProject.id);
      const conversationId = convRes.data?.id;
      if (!conversationId) throw new Error('Failed to create conversation');

      await aiApi.chat(activeProject.id, { message: trimmed, conversation_id: conversationId });
      navigate('/app/workspace');
    } catch (err: any) {
      toast(err?.message || 'Failed to start conversation', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const activeProjectName = activeProject?.name;
  const activeBranch = activeProject?.default_branch || 'main';

  return (
    <div className="ai-home">
      {/* Compact context bar */}
      <div className="ai-home-context">
        <div className="ai-home-context-item">
          <FolderGit2 size={14} />
          <span className="ai-home-context-label">Project</span>
          <span className="ai-home-context-value">{activeProjectName || 'None selected'}</span>
        </div>
        <div className="ai-home-context-divider" />
        <div className="ai-home-context-item">
          <GitBranch size={14} />
          <span className="ai-home-context-label">Git</span>
          <span className="ai-home-context-value">{activeBranch}</span>
        </div>
        <div className="ai-home-context-divider" />
        <div className="ai-home-context-item">
          <Bot size={14} />
          <span className="ai-home-context-label">AI</span>
          <Badge variant="accent" icon={<Sparkles size={10} />}>Ready</Badge>
        </div>
        <div className="ai-home-context-divider" />
        <div className="ai-home-context-item">
          <Rocket size={14} />
          <span className="ai-home-context-label">Deploy</span>
          <span className="ai-home-context-value">{activeProject ? 'Ready' : 'Waiting'}</span>
        </div>
      </div>

      {/* Primary content */}
      <div className="ai-home-content">
        <div className="ai-home-hero">
          <h1 className="ai-home-title">What do you want to build?</h1>
          <p className="ai-home-subtitle">Build, debug, refactor, and ship with DEVOS.</p>
        </div>

        {/* AI Composer */}
        <form onSubmit={handleSubmit} className="ai-home-composer">
          <div className="ai-home-composer-inner">
            <textarea
              ref={textareaRef}
              className="ai-home-composer-input"
              rows={1}
              placeholder="Describe what you want to build..."
              value={input}
              aria-label="Describe what you want to build"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              disabled={isSending}
            />
            <div className="ai-home-composer-actions">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSending || !input.trim()}
                aria-label={isSending ? 'Sending...' : 'Send message'}
              >
                {isSending ? <Spinner size={14} /> : <Send size={14} />}
                <span>{isSending ? 'Sending' : 'Send'}</span>
              </Button>
            </div>
          </div>
          <div className="ai-home-composer-hint">
            <span>Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line</span>
          </div>
        </form>

        {/* Suggested prompts */}
        <div className="ai-home-suggestions">
          <p className="ai-home-suggestions-title">Suggested prompts</p>
          <div className="ai-home-suggestions-grid">
            {SUGGESTED_PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                className="ai-home-suggestion-card"
                onClick={() => handleSuggestionClick(item.prompt)}
              >
                <span className="ai-home-suggestion-icon"><item.icon size={16} /></span>
                <span className="ai-home-suggestion-label">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick access */}
        {!activeProject && projects.length > 0 && (
          <div className="ai-home-quick-access">
            <p className="ai-home-quick-access-title">Continue where you left off</p>
            <div className="ai-home-quick-access-list">
              {projects.slice(0, 3).map((project) => (
                <Link
                  key={project.id}
                  to="/app/workspace"
                  className="ai-home-quick-access-item"
                  onClick={() => {
                    projectsApi.get(project.id).then((res) => {
                      if (res.data) {
                        const event = new CustomEvent('devos:setActiveProject', { detail: res.data });
                        window.dispatchEvent(event);
                      }
                    });
                  }}
                >
                  <FolderGit2 size={16} />
                  <div>
                    <span className="ai-home-quick-access-name">{project.name}</span>
                    <span className="ai-home-quick-access-meta">{project.default_branch || 'main'}</span>
                  </div>
                  <Plus size={14} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
