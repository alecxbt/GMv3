import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { getPolymarketMarkets, getPolymarketMarket } from '../services/predictionData.js';

const router = Router();

// Get all markets
router.get('/markets', async (req, res) => {
  try {
    const { limit = 500, category, active } = req.query;
    logger.info('GET /prediction/markets', { limit, category, active });
    
    const markets = await getPolymarketMarkets({
      limit: parseInt(limit as string),
      category: category as string,
      active: active === 'true',
    });
    
    res.json({ markets });
  } catch (error: any) {
    logger.error('Get markets error:', error);
    res.status(500).json({
      error: 'Failed to fetch prediction markets',
      message: error.message,
    });
  }
});

// Get market by ID/slug
router.get('/market/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`GET /prediction/market/${id}`);
    
    const market = await getPolymarketMarket(id);
    
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }
    
    res.json(market);
  } catch (error: any) {
    logger.error('Get market error:', error);
    res.status(500).json({
      error: 'Failed to fetch market',
      message: error.message,
    });
  }
});

export { router as predictionRoutes };

