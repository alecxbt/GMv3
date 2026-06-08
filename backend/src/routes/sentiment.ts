import { Router } from 'express';
import { logger } from '../utils/logger.js';
import {
  getSocialMetrics,
  getBatchSocialMetrics,
  getTrendingTopics,
  getSocialAlerts,
  getMarketSentiment,
} from '../services/sentimentData.js';

const router = Router();

// Get social metrics for a single asset
router.get('/metrics/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    logger.info(`GET /sentiment/metrics/${symbol}`);
    
    const metrics = await getSocialMetrics(symbol);
    
    if (!metrics) {
      return res.status(404).json({ error: 'Metrics not found' });
    }
    
    res.json(metrics);
  } catch (error: any) {
    logger.error('Get social metrics error:', error);
    res.status(500).json({
      error: 'Failed to fetch social metrics',
      message: error.message,
    });
  }
});

// Get batch social metrics for multiple assets
router.get('/metrics', async (req, res) => {
  try {
    const { symbols } = req.query;
    
    if (!symbols) {
      return res.status(400).json({ error: 'Symbols parameter required' });
    }
    
    logger.info('GET /sentiment/metrics');
    
    const symbolList = (symbols as string).split(',');
    const metrics = await getBatchSocialMetrics(symbolList);
    
    res.json({ metrics });
  } catch (error: any) {
    logger.error('Get batch social metrics error:', error);
    res.status(500).json({
      error: 'Failed to fetch social metrics',
      message: error.message,
    });
  }
});

// Get trending topics
router.get('/trending', async (req, res) => {
  try {
    logger.info('GET /sentiment/trending');
    const topics = await getTrendingTopics();
    res.json({ topics });
  } catch (error: any) {
    logger.error('Get trending topics error:', error);
    res.status(500).json({
      error: 'Failed to fetch trending topics',
      message: error.message,
    });
  }
});

// Get social alerts
router.get('/alerts', async (req, res) => {
  try {
    logger.info('GET /sentiment/alerts');
    const alerts = await getSocialAlerts();
    res.json({ alerts });
  } catch (error: any) {
    logger.error('Get social alerts error:', error);
    res.status(500).json({
      error: 'Failed to fetch social alerts',
      message: error.message,
    });
  }
});

// Get overall market sentiment
router.get('/market', async (req, res) => {
  try {
    logger.info('GET /sentiment/market');
    const sentiment = await getMarketSentiment();
    res.json(sentiment);
  } catch (error: any) {
    logger.error('Get market sentiment error:', error);
    res.status(500).json({
      error: 'Failed to fetch market sentiment',
      message: error.message,
    });
  }
});

// Get sentiment overview (combined)
router.get('/overview', async (req, res) => {
  try {
    logger.info('GET /sentiment/overview');
    
    const [trending, alerts, market] = await Promise.all([
      getTrendingTopics(),
      getSocialAlerts(),
      getMarketSentiment(),
    ]);

    res.json({
      trending: trending.slice(0, 10),
      alerts: alerts.slice(0, 10),
      market,
    });
  } catch (error: any) {
    logger.error('Get sentiment overview error:', error);
    res.status(500).json({
      error: 'Failed to fetch sentiment overview',
      message: error.message,
    });
  }
});

export { router as sentimentRoutes };

