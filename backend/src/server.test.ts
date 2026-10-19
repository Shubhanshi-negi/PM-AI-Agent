import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { test } from 'node:test';
import { once } from 'events';

test('local API supports CRUD, dependencies, analytics, and document context', async (t) => {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'pm-ai-api-'));
  const previousDataDirectory = process.env.PM_AI_DATA_DIR;
  process.env.PM_AI_DATA_DIR = tempDirectory;

  try {
    const [{ createApp }, storage] = await Promise.all([
      import('./server.js'),
      import('./services/jsonStore.js'),
    ]);
    await storage.initializeStorage();
    const server = createApp().listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    }));

    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const call = async (route: string, init: RequestInit = {}) => {
      const response = await fetch(`${baseUrl}${route}`, init);
      const body = await response.json() as unknown;
      return { response, body };
    };
    const postJson = (body: unknown): RequestInit => ({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    const health = await call('/healthz');
    assert.equal(health.response.status, 200);
    assert.equal((health.body as { storage: string }).storage, 'local-json');

    const projectResult = await call('/api/projects', postJson({
      name: 'Local API project',
      description: 'Integration test',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
    }));
    assert.equal(projectResult.response.status, 201);
    const project = projectResult.body as { _id: string; description: string };
    assert.equal(project.description, 'Integration test');

    const invalidTask = await call('/api/tasks', postJson({
      project: 'missing-project', name: 'Invalid', owner: 'Test', dueDate: '2026-11-01',
    }));
    assert.equal(invalidTask.response.status, 404);

    const parentResult = await call('/api/tasks', postJson({
      project: project._id,
      name: 'Prerequisite',
      owner: 'Local test',
      status: 'In Progress',
      dueDate: '2026-11-01',
    }));
    const parent = parentResult.body as { _id: string };
    const dependentResult = await call('/api/tasks', postJson({
      project: project._id,
      name: 'Dependent task',
      owner: 'Local test',
      dueDate: '2026-11-02',
      dependsOn: parent._id,
    }));
    const dependent = dependentResult.body as { _id: string };

    const matchingTasks = await call(`/api/tasks?projectId=${project._id}&searchQuery=dependent`);
    const taskItems = matchingTasks.body as Array<{ dependsOn: { name: string } }>;
    assert.equal(taskItems.length, 1);
    assert.equal(taskItems[0].dependsOn.name, 'Prerequisite');

    const analytics = await call(`/api/analytics/${project._id}`);
    const metrics = (analytics.body as { analytics: { totalTasks: number; blockedCount: number } }).analytics;
    assert.equal(metrics.totalTasks, 2);
    assert.equal(metrics.blockedCount, 1);

    const patchProject = await call(`/api/projects/${project._id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ description: 'Updated locally' }),
    });
    assert.equal((patchProject.body as { description: string }).description, 'Updated locally');

    const form = new FormData();
    form.append('file', new Blob(['local RAG context marker'], { type: 'text/plain' }), 'spec.txt');
    const upload = await call(`/api/upload/${project._id}`, { method: 'POST', body: form });
    assert.equal(upload.response.status, 200);
    const assets = (upload.body as { assets: Array<{ _id: string }> }).assets;
    assert.equal(assets.length, 1);
    assert.equal('storageName' in assets[0], false);
    const storedAsset = (await storage.readStore()).projects[0].assets![0];
    assert.ok(storedAsset.storageName);
    assert.equal(await storage.uploadedFileExists(storedAsset.storageName!), true);

    const projectWithContext = await call(`/api/projects/${project._id}`);
    const contextRecord = projectWithContext.body as { context: string; assets: unknown[] };
    assert.match(contextRecord.context, /local RAG context marker/);
    assert.equal(contextRecord.assets.length, 1);

    await call(`/api/upload/${project._id}/${assets[0]._id}`, { method: 'DELETE' });
    const removedAssetProject = await call(`/api/projects/${project._id}`);
    const removedRecord = removedAssetProject.body as { context: string; assets: unknown[] };
    assert.equal(removedRecord.assets.length, 0);
    assert.doesNotMatch(removedRecord.context, /local RAG context marker/);
    assert.equal(await storage.uploadedFileExists(storedAsset.storageName!), false);

    await call(`/api/tasks/${parent._id}`, { method: 'DELETE' });
    const dependentAfterDelete = await call(`/api/tasks/${dependent._id}`);
    assert.equal((dependentAfterDelete.body as { dependsOn: unknown }).dependsOn, null);

    await call(`/api/projects/${project._id}`, { method: 'DELETE' });
    const projectsAfterDelete = await call('/api/projects');
    assert.equal((projectsAfterDelete.body as Array<{ _id: string }>).length, 0);
    assert.equal((await storage.readStore()).tasks.length, 0);
  } finally {
    if (previousDataDirectory === undefined) delete process.env.PM_AI_DATA_DIR;
    else process.env.PM_AI_DATA_DIR = previousDataDirectory;
    await rm(tempDirectory, { recursive: true, force: true });
  }
});