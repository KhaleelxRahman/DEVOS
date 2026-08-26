import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, FileCode2, Folder, FolderOpen, RefreshCw, Search } from 'lucide-react';
import { filesApi } from '../../api';
import { FileNode } from '../../types/file';
import { Spinner } from '../common';

interface FileExplorerProps {
  projectId: string;
  onSelectFile: (path: string) => void;
  activeFile: string | null;
}

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
        <button type="button" className="btn btn-secondary btn-sm" onClick={load} aria-label="Refresh tree">
          <RefreshCw size={12} />
        </button>
      </form>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
            <Spinner size={18} />
          </div>
        )}
        {error && <p style={{ color: 'var(--color-error)', fontSize: 12 }}>{error}</p>}
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
          <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
            Project workspace is empty. Files appear here once the project repository is populated.
          </p>
        )}
        {!isLoading && !error && results === null &&
          tree.map((node) => (
            <TreeNode key={node.path} node={node} depth={0} activeFile={activeFile} onSelect={onSelectFile} />
          ))}
      </div>
    </div>
  );
};
