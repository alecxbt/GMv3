import { Hono } from 'hono';
import { logger } from '../utils/logger.js';
import {
  getCompanyProfile,
  getFinancials,
  getInsiderTrades,
  getInstitutionalHolders,
  getAnalystRatings,
  getEarningsEstimates,
  getShortInterest,
  getKeyMetrics,
} from '../services/fundamentalData.js';

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  Bindings: Env;
};

const router = new Hono<{ Bindings: Env }>();

// Get company profile
router.get('/profile/:symbol', async (c) => {
  try {
    const { symbol } = c.req.param();
    logger.info(`GET /fundamental/profile/${symbol}`);
    
    const profile = await getCompanyProfile(symbol.toUpperCase());
    
    if (!profile) {
      return c.json({ error: 'Company profile not found' }, 404);
    }
    
    return c.json(profile);
  } catch (error: any) {
    logger.error('Get company profile error:', error);
    return c.json({
      error: 'Failed to fetch company profile',
      message: error.message,
    }, 500);
  }
});

// Get financial statements
router.get('/financials/:symbol', async (c) => {
  try {
    const { symbol } = c.req.param();
    logger.info(`GET /fundamental/financials/${symbol}`);
    
    const financials = await getFinancials(symbol.toUpperCase());
    return c.json(financials);
  } catch (error: any) {
    logger.error('Get financials error:', error);
    return c.json({
      error: 'Failed to fetch financials',
      message: error.message,
    }, 500);
  }
});

// Get insider trades
router.get('/insider/:symbol', async (c) => {
  try {
    const { symbol } = c.req.param();
    const { limit } = c.req.query();
    logger.info(`GET /fundamental/insider/${symbol}`);
    
    const trades = await getInsiderTrades(symbol.toUpperCase(), parseInt(limit as string) || 50);
    return c.json({ trades });
  } catch (error: any) {
    logger.error('Get insider trades error:', error);
    return c.json({
      error: 'Failed to fetch insider trades',
      message: error.message,
    }, 500);
  }
});

// Get institutional holders
router.get('/institutional/:symbol', async (c) => {
  try {
    const { symbol } = c.req.param();
    logger.info(`GET /fundamental/institutional/${symbol}`);
    
    const holders = await getInstitutionalHolders(symbol.toUpperCase());
    return c.json({ holders });
  } catch (error: any) {
    logger.error('Get institutional holders error:', error);
    return c.json({
      error: 'Failed to fetch institutional holders',
      message: error.message,
    }, 500);
  }
});

// Get analyst ratings
router.get('/ratings/:symbol', async (c) => {
  try {
    const { symbol } = c.req.param();
    logger.info(`GET /fundamental/ratings/${symbol}`);
    
    const ratings = await getAnalystRatings(symbol.toUpperCase());
    return c.json({ ratings });
  } catch (error: any) {
    logger.error('Get analyst ratings error:', error);
    return c.json({
      error: 'Failed to fetch analyst ratings',
      message: error.message,
    }, 500);
  }
});

// Get earnings estimates
router.get('/estimates/:symbol', async (c) => {
  try {
    const { symbol } = c.req.param();
    logger.info(`GET /fundamental/estimates/${symbol}`);
    
    const estimates = await getEarningsEstimates(symbol.toUpperCase());
    return c.json({ estimates });
  } catch (error: any) {
    logger.error('Get earnings estimates error:', error);
    return c.json({
      error: 'Failed to fetch earnings estimates',
      message: error.message,
    }, 500);
  }
});

// Get short interest
router.get('/short-interest/:symbol', async (c) => {
  try {
    const { symbol } = c.req.param();
    logger.info(`GET /fundamental/short-interest/${symbol}`);
    
    const shortInterest = await getShortInterest(symbol.toUpperCase());
    
    if (!shortInterest) {
      return c.json({ error: 'Short interest data not found' }, 404);
    }
    
    return c.json(shortInterest);
  } catch (error: any) {
    logger.error('Get short interest error:', error);
    return c.json({
      error: 'Failed to fetch short interest',
      message: error.message,
    }, 500);
  }
});

// Get key metrics
router.get('/metrics/:symbol', async (c) => {
  try {
    const { symbol } = c.req.param();
    logger.info(`GET /fundamental/metrics/${symbol}`);
    
    const metrics = await getKeyMetrics(symbol.toUpperCase());
    
    if (!metrics) {
      return c.json({ error: 'Key metrics not found' }, 404);
    }
    
    return c.json(metrics);
  } catch (error: any) {
    logger.error('Get key metrics error:', error);
    return c.json({
      error: 'Failed to fetch key metrics',
      message: error.message,
    }, 500);
  }
});

// Get comprehensive stock overview
router.get('/overview/:symbol', async (c) => {
  try {
    const { symbol } = c.req.param();
    logger.info(`GET /fundamental/overview/${symbol}`);
    
    const [profile, metrics, ratings, shortInterest] = await Promise.all([
      getCompanyProfile(symbol.toUpperCase()),
      getKeyMetrics(symbol.toUpperCase()),
      getAnalystRatings(symbol.toUpperCase()),
      getShortInterest(symbol.toUpperCase()),
    ]);

    return c.json({
      profile,
      metrics,
      ratings: ratings.slice(0, 5),
      shortInterest,
    });
  } catch (error: any) {
    logger.error('Get stock overview error:', error);
    return c.json({
      error: 'Failed to fetch stock overview',
      message: error.message,
    }, 500);
  }
});

export { router as fundamentalRoutes };