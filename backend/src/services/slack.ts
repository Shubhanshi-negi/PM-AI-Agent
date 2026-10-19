import 'dotenv/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { WebClient } from '@slack/web-api';
import express, { type Request } from 'express';
import { analyzeProject, chatOverProject, extractTasksFromText, type AnalyzeInput, type Task as AITask } from './ai/analyzeProject.js';
import { readStore } from './jsonStore.js';

const token = process.env.SLACK_BOT_TOKEN;
const channel = process.env.SLACK_INBOX_CHANNEL;
const signingSecret = process.env.SLACK_SIGNING_SECRET;
const slackClient = new WebClient(token || '');

export interface SlackInboxMessage {
  id: string;
  user?: string;
  text: string;
  ts?: string;
  topic?: string;
  tag?: string;
  team?: string;
}

export const isSlackConfigured = (): boolean => Boolean(token && channel);

export async function fetchInboxMessages(limit = 20): Promise<SlackInboxMessage[]> {
  if (!isSlackConfigured()) return [];

  const response = await slackClient.conversations.history({
    channel: channel!,
    limit,
  });

  return (response.messages || [])
    .filter((message) => !message.subtype && message.text && message.ts)
    .map((message) => ({
      id: message.ts!,
      user: message.user,
      text: message.text!,
      ts: message.ts,
    }));
}

export async function sendSlackMessage(channelId: string, text: string): Promise<void> {
  await slackClient.chat.postMessage({
    channel: channelId,
    text: `🤖 *PM AI Agent*\n${text}`,
    mrkdwn: true,
  });
}

function isValidSlackRequest(req: Request, rawBody: Buffer): boolean {
  const timestamp = req.get('x-slack-request-timestamp');
  const signature = req.get('x-slack-signature');
  if (!signingSecret || !timestamp || !signature) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 60 * 5) {
    return false;
  }

  const baseString = `v0:${timestamp}:${rawBody.toString('utf8')}`;
  const expected = Buffer.from(`v0=${createHmac('sha256', signingSecret).update(baseString).digest('hex')}`);
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function processSlackMessage(channelId: string, userMessage: string): Promise<void> {
  if (userMessage.startsWith('/tasks')) {
    const document = userMessage.replace('/tasks', '').trim();
    if (document) {
      const result = await extractTasksFromText(document);
      const reply = 'error' in result
        ? `Task extraction failed: ${result.error}`
        : `*Suggested tasks:*\n${result.tasks.map((task) => `• ${task.title}`).join('\n')}`;
      await sendSlackMessage(channelId, reply);
    }
    return;
  }

  const isAnalysis = userMessage.startsWith('/analyze');
  const requestedName = isAnalysis ? userMessage.replace('/analyze', '').trim() : '';
  const escapedName = requestedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const { projects, tasks } = await readStore();
  const project = projects
    .filter(item => !requestedName || item.name.toLowerCase().includes(requestedName.toLowerCase()))
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))[0];

  if (!project) {
    await sendSlackMessage(channelId, 'No project is available. Create a project first, or provide its name with /analyze.');
    return;
  }

  const projectTasks = tasks.filter(task => task.project === project._id);
  const aiInput: AnalyzeInput = {
    project: {
      id: project._id,
      name: project.name,
      context: project.context,
    },
    tasks: projectTasks.map((task): AITask => ({
      id: task._id,
      title: task.name,
      status: task.status === 'To Do' ? 'todo' : task.status === 'In Progress' ? 'in_progress' : 'done',
      dueDate: task.dueDate || undefined,
      assignee: task.owner,
      dependencies: task.dependsOn ? [task.dependsOn] : undefined,
    })),
  };

  if (isAnalysis) {
    const analysis = await analyzeProject(aiInput);
    const reply = 'error' in analysis
      ? `Analysis failed: ${analysis.error}`
      : `*${project.name}*\n${analysis.summary}\n*Risk:* ${analysis.riskLevel}\n*Due soon:* ${analysis.deadlines.dueSoon.length}`;
    await sendSlackMessage(channelId, reply);
    return;
  }

  const answer = await chatOverProject(
    aiInput.project,
    aiInput.tasks,
    userMessage,
  );
  await sendSlackMessage(channelId, answer);
}

export function setupSlackEvents(app: express.Express): void {
  app.post('/slack/events', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
      if (!isValidSlackRequest(req, rawBody)) {
        res.status(401).send('Invalid Slack request signature');
        return;
      }

      const event = JSON.parse(rawBody.toString('utf8'));

      if (event.type === 'url_verification') {
        res.json({ challenge: event.challenge });
        return;
      }

      if (event.event?.type === 'message' && !event.event.subtype && !event.event.bot_id) {
        const { channel: channelId, text: userMessage } = event.event;
        if (typeof userMessage === 'string' && channelId) {
          res.status(200).send('OK');
          void processSlackMessage(channelId, userMessage).catch((error: unknown) => {
            console.error('Slack event processing failed:', error);
            void sendSlackMessage(channelId, 'Unable to process that request. Check the project, database, and AI configuration.');
          });
          return;
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Slack event error:', error);
      res.status(500).send('Error');
    }
  });
}
