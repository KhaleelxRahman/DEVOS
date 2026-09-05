import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown, ChevronRight, FileCode2, FileJson, FilePlus2, FileText, Folder,
  FolderOpen, FolderPlus, Image, MoreHorizontal, RefreshCw, Search, Trash2, Upload,
} from 'lucide-react';
import { filesApi } from '../../api';
import { FileNode } from '../../types/file';
import { Spinner } from '../common';
import { useToast } from '../common/Toast';

interface FileExplorerProps {
  projectId: string;
  onSelectFile: (path: string) => void;
  activeFile: string | null;
  refreshToken?: number;
  onPathRenamed?: (oldPath: string, newPath: string) => void;
  onPathDeleted?: (path: string) => void;
}

const NAME_RE = /^[^/\\]+$/;
const expandedKey = (projectId: string) => `devos_explorer_expanded_${projectId}`;

const fileIcon = (node: FileNode) => {
  const extension = (node.extension || node.name.split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(extension)) return <Image size={14} />;
  if (['json', 'jsonc'].includes(extension)) return <FileJson size={14} />;
  if (['md', 'txt', 'pdf'].includes(extension)) return <FileText size={14} />;
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'html', 'css'].includes(extension)) return <FileCode2 size={14} />;
  return <FileText size={14} />;
};

const parentPath = (path: string) => {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/');
};

const TreeNode: React.FC<{
  node: FileNode;
  depth: number;
  activeFile: string | null;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onContextMenu: (event: React.MouseEvent, node: FileNode) => void;
  onDrop: (event: React.DragEvent, node: FileNode) => void;
}> = ({ node, depth, activeFile, expanded, onToggle, onSelect, onContextMenu, onDrop }) => {
  const isDirectory = node.type === 'directory';
  const isOpen = expanded.has(node.path);
  const isActive = activeFile === node.path;
  return (
    <div role={isDirectory ? 'group' : undefined}>
      <button
        className={`tree-row ${isActive ? 'active' : ''} ${isDirectory && isOpen ? 'expanded' : ''}`}
        style={{ paddingLeft: depth * 12 + (isDirectory ? 8 : 24) }}
        onClick={() => isDirectory ? onToggle(node.path) : onSelect(node.path)}
        onContextMenu={(event) => onContextMenu(event, node)}
        draggable
        onDragStart={(event) => event.dataTransfer.setData('text/plain', node.path)}
        onDragOver={(event) => { if (isDirectory) event.preventDefault(); }}
        onDrop={(event) => onDrop(event, node)}
        aria-expanded={isDirectory ? isOpen : undefined}
        aria-current={isActive ? 'true' : undefined}
        title={node.path}
      >
        {isDirectory && (isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
        {isDirectory ? (isOpen ? <FolderOpen size={14} /> : <Folder size={14} />) : fileIcon(node)}
        <span>{node.name}</span>
      </button>
      {isDirectory && isOpen && node.children?.map((child) => (
        <TreeNode key={child.path} node={child} depth={depth + 1} activeFile={activeFile} expanded={expanded} onToggle={onToggle} onSelect={onSelect} onContextMenu={onContextMenu} onDrop={onDrop} />
      ))}
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ projectId, onSelectFile, activeFile, refreshToken, onPathRenamed, onPathDeleted }) => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(expandedKey(projectId)) || '[]')); } catch { return new Set(); }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [context, setContext] = useState<{ x: number; y: number; node: FileNode } | null>(null);
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

  useEffect(() => { void load(); }, [load, refreshToken]);
  useEffect(() => {
    localStorage.setItem(expandedKey(projectId), JSON.stringify([...expanded]));
  }, [expanded, projectId]);
  useEffect(() => {
    const close = () => { setMenuOpen(false); setContext(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggleExpanded = (path: string) => setExpanded((previous) => {
    const next = new Set(previous);
    if (next.has(path)) next.delete(path); else next.add(path);
    return next;
  });

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) { setResults(null); return; }
    try {
      const res = await filesApi.search(projectId, query.trim());
      setResults(res.data?.results || []);
    } catch (err: any) { setError(err.message || 'Search failed'); }
  };

  const promptForName = (kind: 'file' | 'folder', initial = ''): string | null => {
    const name = window.prompt(`Name of the new ${kind}:`, initial);
    if (name === null) return null;
    const trimmed = name.trim();
    if (!trimmed || !NAME_RE.test(trimmed) || trimmed.startsWith('.')) {
      toast(`Invalid ${kind} name.`, 'error');
      return null;
    }
    return trimmed;
  };

  const createFile = async (parent = '') => {
    const name = promptForName('file');
    if (!name) return;
    setBusy(true);
    try { await filesApi.createFile(projectId, parent, name); await load(); onSelectFile(`${parent ? `${parent}/` : ''}${name}`); toast(`Created file ${name}`, 'success'); }
    catch (err: any) { toast(err.message || 'Could not create file', 'error'); }
    finally { setBusy(false); }
  };

  const createFolder = async (parent = '') => {
    const name = promptForName('folder');
    if (!name) return;
    setBusy(true);
    try { await filesApi.createFolder(projectId, parent, name); await load(); toast(`Created folder ${name}`, 'success'); }
    catch (err: any) { toast(err.message || 'Could not create folder', 'error'); }
    finally { setBusy(false); }
  };

  const rename = async (node: FileNode) => {
    const name = promptForName(node.type === 'directory' ? 'folder' : 'file', node.name);
    if (!name || name === node.name) return;
    setBusy(true);
    try {
      const response = await filesApi.rename(projectId, node.path, name);
      const nextPath = response.data?.path || `${parentPath(node.path) ? `${parentPath(node.path)}/` : ''}${name}`;
      await load();
      onPathRenamed?.(node.path, nextPath);
      toast(`Renamed ${node.name}`, 'success');
    } catch (err: any) { toast(err.message || 'Rename failed', 'error'); }
    finally { setBusy(false); }
  };

  const remove = async (node: FileNode) => {
    if (!window.confirm(`Delete ${node.type === 'directory' ? 'folder' : 'file'} "${node.name}"?`)) return;
    setBusy(true);
    try { await filesApi.deleteEntry(projectId, node.path); await load(); onPathDeleted?.(node.path); toast(`Deleted ${node.name}`, 'success'); }
    catch (err: any) { toast(err.message || 'Delete failed', 'error'); }
    finally { setBusy(false); }
  };

  const move = async (source: string, destination: FileNode) => {
    if (destination.type !== 'directory' || source === destination.path) return;
    setBusy(true);
    try { const response = await filesApi.move(projectId, source, destination.path); await load(); onPathRenamed?.(source, response.data?.path || `${destination.path}/${source.split('/').pop()}`); toast('Moved item', 'success'); }
    catch (err: any) { toast(err.message || 'Move failed', 'error'); }
    finally { setBusy(false); }
  };

  const uploadFiles = async (list: FileList | null) => {
    if (!list || !list.length) return;
    setBusy(true);
    try {
      const response = await filesApi.upload(projectId, '', Array.from(list));
      if (response.data?.uploaded?.length) { await load(); onSelectFile(response.data.uploaded[0]); toast(`Uploaded ${response.data.uploaded.length} file(s)`, 'success'); }
      if (response.data?.errors?.length) toast(`Some files were rejected: ${response.data.errors.join('; ')}`, 'error');
    } catch (err: any) { toast(err.message || 'Upload failed', 'error'); }
    finally { setBusy(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  return (
    <div className="file-explorer">
      <form className="explorer-toolbar" onSubmit={handleSearch}>
        <input type="search" className="input" placeholder="Search files..." value={query} aria-label="Search files" onChange={(event) => { setQuery(event.target.value); if (!event.target.value) setResults(null); }} />
        <button type="submit" className="btn btn-secondary btn-sm" aria-label="Search"><Search size={12} /></button>
        <div className="explorer-menu-anchor" ref={menuRef}>
          <button type="button" className="btn btn-primary btn-sm" aria-label="New file, folder, or upload" aria-expanded={menuOpen} disabled={busy} onClick={() => setMenuOpen((value) => !value)}>+</button>
          {menuOpen && <div className="explorer-menu" role="menu" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" role="menuitem" className="tree-row" onClick={() => { setMenuOpen(false); void createFile(); }}><FilePlus2 size={14} /> New File</button>
            <button type="button" role="menuitem" className="tree-row" onClick={() => { setMenuOpen(false); void createFolder(); }}><FolderPlus size={14} /> New Folder</button>
            <button type="button" role="menuitem" className="tree-row" onClick={() => { setMenuOpen(false); fileInputRef.current?.click(); }}><Upload size={14} /> Upload</button>
          </div>}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()} aria-label="Refresh tree"><RefreshCw size={12} /></button>
        <input ref={fileInputRef} type="file" multiple hidden tabIndex={-1} onChange={(event) => void uploadFiles(event.target.files)} />
      </form>
      <div className="explorer-tree" role="tree" aria-label="Project files">
        {isLoading && <div className="explorer-empty"><Spinner size={18} /></div>}
        {error && <p className="explorer-error" role="alert">{error}</p>}
        {!isLoading && !error && results !== null && (results.length ? results.map((path) => <button key={path} className="tree-row" onClick={() => onSelectFile(path)}>{fileIcon({ name: path.split('/').pop() || path, path, type: 'file' })}<span>{path}</span></button>) : <p className="explorer-empty">No matches for “{query}”</p>)}
        {!isLoading && !error && results === null && tree.map((node) => <TreeNode key={node.path} node={node} depth={0} activeFile={activeFile} expanded={expanded} onToggle={toggleExpanded} onSelect={onSelectFile} onContextMenu={(event, item) => { event.preventDefault(); setContext({ x: event.clientX, y: event.clientY, node: item }); }} onDrop={(event, item) => { event.preventDefault(); const source = event.dataTransfer.getData('text/plain'); if (source) void move(source, item); }} />)}
        {!isLoading && !error && results === null && tree.length === 0 && <div className="explorer-empty">No files yet. Use + to create or upload one.</div>}
      </div>
      {context && <div className="explorer-context-menu" role="menu" style={{ left: context.x, top: context.y }} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" role="menuitem" onClick={() => { setContext(null); if (context.node.type === 'file') onSelectFile(context.node.path); }}><FileCode2 size={13} /> Open</button>
        {context.node.type === 'directory' && <><button type="button" role="menuitem" onClick={() => { const node = context.node; setContext(null); void createFile(node.path); }}><FilePlus2 size={13} /> New File</button><button type="button" role="menuitem" onClick={() => { const node = context.node; setContext(null); void createFolder(node.path); }}><FolderPlus size={13} /> New Folder</button></>}
        <button type="button" role="menuitem" onClick={() => { const node = context.node; setContext(null); void rename(node); }}><MoreHorizontal size={13} /> Rename</button>
        <button type="button" role="menuitem" className="danger" onClick={() => { const node = context.node; setContext(null); void remove(node); }}><Trash2 size={13} /> Delete</button>
      </div>}
    </div>
  );
};
