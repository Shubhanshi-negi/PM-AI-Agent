import express from 'express';
import type { ITask, TaskPriority, TaskStatus, TaskTeam } from '../models/Task.js';
import { createId, readStore, updateStore } from '../services/jsonStore.js';

const router = express.Router();

const teams: TaskTeam[] = ['Marketing', 'Development', 'Design', 'Product', 'Operations'];
const statuses: TaskStatus[] = ['To Do', 'In Progress', 'Done'];
const priorities: TaskPriority[] = ['Low', 'Medium', 'High'];

const withDependency = (task: ITask, tasks: ITask[]) => ({
    ...task,
    dependsOn: task.dependsOn
        ? (() => {
            const dependency = tasks.find(candidate => candidate._id === task.dependsOn);
            return dependency ? { _id: dependency._id, name: dependency.name, status: dependency.status } : null;
        })()
        : null,
});

const validateTask = (body: Record<string, unknown>, tasks: ITask[], taskId?: string): string | null => {
    if (body.project !== undefined && body.project !== null && typeof body.project !== 'string') return 'Invalid Project ID';
    if (body.team !== undefined && !teams.includes(body.team as TaskTeam)) return 'Invalid team';
    if (body.status !== undefined && !statuses.includes(body.status as TaskStatus)) return 'Invalid status';
    if (body.priority !== undefined && !priorities.includes(body.priority as TaskPriority)) return 'Invalid priority';
    if (body.dueDate !== undefined && Number.isNaN(new Date(String(body.dueDate)).getTime())) return 'Invalid due date';
    if (body.dependsOn !== undefined && body.dependsOn !== null && typeof body.dependsOn !== 'string') return 'Invalid dependency task ID';
    if (typeof body.dependsOn === 'string' && body.dependsOn) {
        if (body.dependsOn === taskId) return 'A task cannot depend on itself';
        if (!tasks.some(task => task._id === body.dependsOn)) return 'DependsOn Task not found';
    }
    return null;
};

// GET all tasks (optionally filter by project ID)
router.get('/', async (req, res) => {
    try {
        const { tasks } = await readStore();
        const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
        const search = typeof req.query.searchQuery === 'string' ? req.query.searchQuery.trim().toLowerCase() : '';
        const result = tasks
            .filter(task => !projectId || task.project === projectId)
            .filter(task => !search || [task.name, task.owner, task.team, task.description || ''].some(value => value.toLowerCase().includes(search)))
            .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
            .map(task => withDependency(task, tasks));
        res.json(result);
    } catch (error: unknown) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to read tasks' });
    }
});

// CREATE a new task
router.post('/', async (req, res) => {
    try {
        const body = req.body as Record<string, unknown>;
        const savedTask = await updateStore(store => {
            if (typeof body.project === 'string' && body.project && !store.projects.some(project => project._id === body.project)) {
                throw new Error('Project not found');
            }
            const validationError = validateTask(body, store.tasks);
            if (validationError) throw new Error(validationError);
            if (typeof body.name !== 'string' || !body.name.trim()) throw new Error('Task name is required');
            if (typeof body.owner !== 'string' || !body.owner.trim()) throw new Error('Task owner is required');
            if (!body.dueDate) throw new Error('Task dueDate is required');
            const task: ITask = {
                _id: createId(),
                project: typeof body.project === 'string' ? body.project : undefined,
                name: body.name.trim(),
                owner: body.owner.trim(),
                team: (body.team as TaskTeam) || 'Development',
                status: (body.status as TaskStatus) || 'To Do',
                priority: (body.priority as TaskPriority) || 'Medium',
                dueDate: new Date(String(body.dueDate)).toISOString(),
                description: typeof body.description === 'string' ? body.description.trim() : '',
                dependsOn: typeof body.dependsOn === 'string' && body.dependsOn ? body.dependsOn : null,
                createdAt: new Date().toISOString(),
            };
            store.tasks.push(task);
            return task;
        });
        res.status(201).json(savedTask);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Invalid task data';
        res.status(message === 'Project not found' || message === 'DependsOn Task not found' ? 404 : 400).json({ message });
    }
});

// GET a single task by ID
router.get('/:id', async (req, res) => {
    try {
        const { tasks } = await readStore();
        const task = tasks.find(item => item._id === req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(withDependency(task, tasks));
    } catch (error: unknown) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to read task' });
    }
});

// UPDATE a task by ID
router.patch('/:id', async (req, res) => {
    try {
        const body = req.body as Record<string, unknown>;
        const updatedTask = await updateStore(store => {
            const task = store.tasks.find(item => item._id === req.params.id);
            if (!task) return null;
            if (typeof body.project === 'string' && body.project && !store.projects.some(project => project._id === body.project)) {
                throw new Error('Project not found');
            }
            const validationError = validateTask(body, store.tasks, task._id);
            if (validationError) throw new Error(validationError);
            if (body.name !== undefined) {
                if (typeof body.name !== 'string' || !body.name.trim()) throw new Error('Task name is required');
                task.name = body.name.trim();
            }
            if (body.owner !== undefined) {
                if (typeof body.owner !== 'string' || !body.owner.trim()) throw new Error('Task owner is required');
                task.owner = body.owner.trim();
            }
            if (body.project !== undefined) task.project = typeof body.project === 'string' ? body.project : undefined;
            if (body.team !== undefined) task.team = body.team as TaskTeam;
            if (body.status !== undefined) task.status = body.status as TaskStatus;
            if (body.priority !== undefined) task.priority = body.priority as TaskPriority;
            if (body.dueDate !== undefined) task.dueDate = new Date(String(body.dueDate)).toISOString();
            if (body.description !== undefined) task.description = typeof body.description === 'string' ? body.description.trim() : '';
            if (body.dependsOn !== undefined) task.dependsOn = typeof body.dependsOn === 'string' && body.dependsOn ? body.dependsOn : null;
            return withDependency(task, store.tasks);
        });
        if (!updatedTask) return res.status(404).json({ message: 'Task not found' });
        res.json(updatedTask);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Invalid task update';
        res.status(message === 'Project not found' || message === 'DependsOn Task not found' ? 404 : 400).json({ message });
    }
});

// DELETE a task by ID
router.delete('/:id', async (req, res) => {
    try {
        const deletedTask = await updateStore(store => {
            const index = store.tasks.findIndex(task => task._id === req.params.id);
            if (index < 0) return null;
            const [task] = store.tasks.splice(index, 1);
            for (const remaining of store.tasks) {
                if (remaining.dependsOn === task._id) remaining.dependsOn = null;
            }
            return task;
        });
        if (!deletedTask) return res.status(404).json({ message: 'Task not found' });
        res.json({ message: 'Task deleted' });
    } catch (error: unknown) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to delete task' });
    }
});

export default router;
