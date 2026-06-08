import { Hono } from 'hono';
import { logger } from '../utils/logger.js';
import {
  getWhaleTransactions,
  getExchangeFlows,
  getFundingRates,
  getOpenInterest,
  getLiquidations,
  getTokenUnlocks,
  getStablecoinFlows,
} from '../services/onChainData.js';

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  Bindings: Env;
};

const router = new Hono<{ Bindings: Env }>();

// Get whale transactions
router.get('/whales', async (c) => {
  try {
    const { minValue, limit } = c.req.query();
    logger.info('GET /onchain/whales');
    
    const transactions = await getWhaleTransactions(
      parseFloat(minValue as string) || 1000000,
      parseInt(limit as string) || 50
    );
    
    return c.json({ transactions });
  } catch (error: any) {
    logger.error('Get whale transactions error:', error);
    return c.json({
      error: 'Failed to fetch whale transactions',
      message: error.message,
    }, 500);
  }
});

// Get exchange flows
router.get('/exchange-flows', async (c) => {
  try {
    logger.info('GET /onchain/exchange-flows');
    const flows = await getExchangeFlows();
    return c.json({ flows });
  } catch (error: any) {
    logger.error('Get exchange flows error:', error);
    return c.json({
      error: 'Failed to fetch exchange flows',
      message: error.message,
    }, 500);
  }
});

// Get funding rates
router.get('/funding-rates', async (c) => {
  try {
    const { symbols } = c.req.query();
    logger.info('GET /onchain/funding-rates');
    
    const symbolList = symbols 
      ? (symbols as string).split(',')
      : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    
    const rates = await getFundingRates(symbolList);
    return c.json({ rates });
  } catch (error: any) {
    logger.error('Get funding rates error:', error);
    return c.json({
      error: 'Failed to fetch funding rates',
      message: error.message,
    }, 500);
  }
});

// Get open interest
router.get('/open-interest', async (c) => {
  try {
    const { symbols } = c.req.query();
    logger.info('GET /onchain/open-interest');
    
    const symbolList = symbols 
      ? (symbols as string).split(',')
      : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    
    const oi = await getOpenInterest(symbolList);
    return c.json({ openInterest: oi });
  } catch (error: any) {
    logger.error('Get open interest error:', error);
    return c.json({
      error: 'Failed to fetch open interest',
      message: error.message,
    }, 500);
  }
});

// Get liquidations
router.get('/liquidations', async (c) => {
  try {
    logger.info('GET /onchain/liquidations');
    const liquidations = await getLiquidations();
    return c.json({ liquidations });
  } catch (error: any) {
    logger.error('Get liquidations error:', error);
    return c.json({
      error: 'Failed to fetch liquidations',
      message: error.message,
    }, 500);
  }
});

// Get token unlocks
router.get('/token-unlocks', async (c) => {
  try {
    logger.info('GET /onchain/token-unlocks');
    const unlocks = await getTokenUnlocks();
    return c.json({ unlocks });
  } catch (error: any) {
    logger.error('Get token unlocks error:', error);
    return c.json({
      error: 'Failed to fetch token unlocks',
      message: error.message,
    }, 500);
  }
});

// Get stablecoin flows
router.get('/stablecoin-flows', async (c) => {
  try {
    logger.info('GET /onchain/stablecoin-flows');
    const flows = await getStablecoinFlows();
    return c.json(flows);
  } catch (error: any) {
    logger.error('Get stablecoin flows error:', error);
    return c.json({
      error: 'Failed to fetch stablecoin flows',
      message: error.message,
    }, 500);
  }
});

export { router as onchainRoutes };