import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  Search,
  X,
} from 'lucide-react';
import { filesApi } from '../../api';
import { Spinner } from '../common';
import { useToast } from '../common/Toast';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  updated_at?: string;
  children?: FileNode[];
}

interface ProfessionalFileExplorerProps {
  projectId: string;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}

export const ProfessionalFileExplorer: React.FC<ProfessionalFileExplorerProps> = ({
  projectId,
  activeFile,
  onSelectFile,
}) => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'src/components', 'src/pages']));
  const [newFileInputPath, setNewFileInputPath] = useState<string | null>(null);
  const [newFolderNameInput, setNewFolderNameInput] = useState<string | null>(null);
  const [itemName, setItemName] = useState<string>('');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  const { toast } = useToast();

  const fetchTree = async () => {
    setIsLoading(true);
    try {
      const res = await filesApi.getTree(projectId);
      if (res.success && res.data?.files) {
        setTree(res.data.files);
      }
    } catch (err: any) {
      toast(err.message || 'Failed to load file tree', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, [projectId]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return <FileCode size={14} color="#3b82f6" />;
      case 'js':
      case 'jsx':
        return <FileCode size={14} color="#f59e0b" />;
      case 'json':
        return <FileJson size={14} color="#10b981" />;
      case 'css':
        return <FileCode size={14} color="#38bdf8" />;
      case 'md':
        return <FileText size={14} color="#94a3b8" />;
      default:
        return <FileText size={14} color="var(--color-text-muted)" />;
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    const targetPath = newFileInputPath ? `${newFileInputPath}/${itemName.trim()}` : itemName.trim();
    try {
      await filesApi.createFile(projectId, targetPath, '// Created with DEVOS v1.0.0\n');
      toast(`Created file ${targetPath}`, 'success');
      setItemName('');
      setNewFileInputPath(null);
      await fetchTree();
      onSelectFile(targetPath);
    } catch (err: any) {
      toast(err.message || 'Failed to create file', 'error');
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    const parentPath = newFolderNameInput || '';
    const name = itemName.trim();
    try {
      await filesApi.createFolder(projectId, parentPath, name);
      toast(`Created folder ${parentPath ? `${parentPath}/${name}` : name}`, 'success');
      setItemName('');
      setNewFolderNameInput(null);
      await fetchTree();
    } catch (err: any) {
      toast(err.message || 'Failed to create folder', 'error');
    }
  };

  const handleDelete = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await filesApi.deleteEntry(projectId, path);
      toast(`Deleted ${path}`, 'info');
      await fetchTree();
    } catch (err: any) {
      toast(err.message || 'Failed to delete file', 'error');
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingPath || !renameValue.trim()) return;
    try {
      await filesApi.rename(projectId, renamingPath, renameValue.trim());
      toast('Renamed successfully', 'success');
      setRenamingPath(null);
      setRenameValue('');
      await fetchTree();
    } catch (err: any) {
      toast(err.message || 'Failed to rename', 'error');
    }
  };

  const renderNode = (node: FileNode, depth = 0) => {
    const isFolder = node.type === 'directory';
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = activeFile === node.path;
    const isRenaming = renamingPath === node.path;

    return (
      <div key={node.path} style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.path);
            } else {
              onSelectFile(node.path);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '3px 6px',
            paddingLeft: `${depth * 14 + 6}px`,
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
            color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)',
            fontSize: '12px',
            userSelect: 'none',
            transition: 'background 120ms ease',
          }}
          className="file-tree-row"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, overflow: 'hidden' }}>
            {isFolder ? (
              <>
                {isExpanded ? <ChevronDown size={12} color="var(--color-text-muted)" /> : <ChevronRight size={12} color="var(--color-text-muted)" />}
                {isExpanded ? <FolderOpen size={14} color="#60a5fa" /> : <Folder size={14} color="#60a5fa" />}
              </>
            ) : (
              getFileIcon(node.name)
            )}

            {isRenaming ? (
              <form onSubmit={handleRename} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flex: 1 }}>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                  onBlur={() => setRenamingPath(null)}
                  style={{
                    width: '100%',
                    fontSize: '11px',
                    padding: '1px 4px',
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-accent)',
                    color: '#fff',
                    borderRadius: 2,
                  }}
                />
              </form>
            ) : (
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                {node.name}
              </span>
            )}
          </div>

          {/* Row Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="file-actions">
            {isFolder && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNewFileInputPath(node.path);
                  setItemName('');
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2 }}
                title="New file in folder"
              >
                <FilePlus size={11} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRenamingPath(node.path);
                setRenameValue(node.name);
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2 }}
              title="Rename"
            >
              <Edit2 size={11} />
            </button>
            <button
              onClick={(e) => handleDelete(node.path, e)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2 }}
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        {/* Children Render */}
        {isFolder && isExpanded && node.children && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query.trim()) return nodes;
    const lower = query.toLowerCase();
    const result: FileNode[] = [];
    for (const node of nodes) {
      if (node.name.toLowerCase().includes(lower)) {
        result.push(node);
      } else if (node.type === 'directory' && node.children) {
        const filteredChildren = filterTree(node.children, query);
        if (filteredChildren.length > 0) {
          result.push({
            ...node,
            children: filteredChildren,
          });
        }
      }
    }
    return result;
  };

  const displayedTree = useMemo(() => filterTree(tree, searchQuery), [tree, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}>
      {/* Explorer Top Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-elevated)',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
          EXPLORER
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => {
              setNewFileInputPath('');
              setItemName('');
            }}
            title="New File at Root"
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 2 }}
          >
            <FilePlus size={14} />
          </button>
          <button
            onClick={() => {
              setNewFolderNameInput('');
              setItemName('');
            }}
            title="New Folder at Root"
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 2 }}
          >
            <FolderPlus size={14} />
          </button>
          <button
            onClick={fetchTree}
            title="Refresh Tree"
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 2 }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Search Input Field */}
      <div style={{ padding: '4px 8px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-background)', borderRadius: 4, padding: '2px 6px', border: '1px solid var(--color-border)' }}>
          <Search size={11} color="var(--color-text-muted)" style={{ marginRight: 4, flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files..."
            style={{
              width: '100%',
              fontSize: '11px',
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-primary)',
              outline: 'none',
              padding: '2px 0',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0 }}
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* New File Inline Form */}
      {newFileInputPath !== null && (
        <form onSubmit={handleCreateFile} style={{ padding: '6px 8px', background: 'var(--color-surface-elevated)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '10px', color: 'var(--color-accent)', marginBottom: 2 }}>
            New file in: {newFileInputPath || 'root'}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="text"
              placeholder="filename.tsx"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                fontSize: '11px',
                padding: '2px 6px',
                background: 'var(--color-background)',
                border: '1px solid var(--color-accent)',
                borderRadius: 2,
                color: '#fff',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <button
              type="submit"
              style={{ background: 'var(--color-accent)', border: 'none', color: '#fff', fontSize: '10px', borderRadius: 2, padding: '2px 6px', cursor: 'pointer' }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setNewFileInputPath(null)}
              style={{ background: 'transparent', border: '1px solid var(--color-border)', color: '#fff', fontSize: '10px', borderRadius: 2, padding: '2px 6px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* New Folder Inline Form */}
      {newFolderNameInput !== null && (
        <form onSubmit={handleCreateFolder} style={{ padding: '6px 8px', background: 'var(--color-surface-elevated)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '10px', color: '#60a5fa', marginBottom: 2 }}>
            New folder in: {newFolderNameInput || 'root'}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="text"
              placeholder="folder-name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                fontSize: '11px',
                padding: '2px 6px',
                background: 'var(--color-background)',
                border: '1px solid #60a5fa',
                borderRadius: 2,
                color: '#fff',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <button
              type="submit"
              style={{ background: '#60a5fa', border: 'none', color: '#fff', fontSize: '10px', borderRadius: 2, padding: '2px 6px', cursor: 'pointer' }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setNewFolderNameInput(null)}
              style={{ background: 'transparent', border: '1px solid var(--color-border)', color: '#fff', fontSize: '10px', borderRadius: 2, padding: '2px 6px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* File Tree List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 6 }}>
            <Spinner size={14} />
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Loading files…</span>
          </div>
        ) : displayedTree.length === 0 ? (
          <div style={{ padding: '12px', fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            {searchQuery ? 'No files match your filter.' : 'No files in project yet.'}
          </div>
        ) : (
          displayedTree.map((node) => renderNode(node, 0))
        )}
      </div>
    </div>
  );
};
