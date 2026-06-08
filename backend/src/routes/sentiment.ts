import { Hono } from 'hono';
import { logger } from '../utils/logger.js';
import {
  getSocialMetrics,
  getBatchSocialMetrics,
  getTrendingTopics,
  getSocialAlerts,
  getMarketSentiment,
} from '../services/sentimentData.js';

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  Bindings: Env;
};

const router = new Hono<{ Bindings: Env }>();

// Get social metrics for a single asset
router.get('/metrics/:symbol', async (c) => {
  try {
    const { symbol } = c.req.param();
    logger.info(`GET /sentiment/metrics/${symbol}`);
    
    const metrics = await getSocialMetrics(symbol);
    
    if (!metrics) {
      return c.json({ error: 'Metrics not found' }, 404);
    }
    
    return c.json(metrics);
  } catch (error: any) {
    logger.error('Get social metrics error:', error);
    return c.json({
      error: 'Failed to fetch social metrics',
      message: error.message,
    }, 500);
  }
});

// Get batch social metrics for multiple assets
router.get('/metrics', async (c) => {
  try {
    const { symbols } = c.req.query();
    
    if (!symbols) {
      return c.json({ error: 'Symbols parameter required' }, 400);
    }
    
    logger.info('GET /sentiment/metrics');
    
    const symbolList = (symbols as string).split(',');
    const metrics = await getBatchSocialMetrics(symbolList);
    
    return c.json({ metrics });
  } catch (error: any) {
    logger.error('Get batch social metrics error:', error);
    return c.json({
      error: 'Failed to fetch social metrics',
      message: error.message,
    }, 500);
  }
});

// Get trending topics
router.get('/trending', async (c) => {
  try {
    logger.info('GET /sentiment/trending');
    const topics = await getTrendingTopics();
    return c.json({ topics });
  } catch (error: any) {
    logger.error('Get trending topics error:', error);
    return c.json({
      error: 'Failed to fetch trending topics',
      message: error.message,
    }, 500);
  }
});

// Get social alerts
router.get('/alerts', async (c) => {
  try {
    logger.info('GET /sentiment/alerts');
    const alerts = await getSocialAlerts();
    return c.json({ alerts });
  } catch (error: any) {
    logger.error('Get social alerts error:', error);
    return c.json({
      error: 'Failed to fetch social alerts',
      message: error.message,
    }, 500);
  }
});

// Get overall market sentiment
router.get('/market', async (c) => {
  try {
    logger.info('GET /sentiment/market');
    const sentiment = await getMarketSentiment();
    return c.json(sentiment);
  } catch (error: any) {
    logger.error('Get market sentiment error:', error);
    return c.json({
      error: 'Failed to fetch market sentiment',
      message: error.message,
    }, 500);
  }
});

// Get sentiment overview (combined)
router.get('/overview', async (c) => {
  try {
    logger.info('GET /sentiment/overview');
    
    const [trending, alerts, market] = await Promise.all([
      getTrendingTopics(),
      getSocialAlerts(),
      getMarketSentiment(),
    ]);

    return c.json({
      trending: trending.slice(0, 10),
      alerts: alerts.slice(0, 10),
      market,
    });
  } catch (error: any) {
    logger.error('Get sentiment overview error:', error);
    return c.json({
      error: 'Failed to fetch sentiment overview',
      message: error.message,
    }, 500);
  }
});

export { router as sentimentRoutes };