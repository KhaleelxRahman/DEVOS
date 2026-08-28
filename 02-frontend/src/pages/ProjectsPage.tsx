import React, { useEffect, useState } from 'react';
import { Plus, FolderGit2, ArrowRight, Trash2 } from 'lucide-react';
import { Card, Button, Input, Modal, EmptyState, Badge, Spinner } from '../components/common';
import { Project } from '../types/project';
import { projectsApi } from '../api';
import { useProject } from '../hooks/useProject';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import { useSeo } from '../hooks/useSeo';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { setActiveProject } = useProject();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  useSeo({ title: 'Projects', description: 'Your DEVOS v1.0.0 projects.', noindex: true });

  useEffect(() => {
    projectsApi.list()
      .then((res) => {
        if (res.success && res.data?.projects) {
          setProjects(res.data.projects);
        }
      })
      .catch((err) => setLoadError(err.message || 'Unable to load projects'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await projectsApi.create({ name, description });
      if (res.success && res.data) {
        setProjects((prev) => [res.data!, ...prev]);
        setActiveProject(res.data);
        setIsModalOpen(false);
        setName('');
        setDescription('');
        navigate('/app/workspace');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenProject = (project: Project) => {
    setActiveProject(project);
    navigate('/app/workspace');
  };

  const handleDelete = async (project: Project) => {
    const confirmed = window.confirm(
      `Delete project "${project.name}"? This permanently removes its workspace files, conversations, and activity. This cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(project.id);
    try {
      await projectsApi.delete(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      toast(`Deleted project "${project.name}"`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to delete project', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Projects</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            Manage and organize your development workspaces.
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
          Create Project
        </Button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <Spinner size={32} />
        </div>
      ) : loadError ? (
        <EmptyState
          icon={<FolderGit2 size={40} />}
          title="Unable to load projects"
          description={loadError}
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 size={40} />}
          title="No projects yet"
          description="Create your first DEVOS v1.0.0 project to connect repository files, start the terminal, and enable context-aware AI."
          actionLabel="Create Project"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {projects.map((project) => (
            <Card
              key={project.id}
              title={project.name}
              subtitle={new Date(project.created_at).toLocaleDateString()}
              action={<Badge variant="default">{project.default_branch || 'main'}</Badge>}
            >
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', minHeight: 40 }}>
                {project.description || 'No description provided.'}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  rightIcon={<ArrowRight size={14} />}
                  onClick={() => handleOpenProject(project)}
                >
                  Open Workspace
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete project ${project.name}`}
                  isLoading={deletingId === project.id}
                  onClick={() => handleDelete(project)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Project"
        description="Initialize a dedicated development workspace context."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} isLoading={isSubmitting}>
              Create Project
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <Input
            label="Project Name"
            placeholder="e.g. Sentinel API"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Description (Optional)"
            placeholder="Brief explanation of project domain or tech stack"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
};
