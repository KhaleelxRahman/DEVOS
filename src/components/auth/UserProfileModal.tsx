import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import {
  User as UserIcon,
  HardDrive,
  Github,
  LogOut,
  Save,
} from 'lucide-react';

export const UserProfileModal: React.FC = () => {
  const { user, showProfileModal, closeProfileModal, updateProfile, logout, openAuthModal } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [githubUsername, setGithubUsername] = useState(user?.github_username || '');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setGithubUsername(user.github_username || '');
    }
  }, [user, showProfileModal]);

  if (!user || !showProfileModal) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await updateProfile({
        name: name.trim(),
        github_username: githubUsername.trim() || null,
      });
      if (res.success) {
        toast('Profile updated successfully', 'success');
        closeProfileModal();
      } else {
        toast(res.error || 'Failed to update profile', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast('Logged out of DEVOS', 'info');
    closeProfileModal();
  };

  const handleSwitchAccount = async () => {
    await logout();
    closeProfileModal();
    openAuthModal('login');
  };

  const storageUsed = user.storage_used_bytes || 1.8 * 1024 * 1024;
  const storageLimit = user.storage_limit_bytes || 500 * 1024 * 1024;
  const storagePercent = Math.min(100, Math.round((storageUsed / storageLimit) * 100));

  return (
    <Modal
      isOpen={showProfileModal}
      onClose={closeProfileModal}
      title="User Account &amp; Workspace Profile"
      subtitle="Manage your personal details, storage quota, and account security."
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Header Avatar & Identity */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
            padding: '16px',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {user.name}
              </h3>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: 'var(--color-accent)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {user.role || 'Developer'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {user.email}
            </p>
          </div>
        </div>

        {/* Quota & Usage Bar */}
        <div
          style={{
            padding: '14px',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)' }}>
            <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <HardDrive size={14} color="var(--color-accent)" /> Cloud Workspace Storage
            </span>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {(storageUsed / (1024 * 1024)).toFixed(1)} MB / {(storageLimit / (1024 * 1024)).toFixed(0)} MB
            </span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'var(--color-surface-elevated)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                width: `${storagePercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                borderRadius: 3,
              }}
            />
          </div>
        </div>

        {/* Edit Details Form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: 4,
              }}
            >
              Display Name
            </label>
            <div style={{ position: 'relative' }}>
              <UserIcon
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                }}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: 4,
              }}
            >
              GitHub Username
            </label>
            <div style={{ position: 'relative' }}>
              <Github
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="e.g. octocat"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSwitchAccount}
              >
                Switch Account
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut size={14} />}
              >
                Sign Out
              </Button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSaving}
              leftIcon={<Save size={14} />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
