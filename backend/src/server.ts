import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { pathToFileURL } from 'url';
import { initializeStorage } from './services/jsonStore.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import inboxRoutes from './routes/inboxRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { setupSlackEvents } from './services/slack.js';

const PORT = Number(process.env.PORT) || 5000;

export const createApp = () => {
  const app = express();
  app.use(cors());
  setupSlackEvents(app);
  app.use(express.json());

  app.use('/api/projects', projectRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/inbox', inboxRoutes);
  app.use('/api/upload', uploadRoutes);

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', storage: 'local-json' });
  });

  app.get('/', (_req, res) => {
    res.send('PM AI Agent Backend is running!');
  });

  return app;
};

export const startServer = async (port = PORT) => {
  await initializeStorage();
  const app = createApp();
  return app.listen(port, () => {
    console.log(`PM AI Agent backend listening on port ${port}`);
  });
};

const isMainModule = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMainModule) {
  void startServer().catch((error: unknown) => {
    console.error('Backend startup failed:', error);
    process.exitCode = 1;
  });
}

export default createApp();
