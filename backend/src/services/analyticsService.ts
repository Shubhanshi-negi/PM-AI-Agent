import { type ITask } from '../models/Task.js';

export interface AnalyticsResult {
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

export const calculateProjectAnalytics = (tasks: ITask[]): AnalyticsResult => {
    const totalTasks = tasks.length;
    if (totalTasks === 0) {
        return {
            totalTasks: 0,
            completedTasks: 0,
            completionPercentage: 0,
            statusBreakdown: { todo: 0, inProgress: 0, done: 0 },
            priorityBreakdown: { low: 0, medium: 0, high: 0 },
            overdueCount: 0,
            blockedCount: 0
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const stats: AnalyticsResult = {
        totalTasks,
        completedTasks: 0,
        completionPercentage: 0,
        statusBreakdown: { todo: 0, inProgress: 0, done: 0 },
        priorityBreakdown: { low: 0, medium: 0, high: 0 },
        overdueCount: 0,
        blockedCount: 0
    };

    tasks.forEach(task => {
        // Status Breakdown
        const status = (task.status || 'To Do').toLowerCase().replace(/\s+/g, '');
        if (status === 'todo') stats.statusBreakdown.todo++;
        else if (status === 'inprogress') stats.statusBreakdown.inProgress++;
        else if (status === 'done') {
            stats.statusBreakdown.done++;
            stats.completedTasks++;
        }

        // Priority Breakdown
        const priority = (task.priority || 'Medium').toLowerCase() as keyof typeof stats.priorityBreakdown;
        if (stats.priorityBreakdown[priority] !== undefined) {
            stats.priorityBreakdown[priority]++;
        }

        // Overdue Check
        if (task.status !== 'Done' && new Date(task.dueDate) < today) {
            stats.overdueCount++;
        }

        // Blocked Check
        if (task.dependsOn) {
            const dependencyStatus = tasks.find(candidate => candidate._id === task.dependsOn)?.status;
            if (dependencyStatus && dependencyStatus !== 'Done') {
                stats.blockedCount++;
            }
        }
    });

    stats.completionPercentage = Math.round((stats.completedTasks / totalTasks) * 100);

    return stats;
};
