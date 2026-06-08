import { Router } from 'express';
import Parser from 'rss-parser';
import type { RSSFeed, NewsItem } from '../../../shared/src/types';

const router = Router();
const parser = new Parser();

// Mock RSS storage (replace with database)
const mockRSSFeeds: RSSFeed[] = [];

// Add RSS feed
router.post('/add', async (req, res) => {
  try {
    const { url, label } = req.body;

    if (!url || !label) {
      return res.status(400).json({ error: 'Missing url or label' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    // Test parsing the feed
    try {
      await parser.parseURL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid RSS feed' });
    }

    const feed: RSSFeed = {
      id: `rss-${Date.now()}`,
      url,
      label,
      userId: 'default', // TODO: Get from auth
    };

    mockRSSFeeds.push(feed);
    res.json({ success: true, feed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add RSS feed' });
  }
});

// Get RSS feed items
router.get('/:label', async (req, res) => {
  try {
    const { label } = req.params;
    const feed = mockRSSFeeds.find((f) => f.label === label);

    if (!feed) {
      return res.status(404).json({ error: 'RSS feed not found' });
    }

    const parsed = await parser.parseURL(feed.url);
    const items: NewsItem[] = (parsed.items || []).slice(0, 50).map((item) => ({
      id: item.guid || item.link || `item-${Date.now()}`,
      title: item.title || '',
      source: feed.label,
      url: item.link || '#',
      publishedAt: item.pubDate || new Date().toISOString(),
    }));

    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch RSS feed' });
  }
});

// List all RSS feeds
router.get('/', async (req, res) => {
  try {
    res.json({ feeds: mockRSSFeeds });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list RSS feeds' });
  }
});

export { router as rssRoutes };

