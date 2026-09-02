import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project } from '../types/project';
import { projectsApi } from '../api';

interface ProjectContextType {
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  projects: Project[];
  refreshProjects: () => Promise<void>;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProjects = async () => {
    try {
      const res = await projectsApi.list();
      if (res.success && res.data?.projects) {
        setProjects(res.data.projects);
        const savedId = localStorage.getItem('devos_active_project_id');
        if (savedId) {
          const matched = res.data.projects.find((p) => p.id === savedId);
          if (matched) {
            setActiveProjectState(matched);
            return;
          }
        }
        if (!activeProject && res.data.projects.length > 0) {
          setActiveProjectState(res.data.projects[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to load projects:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const setActiveProject = (proj: Project | null) => {
    setActiveProjectState(proj);
    if (proj?.id) {
      localStorage.setItem('devos_active_project_id', proj.id);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        activeProject,
        setActiveProject,
        projects,
        refreshProjects,
        isLoading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    // Graceful fallback if outside provider
    const [fallbackProject, setFallbackProject] = useState<Project | null>({
      id: 'proj_ecommerce_api',
      user_id: 'usr_devos_primary',
      name: 'ecommerce-api',
      description: 'E-commerce microservice and product catalog REST API',
      technologies: ['TypeScript', 'Express', 'Jest'],
      repository_url: 'https://github.com/developer/ecommerce-api',
      default_branch: 'main',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return {
      activeProject: fallbackProject,
      setActiveProject: setFallbackProject,
      projects: fallbackProject ? [fallbackProject] : [],
      refreshProjects: async () => {},
      isLoading: false,
    };
  }
  return context;
};
