import axios from 'axios';

// The backend URL will be picked up from the .env file in the frontend directory
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

// --- INTERFACES (matching backend models) ---

export interface Project {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  description?: string;
  image?: string;
  context?: string;
  assets?: ProjectAsset[];
}

export interface ProjectAsset {
  _id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export type TaskTeam = 'Marketing' | 'Development' | 'Design' | 'Product' | 'Operations';
export type TaskStatus = 'To Do' | 'In Progress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface TaskInput {
  project?: string;
  name: string;
  owner: string;
  team?: TaskTeam;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate: string;
  description?: string;
  dependsOn?: string | null;
}

export interface Task {
  _id: string;
  project?: string;
  name: string;
  owner: string;
  team?: TaskTeam;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  description?: string;
  dependsOn?: {
    _id: string;
    name: string;
    status: string;
  } | null;
}

export interface Analytics {
    totalTasks: number;
    completedTasks: number;
    completionPercentage: number;
    statusBreakdown: {
        todo: number;
        inProgress: number;
        done: number;
    };
    priorityBreakdown: {
        low: number;
        medium: number;
        high: number;
    };
    overdueCount: number;
    blockedCount: number;
}

export interface AIInsights {
  summary: string;
  riskLevel: "Low" | "Medium" | "High";
  deadlines: {
    overdue: { id: string; title: string }[];
    dueSoon: { id: string; title: string }[];
    onTrack: { id: string; title: string }[];
  };
  standupUpdate: string;
  suggestedActions: {
    taskId: string | null;
    action: string;
    reason: string;
  }[];
}

// Unified Inbox Message Interface
export interface InboxMessage {
  _id?: string;
  id?: string; // Slack uses 'id' or 'ts'
  name?: string;
  user?: string; // Slack uses 'user'
  topic?: string;
  tag?: string;
  preview?: string;
  text?: string; // Slack uses 'text'
  team?: string;
  timestamp?: string;
  ts?: string; // Slack timestamp
}


// --- API FUNCTIONS ---

export const projectService = {
  getAll: () => api.get<Project[]>('/api/projects'),
  getById: (id: string) => api.get<Project>(`/api/projects/${id}`),
  create: (data: Omit<Project, '_id' | 'createdAt'>) => api.post<Project>('/api/projects', data),
  update: (id: string, data: Partial<Omit<Project, '_id' | 'createdAt'>>) => api.patch<Project>(`/api/projects/${id}`, data),
  remove: (id: string) => api.delete(`/api/projects/${id}`),
  uploadFile: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ message: string; assets: ProjectAsset[] }>(`/api/upload/${projectId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteAsset: (projectId: string, assetId: string) =>
    api.delete<{ message: string; assets: ProjectAsset[] }>(`/api/upload/${projectId}/${assetId}`),
};

export const taskService = {
  getByProject: (projectId?: string, searchQuery?: string) => {
    return api.get<Task[]>(`/api/tasks`, { params: { projectId, searchQuery } });
  },
  create: (data: TaskInput) => api.post<Task>('/api/tasks', data),
  update: (id: string, data: Partial<TaskInput>) => api.patch<Task>(`/api/tasks/${id}`, data),
  remove: (id: string) => api.delete(`/api/tasks/${id}`),
};

export const analyticsService = {
  getProjectAnalytics: (projectId?: string, team?: string | null) => {
    const id = projectId || 'global';
    return api.get<{ analytics: Analytics }>(`/api/analytics/${id}`, { params: { team } });
  },
};

export const aiService = {
  getInsights: (projectId: string) => api.post<AIInsights>(`/api/ai/analyze/${projectId}`),
  chatWithAI: (projectId: string, question: string) => api.post<{ answer: string }>(`/api/ai/chat/${projectId}`, { question }),
};

export const inboxService = {
  // Tries to get messages. If Slack is set up, it hits /inbox (root). 
  // If not, it falls back to mock data handled by the backend.
  getMessages: (searchQuery?: string) => {
    return api.get<{ items: InboxMessage[]; connected: boolean }>('/api/inbox', { params: { searchQuery } });
  },
  getSlackMessages: () => api.get<{ items: InboxMessage[]; connected: boolean }>('/api/inbox'),
};

export default api;
