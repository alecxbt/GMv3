import { Router } from 'express';
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

const router = Router();

// Get company profile
router.get('/profile/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    logger.info(`GET /fundamental/profile/${symbol}`);
    
    const profile = await getCompanyProfile(symbol.toUpperCase());
    
    if (!profile) {
      return res.status(404).json({ error: 'Company profile not found' });
    }
    
    res.json(profile);
  } catch (error: any) {
    logger.error('Get company profile error:', error);
    res.status(500).json({
      error: 'Failed to fetch company profile',
      message: error.message,
    });
  }
});

// Get financial statements
router.get('/financials/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    logger.info(`GET /fundamental/financials/${symbol}`);
    
    const financials = await getFinancials(symbol.toUpperCase());
    res.json(financials);
  } catch (error: any) {
    logger.error('Get financials error:', error);
    res.status(500).json({
      error: 'Failed to fetch financials',
      message: error.message,
    });
  }
});

// Get insider trades
router.get('/insider/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 50 } = req.query;
    logger.info(`GET /fundamental/insider/${symbol}`);
    
    const trades = await getInsiderTrades(symbol.toUpperCase(), parseInt(limit as string));
    res.json({ trades });
  } catch (error: any) {
    logger.error('Get insider trades error:', error);
    res.status(500).json({
      error: 'Failed to fetch insider trades',
      message: error.message,
    });
  }
});

// Get institutional holders
router.get('/institutional/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    logger.info(`GET /fundamental/institutional/${symbol}`);
    
    const holders = await getInstitutionalHolders(symbol.toUpperCase());
    res.json({ holders });
  } catch (error: any) {
    logger.error('Get institutional holders error:', error);
    res.status(500).json({
      error: 'Failed to fetch institutional holders',
      message: error.message,
    });
  }
});

// Get analyst ratings
router.get('/ratings/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    logger.info(`GET /fundamental/ratings/${symbol}`);
    
    const ratings = await getAnalystRatings(symbol.toUpperCase());
    res.json({ ratings });
  } catch (error: any) {
    logger.error('Get analyst ratings error:', error);
    res.status(500).json({
      error: 'Failed to fetch analyst ratings',
      message: error.message,
    });
  }
});

// Get earnings estimates
router.get('/estimates/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    logger.info(`GET /fundamental/estimates/${symbol}`);
    
    const estimates = await getEarningsEstimates(symbol.toUpperCase());
    res.json({ estimates });
  } catch (error: any) {
    logger.error('Get earnings estimates error:', error);
    res.status(500).json({
      error: 'Failed to fetch earnings estimates',
      message: error.message,
    });
  }
});

// Get short interest
router.get('/short-interest/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    logger.info(`GET /fundamental/short-interest/${symbol}`);
    
    const shortInterest = await getShortInterest(symbol.toUpperCase());
    
    if (!shortInterest) {
      return res.status(404).json({ error: 'Short interest data not found' });
    }
    
    res.json(shortInterest);
  } catch (error: any) {
    logger.error('Get short interest error:', error);
    res.status(500).json({
      error: 'Failed to fetch short interest',
      message: error.message,
    });
  }
});

// Get key metrics
router.get('/metrics/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    logger.info(`GET /fundamental/metrics/${symbol}`);
    
    const metrics = await getKeyMetrics(symbol.toUpperCase());
    
    if (!metrics) {
      return res.status(404).json({ error: 'Key metrics not found' });
    }
    
    res.json(metrics);
  } catch (error: any) {
    logger.error('Get key metrics error:', error);
    res.status(500).json({
      error: 'Failed to fetch key metrics',
      message: error.message,
    });
  }
});

// Get comprehensive stock overview
router.get('/overview/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    logger.info(`GET /fundamental/overview/${symbol}`);
    
    const [profile, metrics, ratings, shortInterest] = await Promise.all([
      getCompanyProfile(symbol.toUpperCase()),
      getKeyMetrics(symbol.toUpperCase()),
      getAnalystRatings(symbol.toUpperCase()),
      getShortInterest(symbol.toUpperCase()),
    ]);

    res.json({
      profile,
      metrics,
      ratings: ratings.slice(0, 5),
      shortInterest,
    });
  } catch (error: any) {
    logger.error('Get stock overview error:', error);
    res.status(500).json({
      error: 'Failed to fetch stock overview',
      message: error.message,
    });
  }
});

export { router as fundamentalRoutes };

