import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Spinner } from '../components/common';
import { useToast } from '../components/common/Toast';
import { projectsApi } from '../api';
import { useProject } from '../hooks/useProject';
import { useSeo } from '../hooks/useSeo';

/**
 * Deep-link handler for /app/projects/:projectId (BUG-002).
 * Loads the project and opens the workspace, or recovers gracefully
 * when the project no longer exists (404): clears the stale reference
 * and returns the user to the project list with a friendly message.
 */
export const ProjectDetailPage: React.FC = () => {
  useSeo({ title: 'Project', noindex: true });

  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { setActiveProject } = useProject();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      navigate('/app/projects', { replace: true });
      return;
    }
    setLoading(true);
    projectsApi
      .get(projectId)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setActiveProject(res.data);
          navigate('/app/workspace', { replace: true });
        } else {
          throw new Error('Project unavailable');
        }
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem('devos_active_project_id');
        toast('Project no longer exists.', 'info');
        navigate('/app/projects', { replace: true });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, navigate, setActiveProject, toast]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      {loading && <Spinner size={24} />}
    </div>
  );
};
