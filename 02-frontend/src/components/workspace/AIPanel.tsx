import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Copy, Plus, Send } from 'lucide-react';
import { aiApi } from '../../api';
import { AIMessage, Conversation } from '../../types/ai';
import { Spinner, Button } from '../common';

interface AIPanelProps {
  projectId: string;
  activeFile: { path: string; content: string; language?: string } | null;
}

const AI_ACTIONS = ['explain', 'debug', 'refactor', 'test', 'document', 'security', 'optimize'] as const;

export const AIPanel: React.FC<AIPanelProps> = ({ projectId, activeFile }) => {
  const [provider, setProvider] = useState<{ provider: string; is_mock: boolean; model: string } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aiApi.getProvider(projectId).then((res) => setProvider(res.data || null)).catch(() => {});
    aiApi
      .getConversations(projectId)
      .then((res) => setConversations(res.data?.conversations || []))
      .catch(() => {});
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
        setMessages((res.data?.messages || []).map((m) => ({ role: m.role as AIMessage['role'], content: m.content })));
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

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setIsSending(true);
    setError('');
    try {
      const res = await aiApi.chat(projectId, {
        message,
        conversation_id: conversationId || undefined,
        current_file: activeFile?.path,
      });
      const data = res.data!;
      setConversationId(data.conversation_id);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message.content }]);
      if (!conversations.some((c) => c.id === data.conversation_id)) {
        aiApi
          .getConversations(projectId)
          .then((r) => setConversations(r.data?.conversations || []))
          .catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'AI request failed');
    } finally {
      setIsSending(false);
    }
  };

  const runAction = async (action: string) => {
    if (!activeFile || isSending) return;
    setMessages((prev) => [...prev, { role: 'user', content: `/${action} ${activeFile.path}` }]);
    setIsSending(true);
    setError('');
    try {
      const res = await aiApi.runAction(projectId, {
        action,
        code: activeFile.content,
        file_path: activeFile.path,
        language: activeFile.language,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data!.content }]);
    } catch (err: any) {
      setError(err.message || 'AI action failed');
    } finally {
      setIsSending(false);
    }
  };

  const copyLast = () => {
    const last = [...messages].reverse().find((m) => m.role === 'assistant');
    if (last) {
      navigator.clipboard.writeText(last.content).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
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

      {conversations.length > 0 && (
        <select
          className="input"
          style={{ fontSize: 12, padding: '4px 8px', marginBottom: 6 }}
          value={conversationId || ''}
          aria-label="Conversation history"
          onChange={(e) => (e.target.value ? loadConversation(e.target.value) : startNew())}
        >
          <option value="">New conversation</option>
          {conversations.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      )}

      {activeFile && (
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

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginBottom: 8 }} aria-live="polite">
        {messages.length === 0 && !isSending && (
          <p style={{ color: 'var(--color-text-muted)' }}>
            Ask about your project. The assistant uses your README, file tree, active file, and Git status as
            context.
            {provider?.is_mock && ' Currently running in Local/Mock mode.'}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ color: m.role === 'user' ? 'var(--color-accent)' : 'var(--color-success)', fontWeight: 600, fontSize: 11 }}>
              {m.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)', fontFamily: 'inherit' }}>
              {m.content}
            </pre>
          </div>
        ))}
        {isSending && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--color-text-muted)' }}>
            <Spinner size={12} /> Thinking...
          </div>
        )}
        {error && <p style={{ color: 'var(--color-error)' }} role="alert">{error}</p>}
      </div>

      <form onSubmit={send} style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          className="input"
          style={{ flex: 1, fontSize: 12, padding: '6px 10px' }}
          placeholder="Ask the assistant..."
          value={input}
          aria-label="Message the AI assistant"
          onChange={(e) => setInput(e.target.value)}
          disabled={isSending}
        />
        <Button type="submit" variant="primary" size="sm" disabled={isSending || !input.trim()} aria-label="Send message">
          <Send size={12} />
        </Button>
      </form>
    </div>
  );
};
