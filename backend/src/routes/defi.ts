import { Hono } from 'hono';
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

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  Bindings: Env;
};

const router = new Hono<{ Bindings: Env }>();

// Get all protocols
router.get('/protocols', async (c) => {
  try {
    const { chain, limit } = c.req.query();
    logger.info('GET /defi/protocols', { chain, limit });
    
    let protocols = await getAllProtocols();
    
    if (chain && chain !== 'all') {
      protocols = protocols.filter((p) => p.chain === chain);
    }
    
    if (limit) {
      protocols = protocols.slice(0, parseInt(limit as string));
    }
    
    return c.json({ protocols });
  } catch (error: any) {
    logger.error('Get protocols error:', error);
    return c.json({
      error: 'Failed to fetch protocols',
      message: error.message,
    }, 500);
  }
});

// Get protocol by ID
router.get('/protocol/:id', async (c) => {
  try {
    const { id } = c.req.param();
    logger.info(`GET /defi/protocol/${id}`);
    
    const protocol = await getProtocol(id);
    
    if (!protocol) {
      return c.json({ error: 'Protocol not found' }, 404);
    }
    
    return c.json(protocol);
  } catch (error: any) {
    logger.error('Get protocol error:', error);
    return c.json({
      error: 'Failed to fetch protocol',
      message: error.message,
    }, 500);
  }
});

// Get protocol TVL history
router.get('/protocol/:id/tvl', async (c) => {
  try {
    const { id } = c.req.param();
    logger.info(`GET /defi/protocol/${id}/tvl`);
    
    const tvlData = await getProtocolTVL(id);
    return c.json({ protocol: id, tvl: tvlData });
  } catch (error: any) {
    logger.error('Get protocol TVL error:', error);
    return c.json({
      error: 'Failed to fetch protocol TVL',
      message: error.message,
    }, 500);
  }
});

// Get global TVL
router.get('/tvl/global', async (c) => {
  try {
    logger.info('GET /defi/tvl/global');
    const tvlData = await getGlobalTVL();
    return c.json({ tvl: tvlData });
  } catch (error: any) {
    logger.error('Get global TVL error:', error);
    return c.json({
      error: 'Failed to fetch global TVL',
      message: error.message,
    }, 500);
  }
});

// Get chain TVL breakdown
router.get('/tvl/chains', async (c) => {
  try {
    logger.info('GET /defi/tvl/chains');
    const chainTVL = await getChainTVL();
    return c.json({ chains: chainTVL });
  } catch (error: any) {
    logger.error('Get chain TVL error:', error);
    return c.json({
      error: 'Failed to fetch chain TVL',
      message: error.message,
    }, 500);
  }
});

// Get yield opportunities
router.get('/yields', async (c) => {
  try {
    const { minTVL, minAPY, chain } = c.req.query();
    logger.info('GET /defi/yields', { minTVL, minAPY, chain });
    
    const opportunities = await getYieldOpportunities(
      parseFloat(minTVL as string) || 100000,
      parseFloat(minAPY as string) || 0,
      chain as string | undefined
    );
    
    return c.json({ opportunities });
  } catch (error: any) {
    logger.error('Get yield opportunities error:', error);
    return c.json({
      error: 'Failed to fetch yield opportunities',
      message: error.message,
    }, 500);
  }
});

// Search yields by token/pair - compare yields across chains
router.get('/yields/search', async (c) => {
  try {
    const { token, minTVL, minAPY } = c.req.query();
    
    if (!token) {
      return c.json({ error: 'Token query parameter required' }, 400);
    }
    
    logger.info('GET /defi/yields/search', { token, minTVL, minAPY });
    
    const results = await searchYieldsByToken(
      token as string,
      parseFloat(minTVL as string) || 10000,
      parseFloat(minAPY as string) || 0
    );
    
    return c.json(results);
  } catch (error: any) {
    logger.error('Search yields error:', error);
    return c.json({
      error: 'Failed to search yields',
      message: error.message,
    }, 500);
  }
});

// Get stablecoin yields overview
router.get('/yields/stablecoins', async (c) => {
  try {
    const { minTVL } = c.req.query();
    logger.info('GET /defi/yields/stablecoins', { minTVL });
    
    const results = await getStablecoinYields(parseFloat(minTVL as string) || 100000);
    return c.json(results);
  } catch (error: any) {
    logger.error('Get stablecoin yields error:', error);
    return c.json({
      error: 'Failed to fetch stablecoin yields',
      message: error.message,
    }, 500);
  }
});

// Get protocol rankings
router.get('/rankings', async (c) => {
  try {
    const { limit, chain } = c.req.query();
    logger.info('GET /defi/rankings', { limit, chain });
    
    const rankings = await getProtocolRankings(
      parseInt(limit as string) || 50,
      chain as string | undefined
    );
    
    return c.json({ rankings });
  } catch (error: any) {
    logger.error('Get protocol rankings error:', error);
    return c.json({
      error: 'Failed to fetch protocol rankings',
      message: error.message,
    }, 500);
  }
});

// Search protocols
router.get('/search', async (c) => {
  try {
    const { q } = c.req.query();
    
    if (!q) {
      return c.json({ error: 'Query parameter required' }, 400);
    }
    
    logger.info('GET /defi/search', { q });
    const results = await searchProtocols(q as string);
    
    return c.json({ protocols: results });
  } catch (error: any) {
    logger.error('Search protocols error:', error);
    return c.json({
      error: 'Failed to search protocols',
      message: error.message,
    }, 500);
  }
});

// Get protocol revenue data
router.get('/protocol/:id/revenue', async (c) => {
  try {
    const { id } = c.req.param();
    logger.info(`GET /defi/protocol/${id}/revenue`);
    
    const revenue = await getProtocolRevenue(id);
    
    if (!revenue) {
      return c.json({ error: 'Revenue data not available for this protocol' }, 404);
    }
    
    return c.json(revenue);
  } catch (error: any) {
    logger.error('Get protocol revenue error:', error);
    return c.json({
      error: 'Failed to fetch protocol revenue',
      message: error.message,
    }, 500);
  }
});

// Get protocol revenue history
router.get('/protocol/:id/revenue/history', async (c) => {
  try {
    const { id } = c.req.param();
    logger.info(`GET /defi/protocol/${id}/revenue/history`);
    
    const history = await getProtocolRevenueHistory(id);
    return c.json({ protocol: id, revenue: history });
  } catch (error: any) {
    logger.error('Get protocol revenue history error:', error);
    return c.json({
      error: 'Failed to fetch protocol revenue history',
      message: error.message,
    }, 500);
  }
});

// Get chain revenue data
router.get('/chain/:chain/revenue', async (c) => {
  try {
    const { chain } = c.req.param();
    logger.info(`GET /defi/chain/${chain}/revenue`);
    
    const revenue = await getChainRevenue(chain);
    
    if (!revenue) {
      return c.json({ error: 'Revenue data not available for this chain' }, 404);
    }
    
    return c.json(revenue);
  } catch (error: any) {
    logger.error('Get chain revenue error:', error);
    return c.json({
      error: 'Failed to fetch chain revenue',
      message: error.message,
    }, 500);
  }
});

// Get all protocols with revenue data for comparison
router.get('/revenue/protocols', async (c) => {
  try {
    const { limit } = c.req.query();
    logger.info('GET /defi/revenue/protocols', { limit });
    
    const protocols = await getProtocolsWithRevenue(parseInt(limit as string) || 50);
    return c.json({ protocols });
  } catch (error: any) {
    logger.error('Get protocols with revenue error:', error);
    return c.json({
      error: 'Failed to fetch protocols with revenue',
      message: error.message,
    }, 500);
  }
});

// Get all chains revenue data
router.get('/revenue/chains', async (c) => {
  try {
    logger.info('GET /defi/revenue/chains');
    
    const chains = await getAllChainsRevenue();
    return c.json({ chains });
  } catch (error: any) {
    logger.error('Get all chains revenue error:', error);
    return c.json({
      error: 'Failed to fetch chains revenue',
      message: error.message,
    }, 500);
  }
});

export { router as defiRoutes };