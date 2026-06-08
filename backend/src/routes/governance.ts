import { Router } from 'express';
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

const router = Router();

// Get active proposals across all DAOs
router.get('/proposals/active', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    logger.info('GET /governance/proposals/active');
    
    const proposals = await getActiveProposals(parseInt(limit as string));
    res.json({ proposals });
  } catch (error: any) {
    logger.error('Get active proposals error:', error);
    res.status(500).json({
      error: 'Failed to fetch active proposals',
      message: error.message,
    });
  }
});

// Get proposals for a specific DAO
router.get('/dao/:spaceId/proposals', async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { state, limit = 20 } = req.query;
    logger.info(`GET /governance/dao/${spaceId}/proposals`);
    
    const proposals = await getDAOProposals(
      spaceId,
      state as 'active' | 'pending' | 'closed' | undefined,
      parseInt(limit as string)
    );
    
    res.json({ proposals });
  } catch (error: any) {
    logger.error('Get DAO proposals error:', error);
    res.status(500).json({
      error: 'Failed to fetch DAO proposals',
      message: error.message,
    });
  }
});

// Get top DAOs
router.get('/daos', async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    logger.info('GET /governance/daos');
    
    const daos = await getTopDAOs(parseInt(limit as string));
    res.json({ daos });
  } catch (error: any) {
    logger.error('Get top DAOs error:', error);
    res.status(500).json({
      error: 'Failed to fetch DAOs',
      message: error.message,
    });
  }
});

// Get DAO details
router.get('/dao/:spaceId', async (req, res) => {
  try {
    const { spaceId } = req.params;
    logger.info(`GET /governance/dao/${spaceId}`);
    
    const dao = await getDAODetails(spaceId);
    
    if (!dao) {
      return res.status(404).json({ error: 'DAO not found' });
    }
    
    res.json(dao);
  } catch (error: any) {
    logger.error('Get DAO details error:', error);
    res.status(500).json({
      error: 'Failed to fetch DAO details',
      message: error.message,
    });
  }
});

// Get votes for a proposal
router.get('/proposal/:proposalId/votes', async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { limit = 100 } = req.query;
    logger.info(`GET /governance/proposal/${proposalId}/votes`);
    
    const votes = await getProposalVotes(proposalId, parseInt(limit as string));
    res.json({ votes });
  } catch (error: any) {
    logger.error('Get proposal votes error:', error);
    res.status(500).json({
      error: 'Failed to fetch votes',
      message: error.message,
    });
  }
});

// Search DAOs
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter required' });
    }
    
    logger.info(`GET /governance/search?q=${q}`);
    
    const daos = await searchDAOs(q as string);
    res.json({ daos });
  } catch (error: any) {
    logger.error('Search DAOs error:', error);
    res.status(500).json({
      error: 'Failed to search DAOs',
      message: error.message,
    });
  }
});

// Get governance summary
router.get('/summary', async (req, res) => {
  try {
    logger.info('GET /governance/summary');
    const summary = await getGovernanceSummary();
    res.json(summary);
  } catch (error: any) {
    logger.error('Get governance summary error:', error);
    res.status(500).json({
      error: 'Failed to fetch governance summary',
      message: error.message,
    });
  }
});

export { router as governanceRoutes };

