import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useProject } from '../../hooks/useProject';
import { collaborationApi } from '../../api';
import { ProjectMember, ProjectComment } from '../../types/auth';
import { useToast } from '../common/Toast';
import {
  Users,
  UserPlus,
  MessageSquare,
  Trash2,
  Send,
  Radio,
} from 'lucide-react';

export const TeamCollaborationModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { activeProject } = useProject();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'members' | 'comments'>('members');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCollaborationData = async () => {
    if (!activeProject) return;
    try {
      const [membersRes, commentsRes] = await Promise.all([
        collaborationApi.getMembers(activeProject.id),
        collaborationApi.getComments(activeProject.id),
      ]);
      if (membersRes.success && membersRes.data?.members) {
        setMembers(membersRes.data.members);
      }
      if (commentsRes.success && commentsRes.data?.comments) {
        setComments(commentsRes.data.comments);
      }
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    if (isOpen && activeProject) {
      loadCollaborationData();
    }
  }, [isOpen, activeProject]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !inviteEmail.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await collaborationApi.inviteMember(activeProject.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      if (res.success && res.data?.member) {
        setMembers((prev) => [...prev, res.data!.member]);
        setInviteEmail('');
        toast(`Invitation sent to ${inviteEmail.trim()} as ${inviteRole}`, 'success');
      } else {
        toast((res as any).error?.message || 'Failed to invite member', 'error');
      }
    } catch {
      toast('Failed to invite member', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeProject) return;
    try {
      const res = await collaborationApi.removeMember(activeProject.id, memberId);
      if (res.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        toast('Member removed from project', 'info');
      }
    } catch {
      toast('Failed to remove member', 'error');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await collaborationApi.addComment(activeProject.id, {
        comment: newComment.trim(),
      });
      if (res.success && res.data?.comment) {
        setComments((prev) => [res.data!.comment, ...prev]);
        setNewComment('');
        toast('Comment posted to project team', 'success');
      }
    } catch {
      toast('Failed to post comment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Team Collaboration &amp; Real-Time Presence"
      subtitle={activeProject ? `Project: ${activeProject.name}` : 'Manage team members and shared project permissions'}
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeTab === 'members' ? 'var(--color-surface-elevated)' : 'transparent',
              color: activeTab === 'members' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: 700,
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
            }}
          >
            <Users size={14} /> Team Members ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeTab === 'comments' ? 'var(--color-surface-elevated)' : 'transparent',
              color: activeTab === 'comments' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: 700,
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
            }}
          >
            <MessageSquare size={14} /> Discussions ({comments.length})
          </button>
        </div>

        {activeTab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Invite New Member Form */}
            <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-sm)',
                }}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer',
                }}
              >
                <option value="editor">Editor (Can edit &amp; build)</option>
                <option value="admin">Admin (Full project control)</option>
                <option value="viewer">Viewer (Read-only)</option>
              </select>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isSubmitting}
                leftIcon={<UserPlus size={14} />}
              >
                Invite
              </Button>
            </form>

            {/* Member List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: member.is_online ? '#10b981' : '#64748b',
                          border: '1px solid var(--color-surface)',
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {member.name}
                        </span>
                        {member.is_online && (
                          <span style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Radio size={10} /> Online
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {member.email}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Badge variant={member.role === 'owner' ? 'accent' : 'default'}>
                      {member.role.toUpperCase()}
                    </Badge>
                    {member.role !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-muted)',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Add a team note or code comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-sm)',
                }}
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isSubmitting}
                rightIcon={<Send size={14} />}
              >
                Post
              </Button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '280px', overflowY: 'auto' }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                  No comments yet. Start a discussion with your team!
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-accent)' }}>
                        {c.user_name}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        {new Date(c.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-primary)' }}>
                      {c.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
