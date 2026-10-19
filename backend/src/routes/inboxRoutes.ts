import express, { Request, Response } from "express";
import { fetchInboxMessages, isSlackConfigured } from "../services/slack.js";

const router = express.Router();
const demoMessages = [
    {
        id: '1',
        user: 'Sarah (Design Team)',
        topic: 'Final Logo Variations',
        tag: 'Design',
        text: 'Hey! I’ve just pushed the final logo variations for the "Odyssey" project.',
        team: 'Design',
        ts: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
        id: '2',
        user: 'Mike (Marketing)',
        topic: 'Q3 Campaign Brief',
        tag: 'Marketing',
        text: 'Here is the brief for the upcoming Q3 marketing campaign.',
        team: 'Marketing',
        ts: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
        id: '3',
        user: 'SlackBot (Demo)',
        topic: 'Integration Ready',
        tag: 'System',
        text: 'Slack integration is active! Configure .env to see real messages.',
        team: 'System',
        ts: new Date().toISOString(),
    },
];

const getInbox = async (searchQuery?: string) => {
    const connected = isSlackConfigured();
    const items = connected ? await fetchInboxMessages() : [...demoMessages];
    const filteredItems = searchQuery
        ? items.filter((message) =>
                `${message.user || ''} ${message.text || ''} ${message.topic || ''}`
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()),
            )
        : items;

    return { items: filteredItems, connected };
};

router.get("/", async (req: Request, res: Response) => {
  try {
        const searchQuery = typeof req.query.searchQuery === 'string' ? req.query.searchQuery : undefined;
        res.json(await getInbox(searchQuery));
  } catch (err) {
    console.error("Slack inbox error", err);
    res.status(500).json({ message: "Failed to load inbox" });
  }
});

router.get('/messages', async (req, res) => {
    try {
        const searchQuery = typeof req.query.searchQuery === 'string' ? req.query.searchQuery : undefined;
        const { items } = await getInbox(searchQuery);
        res.json(items);
    } catch (err) {
        console.error("Slack inbox error", err);
        res.status(500).json({ message: "Failed to load inbox" });
    }
});

export default router;
