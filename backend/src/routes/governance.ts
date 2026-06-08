import { Hono } from 'hono';
import { logger } from '../utils/logger.js';
import {
  getActiveProposals,
  getDAOProposals,
  getTopDAOs,
  getDAODetails,
  getProposalVotes,
  searchDAOs,
  getGovernanceSummary,
} from '../services/governanceData.js';

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  Bindings: Env;
};

const router = new Hono<{ Bindings: Env }>();

// Get active proposals across all DAOs
router.get('/proposals/active', async (c) => {
  try {
    const { limit } = c.req.query();
    logger.info('GET /governance/proposals/active');
    
    const proposals = await getActiveProposals(parseInt(limit as string) || 50);
    return c.json({ proposals });
  } catch (error: any) {
    logger.error('Get active proposals error:', error);
    return c.json({
      error: 'Failed to fetch active proposals',
      message: error.message,
    }, 500);
  }
});

// Get proposals for a specific DAO
router.get('/dao/:spaceId/proposals', async (c) => {
  try {
    const { spaceId } = c.req.param();
    const { state, limit } = c.req.query();
    logger.info(`GET /governance/dao/${spaceId}/proposals`);
    
    const proposals = await getDAOProposals(
      spaceId,
      state as 'active' | 'pending' | 'closed' | undefined,
      parseInt(limit as string) || 20
    );
    
    return c.json({ proposals });
  } catch (error: any) {
    logger.error('Get DAO proposals error:', error);
    return c.json({
      error: 'Failed to fetch DAO proposals',
      message: error.message,
    }, 500);
  }
});

// Get top DAOs
router.get('/daos', async (c) => {
  try {
    const { limit } = c.req.query();
    logger.info('GET /governance/daos');
    
    const daos = await getTopDAOs(parseInt(limit as string) || 30);
    return c.json({ daos });
  } catch (error: any) {
    logger.error('Get top DAOs error:', error);
    return c.json({
      error: 'Failed to fetch DAOs',
      message: error.message,
    }, 500);
  }
});

// Get DAO details
router.get('/dao/:spaceId', async (c) => {
  try {
    const { spaceId } = c.req.param();
    logger.info(`GET /governance/dao/${spaceId}`);
    
    const dao = await getDAODetails(spaceId);
    
    if (!dao) {
      return c.json({ error: 'DAO not found' }, 404);
    }
    
    return c.json(dao);
  } catch (error: any) {
    logger.error('Get DAO details error:', error);
    return c.json({
      error: 'Failed to fetch DAO details',
      message: error.message,
    }, 500);
  }
});

// Get votes for a proposal
router.get('/proposal/:proposalId/votes', async (c) => {
  try {
    const { proposalId } = c.req.param();
    const { limit } = c.req.query();
    logger.info(`GET /governance/proposal/${proposalId}/votes`);
    
    const votes = await getProposalVotes(proposalId, parseInt(limit as string) || 100);
    return c.json({ votes });
  } catch (error: any) {
    logger.error('Get proposal votes error:', error);
    return c.json({
      error: 'Failed to fetch votes',
      message: error.message,
    }, 500);
  }
});

// Search DAOs
router.get('/search', async (c) => {
  try {
    const { q } = c.req.query();
    
    if (!q) {
      return c.json({ error: 'Query parameter required' }, 400);
    }
    
    logger.info(`GET /governance/search?q=${q}`);
    
    const daos = await searchDAOs(q as string);
    return c.json({ daos });
  } catch (error: any) {
    logger.error('Search DAOs error:', error);
    return c.json({
      error: 'Failed to search DAOs',
      message: error.message,
    }, 500);
  }
});

// Get governance summary
router.get('/summary', async (c) => {
  try {
    logger.info('GET /governance/summary');
    const summary = await getGovernanceSummary();
    return c.json(summary);
  } catch (error: any) {
    logger.error('Get governance summary error:', error);
    return c.json({
      error: 'Failed to fetch governance summary',
      message: error.message,
    }, 500);
  }
});

export { router as governanceRoutes };