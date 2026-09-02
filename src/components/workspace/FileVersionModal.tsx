import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { fileHistoryApi } from '../../api';
import { FileVersion } from '../../types/auth';
import { useToast } from '../common/Toast';
import {
  RotateCcw,
  Clock,
} from 'lucide-react';

interface FileVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  filePath: string;
  onRestoreComplete?: (restoredContent: string) => void;
}

export const FileVersionModal: React.FC<FileVersionModalProps> = ({
  isOpen,
  onClose,
  projectId,
  filePath,
  onRestoreComplete,
}) => {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<FileVersion | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const { toast } = useToast();

  const loadHistory = async () => {
    if (!projectId || !filePath) return;
    try {
      const res = await fileHistoryApi.getHistory(projectId, filePath);
      if (res.success && res.data?.versions) {
        setVersions(res.data.versions);
        if (res.data.versions.length > 0) {
          setSelectedVersion(res.data.versions[0]);
        }
      }
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, projectId, filePath]);

  const handleRestore = async (version: FileVersion) => {
    setIsRestoring(true);
    try {
      const res = await fileHistoryApi.restoreVersion(projectId, filePath, version.id);
      if (res.success && res.data) {
        toast(`Restored version from ${new Date(version.created_at).toLocaleTimeString()}`, 'success');
        if (onRestoreComplete) {
          onRestoreComplete(res.data.content);
        }
        onClose();
      } else {
        toast('Failed to restore file version', 'error');
      }
    } catch {
      toast('Failed to restore version', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Version History — ${filePath}`}
      subtitle="Inspect previous cloud file revisions and restore earlier snapshots."
      size="lg"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 'var(--space-4)', minHeight: '360px' }}>
        {/* Version List Sidebar */}
        <div
          style={{
            borderRight: '1px solid var(--color-border)',
            paddingRight: 'var(--space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          {versions.length === 0 ? (
            <div style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
              No version history available for this file.
            </div>
          ) : (
            versions.map((ver, idx) => {
              const isSelected = selectedVersion?.id === ver.id;
              return (
                <div
                  key={ver.id}
                  onClick={() => setSelectedVersion(ver)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--color-surface-elevated)' : 'transparent',
                    border: isSelected ? '1px solid var(--color-accent)' : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                      {idx === 0 ? 'Current Version' : `Revision #${versions.length - idx}`}
                    </span>
                    <Badge variant={idx === 0 ? 'success' : 'default'} size="sm">
                      {ver.size} B
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    <Clock size={10} />
                    <span>{new Date(ver.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Version Preview & Restore Button */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          {selectedVersion ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Created by <strong>{selectedVersion.created_by}</strong> at{' '}
                  {new Date(selectedVersion.created_at).toLocaleString()}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  loading={isRestoring}
                  onClick={() => handleRestore(selectedVersion)}
                  leftIcon={<RotateCcw size={13} />}
                >
                  Restore This Snapshot
                </Button>
              </div>

              <div
                style={{
                  flex: 1,
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  color: 'var(--color-text-primary)',
                  overflow: 'auto',
                  maxHeight: '300px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedVersion.content}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
              Select a version from the left panel to inspect code.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
