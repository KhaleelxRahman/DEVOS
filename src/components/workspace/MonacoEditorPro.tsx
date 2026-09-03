import React, { useEffect, useRef, useState } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import {
  Save,
  Sparkles,
  RotateCcw,
  Bug,
  Zap,
  FileCode2,
  TestTube,
  Code2,
  X,
  Check,
  Languages,
  BookOpen,
  Search,
} from 'lucide-react';
import { OpenTab } from './CodeViewer';
import { aiApi, filesApi } from '../../api';
import { Spinner, Button } from '../common';
import { useToast } from '../common/Toast';

interface MonacoEditorProProps {
  tabs: OpenTab[];
  activePath: string | null;
  projectId: string;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
  onSave: (path: string, content: string) => Promise<boolean>;
  onApplyAICode?: (path: string, newCode: string) => void;
}

export const MonacoEditorPro: React.FC<MonacoEditorProProps> = ({
  tabs,
  activePath,
  projectId,
  onActivate,
  onClose,
  onSave,
}) => {
  const [editorValue, setEditorValue] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(false);
  const [aiRunning, setAiRunning] = useState<string | null>(null);
  const [aiResultModal, setAiResultModal] = useState<{ title: string; content: string; code?: string } | null>(null);

  // Quick Open (Ctrl+P) modal state
  const [isQuickOpenVisible, setIsQuickOpenVisible] = useState<boolean>(false);
  const [quickOpenQuery, setQuickOpenQuery] = useState<string>('');
  const [projectFilePaths, setProjectFilePaths] = useState<string[]>([]);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const autoSaveTimerRef = useRef<any>(null);
  const { toast } = useToast();

  const activeTab = tabs.find((t) => t.path === activePath) || null;

  // Load project file tree for Ctrl+P Quick Open
  useEffect(() => {
    filesApi.getTree(projectId).then((res) => {
      if (res.success && res.data?.files) {
        const collectPaths = (nodes: any[]): string[] => {
          let list: string[] = [];
          for (const n of nodes) {
            if (n.type === 'file') list.push(n.path);
            if (n.children) list = list.concat(collectPaths(n.children));
          }
          return list;
        };
        setProjectFilePaths(collectPaths(res.data.files));
      }
    }).catch(() => {});
  }, [projectId]);

  // Sync editor content when active tab changes
  useEffect(() => {
    if (activeTab && activeTab.content !== undefined) {
      setEditorValue(activeTab.content);
      setIsDirty(false);
    } else {
      setEditorValue('');
      setIsDirty(false);
    }
  }, [activePath, activeTab?.content]);

  // Auto-save debouncer
  useEffect(() => {
    if (!autoSaveEnabled || !isDirty || !activePath) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [editorValue, autoSaveEnabled, isDirty, activePath]);

  // Global Ctrl+P keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsQuickOpenVisible(true);
      }
      if (e.key === 'Escape' && isQuickOpenVisible) {
        setIsQuickOpenVisible(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickOpenVisible]);

  // Handle Monaco onMount
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define custom dark theme matching DEVOS design system
    monaco.editor.defineTheme('devos-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'type', foreground: '8be9fd' },
      ],
      colors: {
        'editor.background': '#090d16',
        'editor.foreground': '#f8fafc',
        'editor.lineHighlightBackground': '#172033',
        'editorCursor.foreground': '#3b82f6',
        'editorWhitespace.foreground': '#1e293b',
        'editorIndentGuide.background': '#1e293b',
        'editorIndentGuide.activeBackground': '#334155',
        'editor.selectionBackground': '#2563eb40',
      },
    });

    monaco.editor.setTheme('devos-dark');

    // Add keyboard shortcut: Ctrl+S or Cmd+S to save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    // Add keyboard shortcut: Ctrl+P to trigger Quick Open
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      setIsQuickOpenVisible(true);
    });

    // Add keyboard shortcut: Ctrl+Alt+F to format
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument')?.run();
      toast('Formatted document', 'info');
    });
  };

  const handleSave = async () => {
    if (!activePath || isSaving) return;
    setIsSaving(true);
    const ok = await onSave(activePath, editorValue);
    setIsSaving(false);
    if (ok) {
      setIsDirty(false);
    }
  };

  const getLanguage = (path: string | null): string => {
    if (!path) return 'plaintext';
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'py':
        return 'python';
      default:
        return 'plaintext';
    }
  };

  const handleAIAction = async (action: string, title: string) => {
    if (!activeTab || aiRunning) return;
    const selectedText = editorRef.current?.getModel()?.getValueInRange(editorRef.current.getSelection()) || editorValue;
    if (!selectedText.trim()) {
      toast('No code available to run AI action on', 'warning');
      return;
    }

    setAiRunning(action);
    try {
      const res = await aiApi.runAction(projectId, {
        action,
        code: selectedText,
        file_path: activeTab.path,
        language: getLanguage(activeTab.path),
      });

      if (res.success && res.data) {
        const rawContent = res.data.content;
        const codeMatch = rawContent.match(/```(?:typescript|javascript|python|css|html|json)?\n([\s\S]*?)```/);
        const extractedCode = codeMatch ? codeMatch[1].trim() : undefined;

        setAiResultModal({
          title,
          content: rawContent,
          code: extractedCode,
        });
        toast(`AI ${title} generated`, 'success');
      }
    } catch (err: any) {
      toast(err.message || `AI ${title} failed`, 'error');
    } finally {
      setAiRunning(null);
    }
  };

  const applyAICodeToEditor = (newCode: string) => {
    if (!editorRef.current) return;
    const selection = editorRef.current.getSelection();
    if (selection && !selection.isEmpty()) {
      editorRef.current.executeEdits('ai-action', [
        {
          range: selection,
          text: newCode,
          forceMoveMarkers: true,
        },
      ]);
    } else {
      setEditorValue(newCode);
    }
    setIsDirty(true);
    setAiResultModal(null);
    toast('Applied AI code directly into Monaco editor', 'success');
  };

  const filteredQuickOpenFiles = projectFilePaths.filter((p) =>
    p.toLowerCase().includes(quickOpenQuery.toLowerCase())
  );

  if (tabs.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--color-text-muted)',
          gap: 'var(--space-3)',
          background: 'var(--color-background)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--space-6)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-accent)',
          }}
        >
          <Code2 size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
            Monaco Editor Pro
          </h3>
          <p style={{ fontSize: 'var(--font-size-xs)', margin: '0 0 12px 0', maxWidth: 300 }}>
            Select a file from the repository explorer or press <strong>Ctrl+P</strong> to Quick Open.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setIsQuickOpenVisible(true)} leftIcon={<Search size={12} />}>
            Quick Open File (Ctrl+P)
          </Button>
        </div>
      </div>
    );
  }

  const breadcrumbParts = activePath ? activePath.split('/') : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative' }}>
      {/* Top Tab Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          padding: '0 4px',
          overflowX: 'auto',
        }}
      >
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', flex: 1 }} role="tablist">
          {tabs.map((tab, index) => {
            const isCurrent = tab.path === activePath;
            const filename = tab.path.split('/').pop() || tab.path;
            return (
              <div
                key={`${tab.path}-${index}`}
                role="tab"
                aria-selected={isCurrent}
                onClick={() => onActivate(tab.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  borderTop: isCurrent ? '2px solid var(--color-accent)' : '2px solid transparent',
                  background: isCurrent ? 'var(--color-background)' : 'transparent',
                  color: isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  borderRight: '1px solid var(--color-border)',
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'nowrap',
                }}
              >
                <FileCode2 size={13} color={isCurrent ? 'var(--color-accent)' : 'inherit'} />
                <span>{filename}</span>
                {isCurrent && isDirty && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning)' }} title="Unsaved changes" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.path);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 2,
                    cursor: 'pointer',
                    color: 'inherit',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={`Close ${filename}`}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Auto-Save</span>
          </label>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsQuickOpenVisible(true)}
            leftIcon={<Search size={12} />}
            title="Quick Open (Ctrl+P)"
          >
            Ctrl+P
          </Button>

          <Button
            variant={isDirty ? 'primary' : 'secondary'}
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            leftIcon={isSaving ? <Spinner size={12} /> : <Save size={12} />}
          >
            {isSaving ? 'Saving…' : 'Save (Ctrl+S)'}
          </Button>
        </div>
      </div>

      {/* Breadcrumbs & AI Actions Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 10px',
          background: 'var(--color-surface-elevated)',
          borderBottom: '1px solid var(--color-border)',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' }}>
          {breadcrumbParts.map((part, i) => (
            <React.Fragment key={i}>
              <span style={{ color: i === breadcrumbParts.length - 1 ? 'var(--color-text-primary)' : 'inherit' }}>
                {part}
              </span>
              {i < breadcrumbParts.length - 1 && <span>&gt;</span>}
            </React.Fragment>
          ))}
          <span style={{ marginLeft: 8, color: 'var(--color-accent)' }}>
            [{getLanguage(activePath)}]
          </span>
        </div>

        {/* AI Action Quick Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[
            { action: 'explain', label: 'Explain', icon: <BookOpen size={11} /> },
            { action: 'refactor', label: 'Refactor', icon: <RotateCcw size={11} /> },
            { action: 'fix_bug', label: 'Fix Bug', icon: <Bug size={11} /> },
            { action: 'optimize', label: 'Optimize', icon: <Zap size={11} /> },
            { action: 'generate_tests', label: 'Unit Tests', icon: <TestTube size={11} /> },
            { action: 'convert_language', label: 'To Python', icon: <Languages size={11} /> },
          ].map((item) => (
            <button
              key={item.action}
              onClick={() => handleAIAction(item.action, item.label)}
              disabled={Boolean(aiRunning)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px',
                fontSize: '10px',
                borderRadius: 4,
                backgroundColor: aiRunning === item.action ? 'var(--color-accent)' : 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: aiRunning === item.action ? '#fff' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {aiRunning === item.action ? <Spinner size={10} /> : item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Monaco Editor Instance */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Editor
          height="100%"
          language={getLanguage(activePath)}
          value={editorValue}
          theme="devos-dark"
          onChange={(value) => {
            setEditorValue(value || '');
            setIsDirty(true);
          }}
          onMount={handleEditorMount}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: true },
            bracketPairColorization: { enabled: true },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderWhitespace: 'selection',
            tabSize: 2,
          }}
          loading={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
              <Spinner size={20} />
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Loading Monaco Pro…</span>
            </div>
          }
        />
      </div>

      {/* Quick Open (Ctrl+P) Modal Overlay */}
      {isQuickOpenVisible && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: 500,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 60,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={14} color="var(--color-accent)" />
            <input
              autoFocus
              type="text"
              placeholder="Search files by name (Ctrl+P)..."
              value={quickOpenQuery}
              onChange={(e) => setQuickOpenQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                width: '100%',
                outline: 'none',
              }}
            />
            <button
              onClick={() => setIsQuickOpenVisible(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ maxHeight: 240, overflowY: 'auto', padding: '4px' }}>
            {filteredQuickOpenFiles.length > 0 ? (
              filteredQuickOpenFiles.map((path, idx) => (
                <div
                  key={`${path}-${idx}`}
                  onClick={() => {
                    onActivate(path);
                    setIsQuickOpenVisible(false);
                    setQuickOpenQuery('');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-primary)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <FileCode2 size={13} color="var(--color-accent)" />
                  <span>{path}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11px' }}>
                No matching files found
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Action Result Modal Overlay */}
      {aiResultModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(9, 13, 22, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 40,
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface-elevated)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color="var(--color-accent)" />
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  AI Result: {aiResultModal.title}
                </span>
              </div>
              <button
                onClick={() => setAiResultModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', fontSize: '12px', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
                {aiResultModal.content}
              </pre>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 8,
                padding: '10px 16px',
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-surface-elevated)',
              }}
            >
              <Button variant="secondary" size="sm" onClick={() => setAiResultModal(null)}>
                Close
              </Button>
              {aiResultModal.code && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Check size={14} />}
                  onClick={() => applyAICodeToEditor(aiResultModal.code!)}
                >
                  Apply Code to Editor
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

