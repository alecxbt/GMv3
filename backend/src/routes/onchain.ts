import { Router } from 'express';
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

const router = Router();

// Get whale transactions
router.get('/whales', async (req, res) => {
  try {
    const { minValue = 1000000, limit = 50 } = req.query;
    logger.info('GET /onchain/whales');
    
    const transactions = await getWhaleTransactions(
      parseFloat(minValue as string),
      parseInt(limit as string)
    );
    
    res.json({ transactions });
  } catch (error: any) {
    logger.error('Get whale transactions error:', error);
    res.status(500).json({
      error: 'Failed to fetch whale transactions',
      message: error.message,
    });
  }
});

// Get exchange flows
router.get('/exchange-flows', async (req, res) => {
  try {
    logger.info('GET /onchain/exchange-flows');
    const flows = await getExchangeFlows();
    res.json({ flows });
  } catch (error: any) {
    logger.error('Get exchange flows error:', error);
    res.status(500).json({
      error: 'Failed to fetch exchange flows',
      message: error.message,
    });
  }
});

// Get funding rates
router.get('/funding-rates', async (req, res) => {
  try {
    const { symbols } = req.query;
    logger.info('GET /onchain/funding-rates');
    
    const symbolList = symbols 
      ? (symbols as string).split(',')
      : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    
    const rates = await getFundingRates(symbolList);
    res.json({ rates });
  } catch (error: any) {
    logger.error('Get funding rates error:', error);
    res.status(500).json({
      error: 'Failed to fetch funding rates',
      message: error.message,
    });
  }
});

// Get open interest
router.get('/open-interest', async (req, res) => {
  try {
    const { symbols } = req.query;
    logger.info('GET /onchain/open-interest');
    
    const symbolList = symbols 
      ? (symbols as string).split(',')
      : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    
    const oi = await getOpenInterest(symbolList);
    res.json({ openInterest: oi });
  } catch (error: any) {
    logger.error('Get open interest error:', error);
    res.status(500).json({
      error: 'Failed to fetch open interest',
      message: error.message,
    });
  }
});

// Get liquidations
router.get('/liquidations', async (req, res) => {
  try {
    logger.info('GET /onchain/liquidations');
    const liquidations = await getLiquidations();
    res.json({ liquidations });
  } catch (error: any) {
    logger.error('Get liquidations error:', error);
    res.status(500).json({
      error: 'Failed to fetch liquidations',
      message: error.message,
    });
  }
});

// Get token unlocks
router.get('/token-unlocks', async (req, res) => {
  try {
    logger.info('GET /onchain/token-unlocks');
    const unlocks = await getTokenUnlocks();
    res.json({ unlocks });
  } catch (error: any) {
    logger.error('Get token unlocks error:', error);
    res.status(500).json({
      error: 'Failed to fetch token unlocks',
      message: error.message,
    });
  }
});

// Get stablecoin flows
router.get('/stablecoin-flows', async (req, res) => {
  try {
    logger.info('GET /onchain/stablecoin-flows');
    const flows = await getStablecoinFlows();
    res.json(flows);
  } catch (error: any) {
    logger.error('Get stablecoin flows error:', error);
    res.status(500).json({
      error: 'Failed to fetch stablecoin flows',
      message: error.message,
    });
  }
});

export { router as onchainRoutes };
