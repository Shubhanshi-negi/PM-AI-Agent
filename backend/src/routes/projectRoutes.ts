import express from 'express';
import { createId, readStore, removeUploadedFile, updateStore } from '../services/jsonStore.js';
import type { IProject } from '../models/Project.js';

const router = express.Router();

const normalizeDate = (value: unknown, field: string): string => {
    const date = new Date(String(value ?? ''));
    if (!value || Number.isNaN(date.getTime())) throw new Error(`${field} must be a valid date`);
    return date.toISOString();
};

const projectFields = ['name', 'description', 'image', 'startDate', 'endDate', 'context'] as const;
const serializeProject = (project: IProject): IProject => ({
    ...project,
    assets: project.assets?.map(({ storageName: _storageName, ...asset }) => asset),
});

// GET all projects
router.get('/', async (req, res) => {
    try {
        const { projects } = await readStore();
        projects.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
        res.json(projects.map(serializeProject));
    } catch (error: unknown) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to read projects' });
    }
});

// CREATE a new project
router.post('/', async (req, res) => {
    try {
        const body = req.body as Record<string, unknown>;
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name) throw new Error('Project name is required');
        const now = new Date().toISOString();
        const savedProject: IProject = {
            _id: createId(),
            name,
            description: typeof body.description === 'string' ? body.description.trim() : '',
            image: typeof body.image === 'string' ? body.image : '',
            startDate: normalizeDate(body.startDate, 'startDate'),
            endDate: normalizeDate(body.endDate, 'endDate'),
            createdAt: now,
            context: '',
            assets: [],
        };
        await updateStore(store => { store.projects.push(savedProject); });
        res.status(201).json(serializeProject(savedProject));
    } catch (error: unknown) {
        res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid project data' });
    }
});

// GET a single project by ID
router.get('/:id', async (req, res) => {
    try {
        const { projects } = await readStore();
        const project = projects.find(item => item._id === req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(serializeProject(project));
    } catch (error: unknown) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to read project' });
    }
});

// UPDATE a project by ID (e.g., name, dates)
router.patch('/:id', async (req, res) => {
    try {
        const body = req.body as Record<string, unknown>;
        const updatedProject = await updateStore(store => {
            const project = store.projects.find(item => item._id === req.params.id);
            if (!project) return null;
            for (const field of projectFields) {
                const value = body[field];
                if (value === undefined) continue;
                if (field === 'name') {
                    if (typeof value !== 'string' || !value.trim()) throw new Error('Project name is required');
                    project.name = value.trim();
                } else if (field === 'startDate' || field === 'endDate') {
                    project[field] = normalizeDate(value, field);
                } else if (typeof value === 'string') {
                    project[field] = value;
                }
            }
            return project;
        });
        if (!updatedProject) return res.status(404).json({ message: 'Project not found' });
        res.json(serializeProject(updatedProject));
    } catch (error: unknown) {
        res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid project update' });
    }
});

// DELETE a project by ID
router.delete('/:id', async (req, res) => {
    try {
        const deletedProject = await updateStore(store => {
            const index = store.projects.findIndex(project => project._id === req.params.id);
            if (index < 0) return null;
            const [project] = store.projects.splice(index, 1);
            store.tasks = store.tasks.filter(task => task.project !== req.params.id);
            for (const task of store.tasks) {
                if (task.dependsOn && !store.tasks.some(candidate => candidate._id === task.dependsOn)) {
                    task.dependsOn = null;
                }
            }
            return project;
        });
        if (!deletedProject) return res.status(404).json({ message: 'Project not found' });
        await Promise.all((deletedProject.assets || []).map(asset => removeUploadedFile(asset.storageName)));

        res.json({ message: 'Project and associated tasks deleted' });
    } catch (error: unknown) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to delete project' });
    }
});


export default router;
