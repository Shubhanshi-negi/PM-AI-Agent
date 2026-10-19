import express from 'express';
import { readStore } from '../services/jsonStore.js';
import { analyzeProject, chatOverProject, extractTasksFromText, type AnalyzeInput } from '../services/ai/analyzeProject.js';

const router = express.Router();

// POST AI Analysis for a project
router.post('/analyze/:projectId', async (req, res) => {
    const { projectId } = req.params;

    try {
        const { projects, tasks } = await readStore();
        const projectData = projects.find(project => project._id === projectId);
        if (!projectData) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const tasksData = tasks.filter(task => task.project === projectId);

        // Transform stored records into the AI service input shape.
        const aiInput: AnalyzeInput = {
            project: {
                id: projectData._id,
                name: projectData.name,
            },
            tasks: tasksData.map(t => ({
                id: t._id,
                title: t.name,
                status: t.status === 'To Do' ? 'todo' : t.status === 'In Progress' ? 'in_progress' : 'done',
                dueDate: t.dueDate || undefined,
                assignee: t.owner,
                dependencies: t.dependsOn ? [t.dependsOn] : undefined,
            })),
        };

        // Call Person C's AI logic
        const analysis = await analyzeProject(aiInput);
        if ('error' in analysis) {
            res.status(502).json({ message: analysis.error });
            return;
        }
        res.json(analysis);

    } catch (error: any) {
        console.error("AI Analyze Route Error:", error);
        res.status(500).json({ message: "Failed to generate AI analysis", error: error.message });
    }
});

// POST AI Chat for a project
router.post('/chat/:projectId', async (req, res) => {
    const { projectId } = req.params;
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ message: "Question is required for AI chat." });
    }

    try {
        const { projects, tasks } = await readStore();
        const projectData = projects.find(project => project._id === projectId);
        if (!projectData) {
            return res.status(404).json({ message: 'Project not found' });
        }
        const tasksData = tasks.filter(task => task.project === projectId);

        // Call Person C's AI chat logic
        const answer = await chatOverProject(
            { 
                id: projectData._id,
                name: projectData.name,
                context: projectData.context 
            },
            tasksData.map(t => ({
                id: t._id,
                title: t.name,
                status: t.status === 'To Do' ? 'todo' : t.status === 'In Progress' ? 'in_progress' : 'done',
                dueDate: t.dueDate || undefined,
                assignee: t.owner,
                dependencies: t.dependsOn ? [t.dependsOn] : undefined,
            })),
            question
        );
        
        res.json({ answer });

    } catch (error: any) {
        console.error("AI Chat Route Error:", error);
        res.status(500).json({ message: "Failed to get AI chat response", error: error.message });
    }
});

// POST God Mode: Doc-to-Tasks
router.post('/doc-to-tasks', async (req, res) => {
    const { document } = req.body;

    if (!document) {
        return res.status(400).json({ message: "Document text is required." });
    }

    try {
        const result = await extractTasksFromText(document);
        if ('error' in result) {
            res.status(502).json({ message: result.error });
            return;
        }
        res.json(result);
    } catch (error: any) {
        console.error("Doc-to-Tasks Route Error:", error);
        res.status(500).json({ message: "Failed to extract tasks from document", error: error.message });
    }
});


export default router;
