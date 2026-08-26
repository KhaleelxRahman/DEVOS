import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, FileCode2, FilePlus2, Folder, FolderOpen, FolderPlus, RefreshCw, Search, Upload } from 'lucide-react';
import { filesApi } from '../../api';
import { FileNode } from '../../types/file';
import { Spinner } from '../common';
import { useToast } from '../common/Toast';

interface FileExplorerProps {
  projectId: string;
  onSelectFile: (path: string) => void;
  activeFile: string | null;
}

const NAME_RE = /^[^/\\]+$/;

const TreeNode: React.FC<{
  node: FileNode;
  depth: number;
  activeFile: string | null;
  onSelect: (path: string) => void;
}> = ({ node, depth, activeFile, onSelect }) => {
  const [open, setOpen] = useState(depth === 0);
  const isActive = activeFile === node.path;

  if (node.type === 'directory') {
    return (
      <div>
        <button
          className="tree-row"
          style={{ paddingLeft: depth * 12 + 8 }}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {open ? <FolderOpen size={14} /> : <Folder size={14} />}
          <span>{node.name}</span>
        </button>
        {open &&
          node.children?.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} activeFile={activeFile} onSelect={onSelect} />
          ))}
      </div>
    );
  }

  return (
    <button
      className={`tree-row ${isActive ? 'active' : ''}`}
      style={{ paddingLeft: depth * 12 + 24 }}
      onClick={() => onSelect(node.path)}
      aria-current={isActive ? 'true' : undefined}
    >
      <FileCode2 size={14} />
      <span>{node.name}</span>
    </button>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ projectId, onSelectFile, activeFile }) => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await filesApi.getTree(projectId);
      setTree(res.data?.files || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load project files');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setResults(null);
      return;
    }
    try {
      const res = await filesApi.search(projectId, query.trim());
      setResults(res.data?.results || []);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    }
  };

  const promptForName = (kind: 'file' | 'folder'): string | null => {
    const name = window.prompt(`Name of the new ${kind} (created at project root):`);
    if (name === null) return null;
    const trimmed = name.trim();
    if (!trimmed || !NAME_RE.test(trimmed) || trimmed.startsWith('.')) {
      toast(`Invalid ${kind} name. Names cannot be empty, start with a dot, or contain path separators.`, 'error');
      return null;
    }
    return trimmed;
  };

  const createFile = async () => {
    const name = promptForName('file');
    if (!name) return;
    setBusy(true);
    try {
      await filesApi.createFile(projectId, '', name);
      await load();
      onSelectFile(name);
      toast(`Created file ${name}`, 'success');
    } catch (err: any) {
      toast(err.message || 'Could not create file', 'error');
    } finally {
      setBusy(false);
    }
  };

  const createFolder = async () => {
    const name = promptForName('folder');
    if (!name) return;
    setBusy(true);
    try {
      await filesApi.createFolder(projectId, '', name);
      await load();
      toast(`Created folder ${name}`, 'success');
    } catch (err: any) {
      toast(err.message || 'Could not create folder', 'error');
    } finally {
      setBusy(false);
    }
  };

  const uploadFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    if (list.length > 20) {
      toast('Too many files at once (max 20 per batch).', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await filesApi.upload(projectId, '', Array.from(list));
      const uploaded = res.data?.uploaded || [];
      const errors = res.data?.errors || [];
      if (uploaded.length > 0) {
        await load();
        toast(`Uploaded ${uploaded.length} file(s)`, 'success');
        onSelectFile(uploaded[0]);
      }
      if (errors.length > 0) {
        toast(`Some files were rejected: ${errors.join('; ')}`, 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <input
          type="search"
          className="input"
          placeholder="Search files..."
          value={query}
          aria-label="Search files"
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value) setResults(null);
          }}
          style={{ flex: 1, fontSize: 12, padding: '4px 8px' }}
        />
        <button type="submit" className="btn btn-secondary btn-sm" aria-label="Search">
          <Search size={12} />
        </button>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="New file, folder, or upload"
            disabled={busy}
            onClick={() => setMenuOpen((v) => !v)}
          >
            +
          </button>
          {menuOpen && (
            <div role="menu" style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50,
              backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', minWidth: 150, padding: 4,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              <button type="button" role="menuitem" className="tree-row" onClick={() => { setMenuOpen(false); void createFile(); }}>
                <FilePlus2 size={14} /> <span>New File</span>
              </button>
              <button type="button" role="menuitem" className="tree-row" onClick={() => { setMenuOpen(false); void createFolder(); }}>
                <FolderPlus size={14} /> <span>New Folder</span>
              </button>
              <button type="button" role="menuitem" className="tree-row" onClick={() => { setMenuOpen(false); fileInputRef.current?.click(); }}>
                <Upload size={14} /> <span>Upload Files</span>
              </button>
            </div>
          )}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={load} aria-label="Refresh tree">
          <RefreshCw size={12} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => void uploadFiles(e.target.files)}
        />
      </form>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
            <Spinner size={18} />
          </div>
        )}
        {error && <p style={{ color: 'var(--color-error)', fontSize: 12 }} role="alert">{error}</p>}
        {!isLoading && !error && results !== null && (
          results.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>No matches for "{query}"</p>
          ) : (
            results.map((path) => (
              <button key={path} className="tree-row" style={{ paddingLeft: 8 }} onClick={() => onSelectFile(path)}>
                <FileCode2 size={14} />
                <span>{path}</span>
              </button>
            ))
          )
        )}
        {!isLoading && !error && results === null && tree.length === 0 && (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
            <p style={{ margin: 0 }}>This project has no files yet. Start with one of these:</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void createFile()} disabled={busy}>
              <FilePlus2 size={12} /> Create a file
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void createFolder()} disabled={busy}>
              <FolderPlus size={12} /> Create a folder
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={busy}>
              <Upload size={12} /> Upload files
            </button>
            <p style={{ margin: 0, fontSize: 11 }}>
              Uploading copies files you pick from your computer into this project — DEVOS cannot browse your
              device. Max 10MB per file; executable formats are blocked. To bring in a whole folder tree,
              import it via Git instead.
            </p>
          </div>
        )}
        {!isLoading && !error && results === null &&
          tree.map((node) => (
            <TreeNode key={node.path} node={node} depth={0} activeFile={activeFile} onSelect={onSelectFile} />
          ))}
      </div>
    </div>
  );
};
