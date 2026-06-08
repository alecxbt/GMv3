import axios from 'axios';
import { logger } from '../utils/logger.js';

// Free API endpoints
const SNAPSHOT_API = 'https://hub.snapshot.org/graphql';
const TALLY_API = 'https://api.tally.xyz/query';
const BOARDROOM_API = 'https://api.boardroom.info/v1';

// Cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes

export interface GovernanceProposal {
  id: string;
  title: string;
  description?: string;
  protocol: string;
  protocolLogo?: string;
  state: 'active' | 'pending' | 'closed' | 'executed';
  type: 'single-choice' | 'approval' | 'quadratic' | 'ranked-choice' | 'weighted' | 'basic';
  author: string;
  created: number;
  start: number;
  end: number;
  choices: string[];
  scores: number[];
  scoresTotal: number;
  quorum?: number;
  voters: number;
  link?: string;
}

export interface DAO {
  id: string;
  name: string;
  symbol?: string;
  network: string;
  treasury?: number;
  members?: number;
  proposals: number;
  activeProposals: number;
  logo?: string;
  website?: string;
  twitter?: string;
}

export interface Vote {
  voter: string;
  choice: number | number[];
  votingPower: number;
  timestamp: number;
  proposal: string;
}

export interface TreasuryData {
  dao: string;
  totalValue: number;
  assets: {
    token: string;
    symbol: string;
    amount: number;
    value: number;
    percentage: number;
  }[];
  change24h?: number;
  change7d?: number;
}

/**
 * Get active governance proposals across DAOs
 */
export async function getActiveProposals(limit: number = 50): Promise<GovernanceProposal[]> {
  const cacheKey = `governance:proposals:active`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info('Fetching active governance proposals');
    const proposals: GovernanceProposal[] = [];

    // Snapshot GraphQL query for active proposals
    const snapshotQuery = `
      query {
        proposals(
          first: ${limit},
          skip: 0,
          where: {
            state: "active"
          },
          orderBy: "created",
          orderDirection: desc
        ) {
          id
          title
          body
          choices
          start
          end
          state
          author
          created
          scores
          scores_total
          quorum
          votes
          space {
            id
            name
            avatar
          }
        }
      }
    `;

    try {
      const response = await axios.post(
        SNAPSHOT_API,
        { query: snapshotQuery },
        { timeout: 15000 }
      );

      if (response.data?.data?.proposals) {
        for (const p of response.data.data.proposals) {
          proposals.push({
            id: p.id,
            title: p.title,
            description: p.body?.slice(0, 500),
            protocol: p.space?.name || p.space?.id || 'Unknown',
            protocolLogo: p.space?.avatar,
            state: p.state,
            type: 'single-choice',
            author: p.author,
            created: p.created * 1000,
            start: p.start * 1000,
            end: p.end * 1000,
            choices: p.choices || [],
            scores: p.scores || [],
            scoresTotal: p.scores_total || 0,
            quorum: p.quorum,
            voters: p.votes || 0,
            link: `https://snapshot.org/#/${p.space?.id}/proposal/${p.id}`,
          });
        }
      }
    } catch (e: any) {
      logger.debug('Snapshot proposals failed:', e.message);
    }

    // Sort by end date (soonest first)
    proposals.sort((a, b) => a.end - b.end);

    cache.set(cacheKey, { data: proposals, timestamp: Date.now() });
    return proposals;
  } catch (error: any) {
    logger.error('Error fetching active proposals:', error.message);
    return [];
  }
}

/**
 * Get proposals for a specific DAO
 */
export async function getDAOProposals(
  spaceId: string,
  state?: 'active' | 'pending' | 'closed',
  limit: number = 20
): Promise<GovernanceProposal[]> {
  const cacheKey = `governance:proposals:${spaceId}:${state || 'all'}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info(`Fetching proposals for ${spaceId}`);
    const proposals: GovernanceProposal[] = [];

    const whereClause = state 
      ? `space: "${spaceId}", state: "${state}"`
      : `space: "${spaceId}"`;

    const snapshotQuery = `
      query {
        proposals(
          first: ${limit},
          where: { ${whereClause} },
          orderBy: "created",
          orderDirection: desc
        ) {
          id
          title
          body
          choices
          start
          end
          state
          author
          created
          scores
          scores_total
          quorum
          votes
          space {
            id
            name
            avatar
          }
        }
      }
    `;

    try {
      const response = await axios.post(
        SNAPSHOT_API,
        { query: snapshotQuery },
        { timeout: 15000 }
      );

      if (response.data?.data?.proposals) {
        for (const p of response.data.data.proposals) {
          proposals.push({
            id: p.id,
            title: p.title,
            description: p.body?.slice(0, 500),
            protocol: p.space?.name || spaceId,
            protocolLogo: p.space?.avatar,
            state: p.state,
            type: 'single-choice',
            author: p.author,
            created: p.created * 1000,
            start: p.start * 1000,
            end: p.end * 1000,
            choices: p.choices || [],
            scores: p.scores || [],
            scoresTotal: p.scores_total || 0,
            quorum: p.quorum,
            voters: p.votes || 0,
            link: `https://snapshot.org/#/${spaceId}/proposal/${p.id}`,
          });
        }
      }
    } catch (e: any) {
      logger.debug(`Snapshot proposals for ${spaceId} failed:`, e.message);
    }

    cache.set(cacheKey, { data: proposals, timestamp: Date.now() });
    return proposals;
  } catch (error: any) {
    logger.error(`Error fetching proposals for ${spaceId}:`, error.message);
    return [];
  }
}

/**
 * Get top DAOs by activity
 */
export async function getTopDAOs(limit: number = 30): Promise<DAO[]> {
  const cacheKey = 'governance:daos:top';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 2) {
    return cached.data;
  }

  try {
    logger.info('Fetching top DAOs');
    const daos: DAO[] = [];

    // Get spaces from Snapshot
    const snapshotQuery = `
      query {
        spaces(
          first: ${limit},
          orderBy: "followersCount",
          orderDirection: desc
        ) {
          id
          name
          symbol
          network
          members
          proposalsCount
          activeProposals
          avatar
          website
          twitter
          treasuries {
            network
            address
          }
        }
      }
    `;

    try {
      const response = await axios.post(
        SNAPSHOT_API,
        { query: snapshotQuery },
        { timeout: 15000 }
      );

      if (response.data?.data?.spaces) {
        for (const s of response.data.data.spaces) {
          daos.push({
            id: s.id,
            name: s.name,
            symbol: s.symbol,
            network: s.network || 'ethereum',
            members: s.members || 0,
            proposals: s.proposalsCount || 0,
            activeProposals: s.activeProposals || 0,
            logo: s.avatar,
            website: s.website,
            twitter: s.twitter,
          });
        }
      }
    } catch (e: any) {
      logger.debug('Snapshot spaces failed:', e.message);
    }

    // Fallback with known DAOs
    if (daos.length === 0) {
      daos.push(
        { id: 'aave.eth', name: 'Aave', symbol: 'AAVE', network: 'ethereum', proposals: 100, activeProposals: 2, members: 50000 },
        { id: 'uniswap', name: 'Uniswap', symbol: 'UNI', network: 'ethereum', proposals: 50, activeProposals: 1, members: 100000 },
        { id: 'ens.eth', name: 'ENS', symbol: 'ENS', network: 'ethereum', proposals: 40, activeProposals: 3, members: 30000 },
        { id: 'arbitrumfoundation.eth', name: 'Arbitrum', symbol: 'ARB', network: 'arbitrum', proposals: 30, activeProposals: 5, members: 80000 },
        { id: 'opcollective.eth', name: 'Optimism', symbol: 'OP', network: 'optimism', proposals: 25, activeProposals: 4, members: 60000 },
        { id: 'gitcoindao.eth', name: 'Gitcoin', symbol: 'GTC', network: 'ethereum', proposals: 60, activeProposals: 2, members: 25000 },
        { id: 'lido-snapshot.eth', name: 'Lido', symbol: 'LDO', network: 'ethereum', proposals: 80, activeProposals: 3, members: 40000 },
        { id: 'safe.eth', name: 'Safe', symbol: 'SAFE', network: 'ethereum', proposals: 20, activeProposals: 1, members: 20000 },
      );
    }

    cache.set(cacheKey, { data: daos, timestamp: Date.now() });
    return daos;
  } catch (error: any) {
    logger.error('Error fetching top DAOs:', error.message);
    return [];
  }
}

/**
 * Get DAO details
 */
export async function getDAODetails(spaceId: string): Promise<DAO | null> {
  const cacheKey = `governance:dao:${spaceId}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info(`Fetching DAO details for ${spaceId}`);

    const snapshotQuery = `
      query {
        space(id: "${spaceId}") {
          id
          name
          symbol
          network
          members
          proposalsCount
          activeProposals
          avatar
          website
          twitter
          about
        }
      }
    `;

    try {
      const response = await axios.post(
        SNAPSHOT_API,
        { query: snapshotQuery },
        { timeout: 10000 }
      );

      if (response.data?.data?.space) {
        const s = response.data.data.space;
        const dao: DAO = {
          id: s.id,
          name: s.name,
          symbol: s.symbol,
          network: s.network || 'ethereum',
          members: s.members || 0,
          proposals: s.proposalsCount || 0,
          activeProposals: s.activeProposals || 0,
          logo: s.avatar,
          website: s.website,
          twitter: s.twitter,
        };

        cache.set(cacheKey, { data: dao, timestamp: Date.now() });
        return dao;
      }
    } catch (e: any) {
      logger.debug(`Snapshot space ${spaceId} failed:`, e.message);
    }

    return null;
  } catch (error: any) {
    logger.error(`Error fetching DAO ${spaceId}:`, error.message);
    return null;
  }
}

/**
 * Get recent votes on a proposal
 */
export async function getProposalVotes(proposalId: string, limit: number = 100): Promise<Vote[]> {
  const cacheKey = `governance:votes:${proposalId}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL / 2) {
    return cached.data;
  }

  try {
    logger.info(`Fetching votes for proposal ${proposalId}`);
    const votes: Vote[] = [];

    const snapshotQuery = `
      query {
        votes(
          first: ${limit},
          where: { proposal: "${proposalId}" },
          orderBy: "vp",
          orderDirection: desc
        ) {
          voter
          choice
          vp
          created
        }
      }
    `;

    try {
      const response = await axios.post(
        SNAPSHOT_API,
        { query: snapshotQuery },
        { timeout: 10000 }
      );

      if (response.data?.data?.votes) {
        for (const v of response.data.data.votes) {
          votes.push({
            voter: v.voter,
            choice: v.choice,
            votingPower: v.vp || 0,
            timestamp: v.created * 1000,
            proposal: proposalId,
          });
        }
      }
    } catch (e: any) {
      logger.debug(`Snapshot votes for ${proposalId} failed:`, e.message);
    }

    cache.set(cacheKey, { data: votes, timestamp: Date.now() });
    return votes;
  } catch (error: any) {
    logger.error(`Error fetching votes for ${proposalId}:`, error.message);
    return [];
  }
}

/**
 * Search DAOs
 */
export async function searchDAOs(query: string): Promise<DAO[]> {
  const cacheKey = `governance:search:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info(`Searching DAOs for: ${query}`);
    
    // Get all DAOs and filter client-side
    const allDAOs = await getTopDAOs(100);
    const queryLower = query.toLowerCase();
    
    const results = allDAOs.filter(dao =>
      dao.name.toLowerCase().includes(queryLower) ||
      dao.id.toLowerCase().includes(queryLower) ||
      dao.symbol?.toLowerCase().includes(queryLower)
    );

    cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  } catch (error: any) {
    logger.error(`Error searching DAOs:`, error.message);
    return [];
  }
}

/**
 * Get governance summary (ending soon, high activity, etc.)
 */
export async function getGovernanceSummary(): Promise<{
  endingSoon: GovernanceProposal[];
  highActivity: GovernanceProposal[];
  recentlyCreated: GovernanceProposal[];
  stats: {
    activeProposals: number;
    totalDAOs: number;
    totalVoters24h: number;
  };
}> {
  const cacheKey = 'governance:summary';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info('Fetching governance summary');

    const [proposals, daos] = await Promise.all([
      getActiveProposals(100),
      getTopDAOs(50),
    ]);

    const now = Date.now();
    const oneDayFromNow = now + 24 * 60 * 60 * 1000;

    // Ending within 24 hours
    const endingSoon = proposals
      .filter(p => p.end > now && p.end < oneDayFromNow)
      .slice(0, 10);

    // High activity (most voters)
    const highActivity = [...proposals]
      .sort((a, b) => b.voters - a.voters)
      .slice(0, 10);

    // Recently created (last 24h)
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentlyCreated = proposals
      .filter(p => p.created > oneDayAgo)
      .slice(0, 10);

    const result = {
      endingSoon,
      highActivity,
      recentlyCreated,
      stats: {
        activeProposals: proposals.length,
        totalDAOs: daos.length,
        totalVoters24h: proposals.reduce((sum, p) => sum + p.voters, 0),
      },
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error: any) {
    logger.error('Error fetching governance summary:', error.message);
    return {
      endingSoon: [],
      highActivity: [],
      recentlyCreated: [],
      stats: { activeProposals: 0, totalDAOs: 0, totalVoters24h: 0 },
    };
  }
}

