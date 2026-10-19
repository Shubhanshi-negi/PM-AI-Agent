export type TaskTeam = 'Marketing' | 'Development' | 'Design' | 'Product' | 'Operations';
export type TaskStatus = 'To Do' | 'In Progress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface ITask {
  _id: string;
  project?: string;
  name: string;
  owner: string;
  team: TaskTeam;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  description?: string;
  dependsOn?: string | null;
  createdAt: string;
}
