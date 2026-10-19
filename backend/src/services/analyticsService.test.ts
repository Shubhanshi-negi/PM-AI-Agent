import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'crypto';
import type { ITask } from '../models/Task.js';
import { calculateProjectAnalytics } from './analyticsService.js';

const createTask = (overrides: Partial<ITask> = {}): ITask => ({
    _id: randomUUID(),
    name: 'Test task',
    owner: 'Test owner',
    team: 'Development',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    dependsOn: null,
    createdAt: new Date().toISOString(),
    ...overrides,
} as ITask);

test('analytics returns zero values when there are no tasks', () => {
    assert.deepEqual(calculateProjectAnalytics([]), {
        totalTasks: 0,
        completedTasks: 0,
        completionPercentage: 0,
        statusBreakdown: { todo: 0, inProgress: 0, done: 0 },
        priorityBreakdown: { low: 0, medium: 0, high: 0 },
        overdueCount: 0,
        blockedCount: 0,
    });
});

test('analytics counts task states, priorities, and calendar-day overdue work', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const result = calculateProjectAnalytics([
        createTask({ dueDate: yesterday.toISOString(), priority: 'High' }),
        createTask({ status: 'In Progress', dueDate: today.toISOString(), priority: 'Low' }),
        createTask({ status: 'Done', dueDate: yesterday.toISOString() }),
    ]);

    assert.equal(result.totalTasks, 3);
    assert.equal(result.completedTasks, 1);
    assert.equal(result.completionPercentage, 33);
    assert.deepEqual(result.statusBreakdown, { todo: 1, inProgress: 1, done: 1 });
    assert.deepEqual(result.priorityBreakdown, { low: 1, medium: 1, high: 1 });
    assert.equal(result.overdueCount, 1);
});

test('analytics detects blocked tasks from populated and unpopulated dependencies', () => {
    const dependency = createTask({ status: 'In Progress' });
    const dependentTask = createTask({ dependsOn: dependency._id });

    assert.equal(calculateProjectAnalytics([dependency, dependentTask]).blockedCount, 1);
});