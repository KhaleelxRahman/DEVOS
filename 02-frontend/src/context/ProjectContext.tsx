import React, { createContext, useState, ReactNode } from 'react';
import { Project } from '../types/project';

export interface ProjectContextType {
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const selectProject = (project: Project | null) => {
    setActiveProject(project);
    if (project) {
      localStorage.setItem('devos_active_project_id', project.id);
    } else {
      localStorage.removeItem('devos_active_project_id');
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        activeProject,
        setActiveProject: selectProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
