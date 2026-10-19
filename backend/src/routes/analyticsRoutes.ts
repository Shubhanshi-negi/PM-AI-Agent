import express from 'express';
import { readStore } from '../services/jsonStore.js';
import { calculateProjectAnalytics, type AnalyticsResult } from '../services/analyticsService.js';

const router = express.Router();

// GET analytics for a specific project or global
router.get('/:projectId', async (req, res) => {
    const { projectId } = req.params;
    const { team } = req.query;

    try {
        const { projects, tasks } = await readStore();
        let projectName = 'Global View';
        let filteredTasks = tasks;

        if (projectId !== 'global' && projectId !== 'undefined') {
             const projectData = projects.find(project => project._id === projectId);
             if (!projectData) {
                 return res.status(404).json({ message: 'Project not found' });
             }
             filteredTasks = filteredTasks.filter(task => task.project === projectId);
             projectName = projectData.name;
        }

        if (typeof team === 'string') {
            filteredTasks = filteredTasks.filter(task => task.team === team);
        }

        const analytics: AnalyticsResult = calculateProjectAnalytics(filteredTasks);

        res.json({
            projectId: projectId === 'global' ? null : projectId,
            projectName,
            analytics
        });

    } catch (error: unknown) {
        console.error("Analytics Route Error:", error);
        res.status(500).json({ message: "Failed to generate analytics", error: error instanceof Error ? error.message : 'Unknown error' });
    }
});

export default router;
