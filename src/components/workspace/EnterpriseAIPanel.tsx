import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  Zap,
  Check,
  Copy,
  RotateCcw,
  Bug,
  BookOpen,
  Code2,
} from 'lucide-react';
import { aiApi } from '../../api';
import { Spinner, Button } from '../common';
import { useToast } from '../common/Toast';

interface EnterpriseAIPanelProps {
  projectId: string;
  activeFilePath: string | null;
  activeFileContent?: string;
  onApplyCodeToEditor?: (code: string) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  extractedCode?: string;
  provider?: string;
}

const MODES = [
  { key: 'build', label: 'Build', icon: <Zap size={12} />, promptHint: 'e.g. Implement user authentication slice with JWT' },
  { key: 'debug', label: 'Debug', icon: <Bug size={12} />, promptHint: 'e.g. Find and fix race conditions in state update' },
  { key: 'review', label: 'Review', icon: <Bot size={12} />, promptHint: 'e.g. Review this file for security and performance vulnerabilities' },
  { key: 'refactor', label: 'Refactor', icon: <RotateCcw size={12} />, promptHint: 'e.g. Convert to functional components with custom hooks' },
  { key: 'explain', label: 'Explain', icon: <BookOpen size={12} />, promptHint: 'e.g. Explain the architectural flow of this module' },
  { key: 'test', label: 'Test', icon: <Code2 size={12} />, promptHint: 'e.g. Generate comprehensive Jest / Vitest unit tests' },
  { key: 'deploy', label: 'Deploy', icon: <Sparkles size={12} />, promptHint: 'e.g. Prepare production build checklist and Dockerfile' },
];

export const EnterpriseAIPanel: React.FC<EnterpriseAIPanelProps> = ({
  projectId,
  activeFilePath,
  onApplyCodeToEditor,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content:
        '👋 Welcome to **DEVOS AI Assistant** (Powered by Gemini 3.7 Pro Engine).\n\nI have full contextual awareness of your workspace files, active tabs, and terminal state. How can I help you build today?',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [currentMode, setCurrentMode] = useState<string>('build');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const extractCode = (markdown: string): string | undefined => {
    const match = markdown.match(/```(?:typescript|javascript|python|tsx|jsx|json|css|html)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : undefined;
  };

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Assemble rich context
      const contextPrefix = activeFilePath
        ? `[Context: Active file is '${activeFilePath}']\n`
        : '';
      const modeInstruction = `[Mode: ${currentMode.toUpperCase()}]\n`;

      const res = await aiApi.chat(projectId, {
        prompt: `${contextPrefix}${modeInstruction}${textToSend}`,
        message: `${contextPrefix}${modeInstruction}${textToSend}`,
        conversation_id: conversationId || undefined,
        file_path: activeFilePath || undefined,
      });

      if (res.success && res.data) {
        const assistantRaw = res.data.message?.content || res.data.message?.text || 'Response generated.';
        if (res.data.conversation_id) {
          setConversationId(res.data.conversation_id);
        }

        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: assistantRaw,
          timestamp: new Date().toLocaleTimeString(),
          extractedCode: extractCode(assistantRaw),
          provider: 'gemini-3.7-pro',
        };

        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      toast(err.message || 'AI request failed', 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'system',
          content: `⚠️ Error communicating with Gemini API: ${err.message || 'Network timeout'}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast('Code copied to clipboard', 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--color-surface)' }}>
      {/* Top Header & Mode Switcher */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} color="var(--color-accent)" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              DEVOS AI Assistant
            </span>
          </div>
          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 4, background: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-accent)', fontWeight: 600 }}>
            Gemini 3.7 Pro
          </span>
        </div>

        {/* Active Context Banner */}
        {activeFilePath && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
            <Code2 size={11} color="var(--color-accent)" />
            <span>Active context: {activeFilePath}</span>
          </div>
        )}

        {/* Modes Pill Bar */}
        <div style={{ display: 'flex', gap: 3, overflowX: 'auto' }}>
          {MODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setCurrentMode(mode.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: currentMode === mode.key ? 600 : 400,
                background: currentMode === mode.key ? 'var(--color-accent)' : 'var(--color-surface)',
                border: currentMode === mode.key ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                color: currentMode === mode.key ? '#fff' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {mode.icon}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message Stream */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} style={{ fontSize: '11px', color: 'var(--color-warning)', padding: '6px 10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 6 }}>
                {msg.content}
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '8px',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: isUser ? '85%' : '100%',
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Bot size={13} />
                </div>
              )}

              <div
                style={{
                  background: isUser ? 'var(--color-accent)' : 'var(--color-surface-elevated)',
                  border: isUser ? 'none' : '1px solid var(--color-border)',
                  borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  color: isUser ? '#ffffff' : 'var(--color-text-primary)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {msg.content}
                </div>

                {/* Apply Code to Monaco Button if code block exists */}
                {msg.extractedCode && onApplyCodeToEditor && (
                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <button
                      onClick={() => handleCopy(msg.extractedCode!)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--color-border)',
                        borderRadius: 4,
                        padding: '3px 6px',
                        fontSize: '10px',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <Copy size={10} /> Copy
                    </button>

                    <button
                      onClick={() => onApplyCodeToEditor(msg.extractedCode!)}
                      style={{
                        background: '#10b981',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Check size={12} /> Apply to Monaco
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-surface-elevated)', borderRadius: 8, alignSelf: 'flex-start' }}>
            <Spinner size={14} />
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Gemini 3.7 synthesizing code with repository context…
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Follow-up Chips & Automation Actions */}
      <div style={{ padding: '4px 10px', display: 'flex', gap: 4, overflowX: 'auto', borderTop: '1px solid var(--color-border-subtle)' }}>
        {[
          'Auto-Update README.md & Docs',
          'Explain Architecture & PRD',
          'Add TypeScript types & tests',
          'Detect bugs & auto-fix errors',
          'Optimize complexity & memoize',
        ].map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(undefined, suggestion)}
            disabled={isLoading}
            style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              background: idx === 0 ? 'rgba(59, 130, 246, 0.15)' : 'var(--color-surface-elevated)',
              border: idx === 0 ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
              color: idx === 0 ? '#93c5fd' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: idx === 0 ? 600 : 400,
            }}
          >
            {idx === 0 ? '⚡ ' : '+ '}
            {suggestion}
          </button>
        ))}
      </div>

      {/* Bottom Message Input Form */}
      <form
        onSubmit={handleSendMessage}
        style={{
          display: 'flex',
          gap: 6,
          padding: '8px 10px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface-elevated)',
        }}
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder={MODES.find((m) => m.key === currentMode)?.promptHint || 'Ask AI anything…'}
          disabled={isLoading}
          style={{
            flex: 1,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 10px',
            fontSize: '12px',
            color: 'var(--color-text-primary)',
          }}
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!inputPrompt.trim() || isLoading}
          leftIcon={isLoading ? <Spinner size={12} /> : <Send size={12} />}
        >
          Send
        </Button>
      </form>
    </div>
  );
};
