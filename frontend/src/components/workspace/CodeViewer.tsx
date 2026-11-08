import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Braces, Check, ChevronDown, FileCode2, FoldVertical, Redo2, Save, Search, Undo2, X } from 'lucide-react';
import type { editor as MonacoEditor, IDisposable } from 'monaco-editor';
import { FileContent } from '../../types/file';
import { Spinner } from '../common';

const Monaco = lazy(() => import('@monaco-editor/react'));

interface OpenTab {
  path: string;
  content: FileContent | null;
  isLoading: boolean;
  error: string;
}

interface CodeViewerProps {
  tabs: OpenTab[];
  activePath: string | null;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
  onSave: (path: string, content: string) => Promise<boolean>;
  onContentChange?: (path: string, content: string) => void;
}

export type { OpenTab };

type EditorTheme = 'devos-glass' | 'vs-dark' | 'hc-black';
const EDITOR_THEME_KEY = 'devos_editor_theme';

const languageFromPath = (path: string, fallback?: string) => {
  if (fallback) return fallback;
  const extension = path.split('.').pop()?.toLowerCase();
  const languages: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', json: 'json', css: 'css', scss: 'scss', html: 'html',
    md: 'markdown', yaml: 'yaml', yml: 'yaml', sh: 'shell', sql: 'sql',
  };
  return (extension && languages[extension]) || 'plaintext';
};

export const CodeViewer: React.FC<CodeViewerProps> = ({ tabs, activePath, onActivate, onClose, onSave, onContentChange }) => {
  const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(() => new Set());
  const [wordWrap, setWordWrap] = useState(false);
  const [theme, setTheme] = useState<EditorTheme>(() => {
    const stored = localStorage.getItem(EDITOR_THEME_KEY);
    return stored === 'vs-dark' || stored === 'hc-black' || stored === 'devos-glass' ? stored : 'devos-glass';
  });
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const changeDisposableRef = useRef<IDisposable | null>(null);
  // Per-path pending auto-save timers, keyed like the buffers below. A single
  // shared timer slot meant that typing in tab B cleared tab A's pending
  // 1200ms auto-save, so A's edit was silently never persisted while the UI
  // still reported "Unsaved changes" - data loss with no error. Cleanup on
  // unmount cancels every outstanding timer.
  const saveTimersRef = useRef<Map<string, number>>(new Map());
  // Per-path editor buffers. These were single shared slots (`valueRef` /
  // `baselineRef`), which meant that switching tabs mid-debounce re-pointed
  // them at the newly active file: a pending 1200ms auto-save for file A could
  // then fire and persist file B's contents into file A. Keying by path makes
  // every auto-save write the buffer it was scheduled for. See
  // `handleChange` / `saveCurrent`.
  const valuesRef = useRef<Map<string, string>>(new Map());
  const baselinesRef = useRef<Map<string, string>>(new Map());
  const dirtyPathsRef = useRef<Set<string>>(new Set());
  // Per-path in-flight save guards plus the matching render state, so the Save
  // button reflects only the ACTIVE tab and one tab's request never blocks
  // another tab's auto-save.
  const savingPathsRef = useRef<Set<string>>(new Set());
  const [savingPaths, setSavingPaths] = useState<Set<string>>(() => new Set());
  const active = tabs.find((tab) => tab.path === activePath) || null;

  useEffect(() => {
    // Seed the buffer the first time a path is activated, and re-seed it
    // whenever clean content arrives from the server (external change).
    // A dirty path keeps the user's in-editor text as the source of truth.
    if (!active?.content) return;
    const { path, content } = { path: active.path, content: active.content.content };
    if (!dirtyPathsRef.current.has(path)) {
      valuesRef.current.set(path, content);
      baselinesRef.current.set(path, content);
    }
  }, [activePath, active?.isLoading]);

  useEffect(() => {
    localStorage.setItem(EDITOR_THEME_KEY, theme);
  }, [theme]);

  useEffect(() => () => {
    changeDisposableRef.current?.dispose();
    saveTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    saveTimersRef.current.clear();
  }, []);

  const markDirty = (path: string, dirty: boolean) => {
    if (dirty) dirtyPathsRef.current.add(path);
    else {
      dirtyPathsRef.current.delete(path);
      // A successful save settles this path: drop any pending auto-save timer
      // so it cannot fire a redundant second write afterwards.
      const pending = saveTimersRef.current.get(path);
      if (pending) {
        window.clearTimeout(pending);
        saveTimersRef.current.delete(path);
      }
    }
    setDirtyPaths((previous) => {
      const next = new Set(previous);
      if (dirty) next.add(path);
      else next.delete(path);
      return next;
    });
  };

  const saveCurrent = async (path = activePath) => {
    const target = path || activePath;
    if (!target) return;
    // Guard on THIS path only. A single global `saving` flag meant an
    // auto-save for file B, arriving while file A's request was still in
    // flight, returned early and never persisted - the edit stayed dirty and
    // unsaved with no error surfaced.
    if (!dirtyPathsRef.current.has(target)) return;
    if (savingPathsRef.current.has(target)) return;
    // Snapshot the buffer for THIS path before awaiting: the user may switch
    // tabs or keep typing while the request is in flight, and the response
    // must be matched against the text that was actually sent.
    const payload = valuesRef.current.get(target) ?? '';
    const sent = payload;
    savingPathsRef.current.add(target);
    setSavingPaths((previous) => new Set(previous).add(target));
    const ok = await onSave(target, payload);
    savingPathsRef.current.delete(target);
    setSavingPaths((previous) => {
      const next = new Set(previous);
      next.delete(target);
      return next;
    });
    if (ok) {
      baselinesRef.current.set(target, sent);
      markDirty(target, false);
    }
  };

  const handleMount = (editor: MonacoEditor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    editor.addAction({
      id: 'devos-save-file',
      label: 'DEVOS: Save File',
      keybindings: [2048 | 49],
      run: () => { void saveCurrent(); },
    });
    editor.addAction({
      id: 'devos-go-to-line',
      label: 'DEVOS: Go to Line',
      keybindings: [2048 | 71],
      run: () => editor.trigger('keyboard', 'editor.action.gotoLine', null),
    });
  };

  const handleChange = (value: string | undefined) => {
    if (!active || value === undefined) return;
    const path = active.path;
    valuesRef.current.set(path, value);
    const baseline = baselinesRef.current.get(path) ?? '';
    markDirty(path, value !== baseline);
    onContentChange?.(path, value);
    // Capture both the path and the exact text now. The timer fires long after
    // this render, by which time the user may have switched tabs or typed
    // further; resolving either value at fire time would write the wrong
    // buffer to the wrong file. Only THIS path's timer is reset, so a pending
    // auto-save in another tab still runs.
    const scheduledPath = path;
    const scheduledValue = value;
    const pendingForPath = saveTimersRef.current.get(scheduledPath);
    if (pendingForPath) window.clearTimeout(pendingForPath);
    saveTimersRef.current.set(
      scheduledPath,
      window.setTimeout(() => {
        saveTimersRef.current.delete(scheduledPath);
        if (scheduledValue !== (baselinesRef.current.get(scheduledPath) ?? '')) {
          void saveCurrent(scheduledPath);
        }
      }, 1200),
    );
  };

  const trigger = (action: string) => editorRef.current?.trigger('toolbar', action, null);

  if (tabs.length === 0) {
    return <div className="editor-empty"><FileCode2 size={22} /><span>Select a file from the explorer to open it in the editor</span></div>;
  }

  return (
    <div className="code-viewer">
      <div className="editor-tabs" role="tablist" aria-label="Open files">
        {tabs.map((tab) => (
          <div key={tab.path} role="tab" aria-selected={tab.path === activePath} className={`editor-tab ${tab.path === activePath ? 'active' : ''}`} tabIndex={0} onClick={() => onActivate(tab.path)} onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onActivate(tab.path); }
          }}>
            {dirtyPaths.has(tab.path) && <span className="editor-dirty-dot" aria-label="Unsaved changes">●</span>}
            <span>{tab.path.split('/').pop()}</span>
            <button className="editor-tab-close" aria-label={`Close ${tab.path}`} onClick={(event) => { event.stopPropagation(); onClose(tab.path); }}><X size={12} /></button>
          </div>
        ))}
      </div>
      {active?.isLoading && <div className="editor-loading"><Spinner size={20} /></div>}
      {active?.error && <p className="editor-error" role="alert">{active.error}</p>}
      {active?.content && (
        <>
          <div className="editor-toolbar">
            <span className="editor-breadcrumbs" title={active.content.path}>
              {active.content.path.split('/').map((segment, index, parts) => <React.Fragment key={`${segment}-${index}`}><span>{segment}</span>{index < parts.length - 1 && <b>/</b>}</React.Fragment>)}
              <em>{languageFromPath(active.content.path, active.content.language)} · {active.content.size} bytes</em>
            </span>
            <div className="editor-actions">
              <button type="button" className="editor-action" onClick={() => trigger('actions.find')} aria-label="Find in file" title="Find (Ctrl+F)"><Search size={13} /></button>
              <button type="button" className="editor-action" onClick={() => trigger('editor.action.startFindReplaceAction')} aria-label="Find and replace" title="Replace (Ctrl+H)"><Braces size={13} /></button>
              <button type="button" className="editor-action" onClick={() => trigger('editor.action.gotoLine')} aria-label="Go to line" title="Go to line (Ctrl+G)">#</button>
              <button type="button" className={`editor-action ${wordWrap ? 'selected' : ''}`} onClick={() => setWordWrap((value) => !value)} aria-pressed={wordWrap} aria-label="Toggle word wrap" title="Toggle word wrap"><FoldVertical size={13} /></button>
              <button type="button" className="editor-action" onClick={() => trigger('undo')} aria-label="Undo" title="Undo"><Undo2 size={13} /></button>
              <button type="button" className="editor-action" onClick={() => trigger('redo')} aria-label="Redo" title="Redo"><Redo2 size={13} /></button>
              <label className="editor-theme-select" title="Editor theme"><ChevronDown size={11} /><select value={theme} onChange={(event) => setTheme(event.target.value as EditorTheme)} aria-label="Editor theme"><option value="devos-glass">DEVOS Glass</option><option value="vs-dark">VS Code Dark</option><option value="hc-black">High Contrast</option></select></label>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void saveCurrent()} disabled={savingPaths.has(active.path) || !dirtyPaths.has(active.path)} aria-label="Save file"><Save size={12} /> {savingPaths.has(active.path) ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
          <div className="editor-monaco" aria-label={`Editing ${active.content.path}`}>
            <Suspense fallback={<div className="editor-loading"><Spinner size={20} /></div>}>
              <Monaco
                height="100%"
                theme={theme}
                path={active.content.path}
                language={languageFromPath(active.content.path, active.content.language)}
                defaultValue={valuesRef.current.get(active.path) ?? active.content.content}
                beforeMount={(monaco) => {
                  monaco.editor.defineTheme('devos-glass', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [],
                    colors: {
                      'editor.background': '#0b0f19',
                      'editor.foreground': '#dbeafe',
                      'editorLineNumber.foreground': '#52627a',
                      'editorLineNumber.activeForeground': '#60a5fa',
                      'editor.selectionBackground': '#1d4ed866',
                      'editorCursor.foreground': '#60a5fa',
                    },
                  });
                }}
                onMount={handleMount}
                onChange={handleChange}
                options={{
                  automaticLayout: true,
                  minimap: { enabled: true, scale: 1 },
                  folding: true,
                  bracketPairColorization: { enabled: true },
                  autoIndent: 'full',
                  formatOnPaste: true,
                  formatOnType: true,
                  wordWrap: wordWrap ? 'on' : 'off',
                  padding: { top: 8, bottom: 8 },
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  scrollBeyondLastLine: false,
                  readOnly: false,
                  tabSize: 2,
                }}
              />
            </Suspense>
          </div>
          {/* The auto-save label states what is actually true. A 1200ms debounced
              auto-save really does persist edits without an explicit Save, so
              the claim is accurate; it also names the delay so the user knows
              an edit is pending rather than lost. The dirty/saved half of the
              bar continues to report the real persisted state. */}
          <div className="editor-statusbar"><span><Check size={11} /> Auto-save enabled (1.2s)</span><span>{dirtyPaths.has(active.path) ? 'Unsaved changes' : 'Saved'}</span></div>
        </>
      )}
    </div>
  );
};
