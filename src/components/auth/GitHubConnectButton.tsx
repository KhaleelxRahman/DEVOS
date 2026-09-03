import React, { useEffect, useState } from 'react';
import { Github, Unplug } from 'lucide-react';
import { Button } from '../common';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';

export const GitHubConnectButton: React.FC<{ fullWidth?: boolean }> = ({ fullWidth = false }) => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/v1/auth/github/status', {
          headers: { Authorization: `Bearer ${localStorage.getItem('devos_token')}` }
        });
        const data = await res.json();
        if (data.success) {
          setConnected(data.data.connected);
          setUsername(data.data.username);
        }
      } catch (err) {
        console.error('Failed to fetch github status', err);
      }
    };
    if (user) {
      fetchStatus();
    }
  }, [user]);

  const handleConnect = () => {
    window.location.href = '/api/v1/auth/github';
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/v1/auth/github/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('devos_token')}` }
      });
      if (res.ok) {
        setConnected(false);
        setUsername(null);
        toast('Disconnected from GitHub', 'success');
      }
    } catch (err) {
      toast('Failed to disconnect', 'error');
    }
  };

  if (connected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', width: fullWidth ? '100%' : 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Github size={20} color="var(--color-text-primary)" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Connected to GitHub</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>@{username}</div>
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={handleDisconnect} leftIcon={<Unplug size={14} />}>Disconnect</Button>
      </div>
    );
  }

  return (
    <Button variant="primary" style={{ width: fullWidth ? '100%' : 'auto', background: '#24292e', color: '#fff', border: 'none' }} onClick={handleConnect} leftIcon={<Github size={16} />}>
      Connect with GitHub
    </Button>
  );
};
