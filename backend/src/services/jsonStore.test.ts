import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { test } from 'node:test';

test('local JSON storage initializes and serializes concurrent updates', async () => {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'pm-ai-json-store-'));
  process.env.PM_AI_DATA_DIR = tempDirectory;
  try {
    const storage = await import('./jsonStore.js');
    await storage.initializeStorage();

    await Promise.all(Array.from({ length: 12 }, (_, index) =>
      storage.updateStore(store => {
        store.projects.push({
          _id: `project-${index}`,
          name: `Project ${index}`,
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-12-31T00:00:00.000Z',
          createdAt: new Date(index).toISOString(),
          assets: [],
        });
      }),
    ));

    const store = await storage.readStore();
    assert.equal(store.projects.length, 12);
    const persisted = JSON.parse(await readFile(storage.dataFile, 'utf8')) as { projects: unknown[]; tasks: unknown[] };
    assert.equal(persisted.projects.length, 12);
    assert.deepEqual(persisted.tasks, []);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
    delete process.env.PM_AI_DATA_DIR;
  }
});