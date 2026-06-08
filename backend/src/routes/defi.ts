import { Router } from 'express';
import { logger } from '../utils/logger.js';
import {
  getAllProtocols,
  getProtocol,
  getProtocolTVL,
  getGlobalTVL,
  getYieldOpportunities,
  getProtocolRankings,
  searchProtocols,
  getChainTVL,
  getProtocolRevenue,
  getProtocolRevenueHistory,
  getChainRevenue,
  getProtocolsWithRevenue,
  getAllChainsRevenue,
  searchYieldsByToken,
  getStablecoinYields,
} from '../services/defiData.js';

const router = Router();

// Get all protocols
router.get('/protocols', async (req, res) => {
  try {
    const { chain, limit } = req.query;
    logger.info('GET /defi/protocols', { chain, limit });
    
    let protocols = await getAllProtocols();
    
    if (chain && chain !== 'all') {
      protocols = protocols.filter((p) => p.chain === chain);
    }
    
    if (limit) {
      protocols = protocols.slice(0, parseInt(limit as string));
    }
    
    res.json({ protocols });
  } catch (error: any) {
    logger.error('Get protocols error:', error);
    res.status(500).json({
      error: 'Failed to fetch protocols',
      message: error.message,
    });
  }
});

// Get protocol by ID
router.get('/protocol/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`GET /defi/protocol/${id}`);
    
    const protocol = await getProtocol(id);
    
    if (!protocol) {
      return res.status(404).json({ error: 'Protocol not found' });
    }
    
    res.json(protocol);
  } catch (error: any) {
    logger.error('Get protocol error:', error);
    res.status(500).json({
      error: 'Failed to fetch protocol',
      message: error.message,
    });
  }
});

// Get protocol TVL history
router.get('/protocol/:id/tvl', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`GET /defi/protocol/${id}/tvl`);
    
    const tvlData = await getProtocolTVL(id);
    res.json({ protocol: id, tvl: tvlData });
  } catch (error: any) {
    logger.error('Get protocol TVL error:', error);
    res.status(500).json({
      error: 'Failed to fetch protocol TVL',
      message: error.message,
    });
  }
});

// Get global TVL
router.get('/tvl/global', async (req, res) => {
  try {
    logger.info('GET /defi/tvl/global');
    const tvlData = await getGlobalTVL();
    res.json({ tvl: tvlData });
  } catch (error: any) {
    logger.error('Get global TVL error:', error);
    res.status(500).json({
      error: 'Failed to fetch global TVL',
      message: error.message,
    });
  }
});

// Get chain TVL breakdown
router.get('/tvl/chains', async (req, res) => {
  try {
    logger.info('GET /defi/tvl/chains');
    const chainTVL = await getChainTVL();
    res.json({ chains: chainTVL });
  } catch (error: any) {
    logger.error('Get chain TVL error:', error);
    res.status(500).json({
      error: 'Failed to fetch chain TVL',
      message: error.message,
    });
  }
});

// Get yield opportunities
router.get('/yields', async (req, res) => {
  try {
    const { minTVL = 100000, minAPY = 0, chain } = req.query;
    logger.info('GET /defi/yields', { minTVL, minAPY, chain });
    
    const opportunities = await getYieldOpportunities(
      parseFloat(minTVL as string),
      parseFloat(minAPY as string),
      chain as string | undefined
    );
    
    res.json({ opportunities });
  } catch (error: any) {
    logger.error('Get yield opportunities error:', error);
    res.status(500).json({
      error: 'Failed to fetch yield opportunities',
      message: error.message,
    });
  }
});

// Search yields by token/pair - compare yields across chains
router.get('/yields/search', async (req, res) => {
  try {
    const { token, minTVL = 10000, minAPY = 0 } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Token query parameter required' });
    }
    
    logger.info('GET /defi/yields/search', { token, minTVL, minAPY });
    
    const results = await searchYieldsByToken(
      token as string,
      parseFloat(minTVL as string),
      parseFloat(minAPY as string)
    );
    
    res.json(results);
  } catch (error: any) {
    logger.error('Search yields error:', error);
    res.status(500).json({
      error: 'Failed to search yields',
      message: error.message,
    });
  }
});

// Get stablecoin yields overview
router.get('/yields/stablecoins', async (req, res) => {
  try {
    const { minTVL = 100000 } = req.query;
    logger.info('GET /defi/yields/stablecoins', { minTVL });
    
    const results = await getStablecoinYields(parseFloat(minTVL as string));
    res.json(results);
  } catch (error: any) {
    logger.error('Get stablecoin yields error:', error);
    res.status(500).json({
      error: 'Failed to fetch stablecoin yields',
      message: error.message,
    });
  }
});

// Get protocol rankings
router.get('/rankings', async (req, res) => {
  try {
    const { limit = 50, chain } = req.query;
    logger.info('GET /defi/rankings', { limit, chain });
    
    const rankings = await getProtocolRankings(
      parseInt(limit as string),
      chain as string | undefined
    );
    
    res.json({ rankings });
  } catch (error: any) {
    logger.error('Get protocol rankings error:', error);
    res.status(500).json({
      error: 'Failed to fetch protocol rankings',
      message: error.message,
    });
  }
});

// Search protocols
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter required' });
    }
    
    logger.info('GET /defi/search', { q });
    const results = await searchProtocols(q as string);
    
    res.json({ protocols: results });
  } catch (error: any) {
    logger.error('Search protocols error:', error);
    res.status(500).json({
      error: 'Failed to search protocols',
      message: error.message,
    });
  }
});

// Get protocol revenue data
router.get('/protocol/:id/revenue', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`GET /defi/protocol/${id}/revenue`);
    
    const revenue = await getProtocolRevenue(id);
    
    if (!revenue) {
      return res.status(404).json({ error: 'Revenue data not available for this protocol' });
    }
    
    res.json(revenue);
  } catch (error: any) {
    logger.error('Get protocol revenue error:', error);
    res.status(500).json({
      error: 'Failed to fetch protocol revenue',
      message: error.message,
    });
  }
});

// Get protocol revenue history
router.get('/protocol/:id/revenue/history', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`GET /defi/protocol/${id}/revenue/history`);
    
    const history = await getProtocolRevenueHistory(id);
    res.json({ protocol: id, revenue: history });
  } catch (error: any) {
    logger.error('Get protocol revenue history error:', error);
    res.status(500).json({
      error: 'Failed to fetch protocol revenue history',
      message: error.message,
    });
  }
});

// Get chain revenue data
router.get('/chain/:chain/revenue', async (req, res) => {
  try {
    const { chain } = req.params;
    logger.info(`GET /defi/chain/${chain}/revenue`);
    
    const revenue = await getChainRevenue(chain);
    
    if (!revenue) {
      return res.status(404).json({ error: 'Revenue data not available for this chain' });
    }
    
    res.json(revenue);
  } catch (error: any) {
    logger.error('Get chain revenue error:', error);
    res.status(500).json({
      error: 'Failed to fetch chain revenue',
      message: error.message,
    });
  }
});

// Get all protocols with revenue data for comparison
router.get('/revenue/protocols', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    logger.info('GET /defi/revenue/protocols', { limit });
    
    const protocols = await getProtocolsWithRevenue(parseInt(limit as string));
    res.json({ protocols });
  } catch (error: any) {
    logger.error('Get protocols with revenue error:', error);
    res.status(500).json({
      error: 'Failed to fetch protocols with revenue',
      message: error.message,
    });
  }
});

// Get all chains revenue data
router.get('/revenue/chains', async (req, res) => {
  try {
    logger.info('GET /defi/revenue/chains');
    
    const chains = await getAllChainsRevenue();
    res.json({ chains });
  } catch (error: any) {
    logger.error('Get all chains revenue error:', error);
    res.status(500).json({
      error: 'Failed to fetch chains revenue',
      message: error.message,
    });
  }
});

export { router as defiRoutes };

