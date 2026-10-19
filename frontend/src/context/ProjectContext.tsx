import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
/* eslint-disable react-refresh/only-export-components */
import { projectService } from '../services/api';
import type { Project } from '../services/api';

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  deleteProject: (id: string) => Promise<void>;
  updateProject: (id: string, data: Partial<Omit<Project, '_id' | 'createdAt'>>) => Promise<void>;
  loadingProjects: boolean;
  refreshProjects: () => Promise<void>;
  taskRefreshTrigger: number;
  triggerTaskRefresh: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [taskRefreshTrigger, setTaskRefreshTrigger] = useState(0);

  const refreshProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const response = await projectService.getAll();
      setProjects(response.data);
      setCurrentProject(current =>
        response.data.find(project => project._id === current?._id) ?? response.data[0] ?? null
      );
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setProjects([]);
      setCurrentProject(null);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const deleteProject = async (id: string) => {
    // Optimistic UI update
    setProjects(prev => prev.filter(p => p._id !== id));
    try {
      await projectService.remove(id);
      // If deleted project was current, unset
      if (currentProject && currentProject._id === id) {
        setCurrentProject(null);
      }
    } catch (err) {
      console.error('Failed to delete project', err);
      // Re-fetch to restore state
      await refreshProjects();
    }
  };

  const updateProject = async (id: string, data: Partial<Omit<Project, '_id' | 'createdAt'>>) => {
    try {
      const res = await projectService.update(id, data);
      const updated = res.data as Project;
      setProjects(prev => prev.map(p => p._id === id ? updated : p));
      if (currentProject && currentProject._id === id) setCurrentProject(updated);
    } catch (err) {
      console.error('Failed to update project', err);
      await refreshProjects();
    }
  };

  const triggerTaskRefresh = () => {
    setTaskRefreshTrigger(prev => prev + 1);
  };

  const addProject = (project: Project) => {
    setProjects(prev => [project, ...prev]);
    setCurrentProject(project);
  };

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  return (
    <ProjectContext.Provider value={{ projects, currentProject, setCurrentProject, addProject, deleteProject, updateProject, loadingProjects, refreshProjects, taskRefreshTrigger, triggerTaskRefresh }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};