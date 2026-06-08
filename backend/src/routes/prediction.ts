import { Hono } from 'hono';
import { logger } from '../utils/logger.js';
import { getPolymarketMarkets, getPolymarketMarket } from '../services/predictionData.js';

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  Bindings: Env;
};

const router = new Hono<{ Bindings: Env }>();

// Get all markets
router.get('/markets', async (c) => {
  try {
    const { limit, category, active } = c.req.query();
    logger.info('GET /prediction/markets', { limit, category, active });
    
    const markets = await getPolymarketMarkets({
      limit: parseInt(limit as string) || 500,
      category: category as string,
      active: active === 'true',
    });
    
    return c.json({ markets });
  } catch (error: any) {
    logger.error('Get markets error:', error);
    return c.json({
      error: 'Failed to fetch prediction markets',
      message: error.message,
    }, 500);
  }
});

// Get market by ID/slug
router.get('/market/:id', async (c) => {
  try {
    const { id } = c.req.param();
    logger.info(`GET /prediction/market/${id}`);
    
    const market = await getPolymarketMarket(id);
    
    if (!market) {
      return c.json({ error: 'Market not found' }, 404);
    }
    
    return c.json(market);
  } catch (error: any) {
    logger.error('Get market error:', error);
    return c.json({
      error: 'Failed to fetch market',
      message: error.message,
    }, 500);
  }
});

export { router as predictionRoutes };