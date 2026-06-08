import { Hono } from 'hono';
import Parser from 'rss-parser';
import type { RSSFeed, NewsItem } from '../../../shared/src/types';

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  Bindings: Env;
};

const router = new Hono<{ Bindings: Env }>();
const parser = new Parser();

// Mock RSS storage (replace with database)
const mockRSSFeeds: RSSFeed[] = [];

// Add RSS feed
router.post('/add', async (c) => {
  try {
    const body = await c.req.parseBody();
    const { url, label } = body as { url?: string; label?: string };

    if (!url || !label) {
      return c.json({ error: 'Missing url or label' }, 400);
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return c.json({ error: 'Invalid URL' }, 400);
    }

    // Test parsing the feed
    try {
      await parser.parseURL(url);
    } catch (error) {
      return c.json({ error: 'Invalid RSS feed' }, 400);
    }

    const feed: RSSFeed = {
      id: `rss-${Date.now()}`,
      url,
      label,
      userId: 'default', // TODO: Get from auth
    };

    mockRSSFeeds.push(feed);
    return c.json({ success: true, feed });
  } catch (error) {
    return c.json({ error: 'Failed to add RSS feed' }, 500);
  }
});

// Get RSS feed items
router.get('/:label', async (c) => {
  try {
    const { label } = c.req.param();
    const feed = mockRSSFeeds.find((f) => f.label === label);

    if (!feed) {
      return c.json({ error: 'RSS feed not found' }, 404);
    }

    const parsed = await parser.parseURL(feed.url);
    const items: NewsItem[] = (parsed.items || []).slice(0, 50).map((item) => ({
      id: item.guid || item.link || `item-${Date.now()}`,
      title: item.title || '',
      source: feed.label,
      url: item.link || '#',
      publishedAt: item.pubDate || new Date().toISOString(),
    }));

    return c.json({ items });
  } catch (error) {
    return c.json({ error: 'Failed to fetch RSS feed' }, 500);
  }
});

// List all RSS feeds
router.get('/', async (c) => {
  try {
    return c.json({ feeds: mockRSSFeeds });
  } catch (error) {
    return c.json({ error: 'Failed to list RSS feeds' }, 500);
  }
});

export { router as rssRoutes };