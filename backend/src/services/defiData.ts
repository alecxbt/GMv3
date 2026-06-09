import axios from 'axios';
import { logger } from '../utils/logger.js';

// DeFiLlama API Configuration
const DEFILLAMA_API_BASE = 'https://api.llama.fi';
const DEFILLAMA_API_V2 = 'https://yields.llama.fi';

// Alternative: Try using DeFiLlama's summary endpoint for fees
// This endpoint aggregates fees data: https://api.llama.fi/summary/fees/{protocol}

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 60 seconds for DeFi data

export interface Protocol {
  id: string;
  name: string;
  address?: string;
  symbol?: string;
  url?: string;
  description?: string;
  chain: string;
  logo?: string;
  tvl?: number;
  change_1d?: number;
  change_7d?: number;
  change_30d?: number;
  mcap?: number;
  fdv?: number;
  tokenPrice?: number;
  fees24h?: number;
  fees7d?: number;
  fees30d?: number;
  revenue24h?: number;
  revenue7d?: number;
  revenue30d?: number;
  category?: string;
}

export interface TVLData {
  date: number;
  totalLiquidityUSD: number;
  protocols?: Record<string, number>;
}

export interface YieldOpportunity {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase?: number;
  apyReward?: number;
  apyMean30d?: number;
  ilRisk?: string;
  apyPct1D?: number;
  apyPct7D?: number;
  apyPct30D?: number;
  rewardTokens?: string[];
  underlyingTokens?: string[];
  poolMeta?: string;
  mu?: number;
  sigma?: number;
  count?: number;
  outlier?: boolean;
  rewardTokenSymbols?: string[];
  volumeUsd1d?: number;
  volumeUsd7d?: number;
}

export interface ProtocolTVL {
  protocol: string;
  tvl: number;
  change_1d?: number;
  change_7d?: number;
  change_30d?: number;
  chains: string[];
  category?: string;
}

export interface RevenueData {
  date: number;
  fees?: number;
  revenue?: number;
  feesUsd?: number;
  revenueUsd?: number;
}

export interface ProtocolRevenue {
  protocol: string;
  revenue24h?: number;
  revenue7d?: number;
  revenue30d?: number;
  revenue1y?: number;
  fees24h?: number;
  fees7d?: number;
  fees30d?: number;
  fees1y?: number;
  mcap?: number;
  fdv?: number;
  mcapToRevenue?: number;
  fdvToRevenue?: number;
}

export interface ChainRevenue {
  chain: string;
  revenue24h?: number;
  revenue7d?: number;
  revenue30d?: number;
  fees24h?: number;
  fees7d?: number;
  fees30d?: number;
}

/**
 * Get all protocols with TVL data
 */
export async function getAllProtocols(): Promise<Protocol[]> {
  const cacheKey = 'defi:protocols:all';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug('Fetching all protocols from DeFiLlama');
    
    const response = await axios.get(`${DEFILLAMA_API_BASE}/protocols`, {
      timeout: 10000,
    });

    if (Array.isArray(response.data)) {
      const protocols: Protocol[] = response.data.map((p: any) => ({
        id: p.id || p.name?.toLowerCase().replace(/\s+/g, '-'),
        name: p.name,
        address: p.address,
        symbol: p.symbol,
        url: p.url,
        description: p.description,
        chain: p.chain || 'multi',
        logo: p.logo,
        tvl: p.tvl || 0,
        change_1d: p.change_1d,
        change_7d: p.change_7d,
        change_30d: p.change_30d,
        mcap: p.mcap,
        fdv: p.fdv,
        tokenPrice: p.tokenPrice,
        fees24h: p.fees24h,
        fees7d: p.fees7d,
        fees30d: p.fees30d,
        revenue24h: p.revenue24h,
        revenue7d: p.revenue7d,
        revenue30d: p.revenue30d,
        category: p.category,
      }));

      cache.set(cacheKey, { data: protocols, timestamp: Date.now() });
      return protocols;
    }

    return [];
  } catch (error: any) {
    logger.error('Error fetching protocols from DeFiLlama:', error.message);
    throw new Error(`Failed to fetch protocols: ${error.message}`);
  }
}

/**
 * Get protocol by ID
 */
export async function getProtocol(protocolId: string): Promise<Protocol | null> {
  const cacheKey = `defi:protocol:${protocolId}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug(`Fetching protocol ${protocolId} from DeFiLlama`);
    
    const response = await axios.get(`${DEFILLAMA_API_BASE}/protocol/${protocolId}`, {
      timeout: 10000,
    });

    if (response.data) {
      const p = response.data;
      const protocol: Protocol = {
        id: protocolId,
        name: p.name,
        address: p.address,
        symbol: p.symbol,
        url: p.url,
        description: p.description,
        chain: p.chain || 'multi',
        logo: p.logo,
        tvl: p.tvl || 0,
        change_1d: p.change_1d,
        change_7d: p.change_7d,
        change_30d: p.change_30d,
        mcap: p.mcap,
        fdv: p.fdv,
        tokenPrice: p.tokenPrice,
        fees24h: p.fees24h,
        fees7d: p.fees7d,
        fees30d: p.fees30d,
        revenue24h: p.revenue24h,
        revenue7d: p.revenue7d,
        revenue30d: p.revenue30d,
      };

      cache.set(cacheKey, { data: protocol, timestamp: Date.now() });
      return protocol;
    }

    return null;
  } catch (error: any) {
    logger.error(`Error fetching protocol ${protocolId}:`, error.message);
    return null;
  }
}

/**
 * Get TVL data for a protocol
 */
export async function getProtocolTVL(protocolId: string): Promise<TVLData[]> {
  const cacheKey = `defi:protocol:${protocolId}:tvl`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 5) { // Cache TVL longer
    return cached.data;
  }

  try {
    logger.debug(`Fetching TVL data for protocol ${protocolId}`);
    
    const response = await axios.get(`${DEFILLAMA_API_BASE}/protocol/${protocolId}`, {
      timeout: 10000,
    });

    if (response.data?.tvl) {
      const tvlData: TVLData[] = response.data.tvl.map((point: any) => ({
        date: point.date * 1000, // Convert to milliseconds
        totalLiquidityUSD: point.totalLiquidityUSD || 0,
        protocols: point.protocols,
      }));

      cache.set(cacheKey, { data: tvlData, timestamp: Date.now() });
      return tvlData;
    }

    return [];
  } catch (error: any) {
    logger.error(`Error fetching TVL for protocol ${protocolId}:`, error.message);
    return [];
  }
}

/**
 * Get global TVL data
 */
export async function getGlobalTVL(): Promise<TVLData[]> {
  const cacheKey = 'defi:global:tvl';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 5) {
    return cached.data;
  }

  try {
    logger.debug('Fetching global TVL from DeFiLlama');
    
    const response = await axios.get(`${DEFILLAMA_API_BASE}/v2/historicalChainTvl/all`, {
      timeout: 10000,
    });

    if (response.data) {
      // Aggregate all chains
      const chainData = response.data;
      const aggregated: TVLData[] = [];

      // Get all unique dates
      const allDates = new Set<number>();
      for (const chain of Object.values(chainData) as any[]) {
        if (Array.isArray(chain)) {
          for (const point of chain) {
            allDates.add(point.date);
          }
        }
      }

      // Aggregate by date
      for (const date of Array.from(allDates).sort()) {
        let totalTvl = 0;
        const protocols: Record<string, number> = {};

        for (const [chainName, chainPoints] of Object.entries(chainData)) {
          if (Array.isArray(chainPoints)) {
            const point = chainPoints.find((p: any) => p.date === date);
            if (point) {
              totalTvl += point.tvl || 0;
              protocols[chainName] = point.tvl || 0;
            }
          }
        }

        aggregated.push({
          date: date * 1000,
          totalLiquidityUSD: totalTvl,
          protocols,
        });
      }

      cache.set(cacheKey, { data: aggregated, timestamp: Date.now() });
      return aggregated;
    }

    return [];
  } catch (error: any) {
    logger.error('Error fetching global TVL:', error.message);
    return [];
  }
}

/**
 * Get yield farming opportunities
 */
export async function getYieldOpportunities(
  minTVL: number = 100000,
  minAPY: number = 0,
  chain?: string
): Promise<YieldOpportunity[]> {
  const cacheKey = `defi:yields:${minTVL}:${minAPY}:${chain || 'all'}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug('Fetching yield opportunities from DeFiLlama');
    
    const url = chain 
      ? `${DEFILLAMA_API_V2}/pools`
      : `${DEFILLAMA_API_V2}/pools`;
    
    const response = await axios.get(url, {
      params: chain ? { chain } : {},
      timeout: 15000,
    });

    if (Array.isArray(response.data?.data)) {
      let opportunities: YieldOpportunity[] = response.data.data.map((pool: any) => ({
        pool: pool.pool,
        chain: pool.chain,
        project: pool.project,
        symbol: pool.symbol,
        tvlUsd: pool.tvlUsd || 0,
        apy: pool.apy || 0,
        apyBase: pool.apyBase,
        apyReward: pool.apyReward,
        apyMean30d: pool.apyMean30d,
        ilRisk: pool.ilRisk,
        apyPct1D: pool.apyPct1D,
        apyPct7D: pool.apyPct7D,
        apyPct30D: pool.apyPct30D,
        rewardTokens: pool.rewardTokens,
        underlyingTokens: pool.underlyingTokens,
        poolMeta: pool.poolMeta,
        mu: pool.mu,
        sigma: pool.sigma,
        count: pool.count,
        outlier: pool.outlier,
        rewardTokenSymbols: pool.rewardTokenSymbols,
        volumeUsd1d: pool.volumeUsd1d,
        volumeUsd7d: pool.volumeUsd7d,
      }));

      // Filter by min TVL and min APY
      opportunities = opportunities.filter(
        (opp) => opp.tvlUsd >= minTVL && opp.apy >= minAPY
      );

      // Sort by APY descending
      opportunities.sort((a, b) => b.apy - a.apy);

      cache.set(cacheKey, { data: opportunities, timestamp: Date.now() });
      return opportunities.slice(0, 100); // Limit to top 100
    }

    return [];
  } catch (error: any) {
    logger.error('Error fetching yield opportunities:', error.message);
    return [];
  }
}

/**
 * Search yields by token symbol/pair
 * Allows users to find the best yields for a specific token across all chains and protocols
 */
export async function searchYieldsByToken(
  tokenQuery: string,
  minTVL: number = 10000,
  minAPY: number = 0
): Promise<{ 
  query: string;
  results: YieldOpportunity[];
  groupedByChain: Record<string, YieldOpportunity[]>;
  bestOverall: YieldOpportunity | null;
  bestByChain: Record<string, YieldOpportunity>;
}> {
  const cacheKey = `defi:yields:search:${tokenQuery.toLowerCase()}:${minTVL}:${minAPY}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info(`Searching yields for token: ${tokenQuery}`);
    
    // Fetch all pools
    const response = await axios.get(`${DEFILLAMA_API_V2}/pools`, {
      timeout: 20000,
    });

    if (!Array.isArray(response.data?.data)) {
      return {
        query: tokenQuery,
        results: [],
        groupedByChain: {},
        bestOverall: null,
        bestByChain: {},
      };
    }

    const queryLower = tokenQuery.toLowerCase().trim();
    const queryTokens = queryLower.split(/[-/\s]+/).filter(Boolean);
    
    // Filter pools that match the token query
    const matchingPools: YieldOpportunity[] = response.data.data
      .filter((pool: any) => {
        if (!pool.symbol) return false;
        const symbolLower = pool.symbol.toLowerCase();
        
        // Match if symbol contains the query
        if (symbolLower.includes(queryLower)) return true;
        
        // Match if all query tokens are in the symbol
        if (queryTokens.length > 1) {
          return queryTokens.every(token => symbolLower.includes(token));
        }
        
        // Match if symbol contains any of the query tokens
        return queryTokens.some(token => {
          // Match whole token (e.g., "usdc" should match "USDC-ETH" but not "MUSDC")
          const tokenRegex = new RegExp(`(^|[-/])${token}($|[-/])`, 'i');
          return tokenRegex.test(symbolLower);
        });
      })
      .map((pool: any) => ({
        pool: pool.pool,
        chain: pool.chain,
        project: pool.project,
        symbol: pool.symbol,
        tvlUsd: pool.tvlUsd || 0,
        apy: pool.apy || 0,
        apyBase: pool.apyBase,
        apyReward: pool.apyReward,
        apyMean30d: pool.apyMean30d,
        ilRisk: pool.ilRisk,
        apyPct1D: pool.apyPct1D,
        apyPct7D: pool.apyPct7D,
        apyPct30D: pool.apyPct30D,
        rewardTokens: pool.rewardTokens,
        underlyingTokens: pool.underlyingTokens,
        poolMeta: pool.poolMeta,
        mu: pool.mu,
        sigma: pool.sigma,
        count: pool.count,
        outlier: pool.outlier,
        rewardTokenSymbols: pool.rewardTokenSymbols,
        volumeUsd1d: pool.volumeUsd1d,
        volumeUsd7d: pool.volumeUsd7d,
      }))
      .filter((pool: YieldOpportunity) => 
        pool.tvlUsd >= minTVL && 
        pool.apy >= minAPY &&
        !pool.outlier // Exclude outliers (unreliable APY)
      );

    // Sort by APY descending
    matchingPools.sort((a, b) => b.apy - a.apy);

    // Group by chain
    const groupedByChain: Record<string, YieldOpportunity[]> = {};
    for (const pool of matchingPools) {
      if (!groupedByChain[pool.chain]) {
        groupedByChain[pool.chain] = [];
      }
      groupedByChain[pool.chain].push(pool);
    }

    // Find best yield per chain
    const bestByChain: Record<string, YieldOpportunity> = {};
    for (const [chain, pools] of Object.entries(groupedByChain)) {
      if (pools.length > 0) {
        bestByChain[chain] = pools[0]; // Already sorted by APY
      }
    }

    // Best overall
    const bestOverall = matchingPools.length > 0 ? matchingPools[0] : null;

    const result = {
      query: tokenQuery,
      results: matchingPools.slice(0, 100),
      groupedByChain,
      bestOverall,
      bestByChain,
    };

    logger.info(`Found ${matchingPools.length} yield opportunities for ${tokenQuery}`);
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error: any) {
    logger.error(`Error searching yields for ${tokenQuery}:`, error.message);
    return {
      query: tokenQuery,
      results: [],
      groupedByChain: {},
      bestOverall: null,
      bestByChain: {},
    };
  }
}

/**
 * Get top yield opportunities for common stablecoin pairs
 */
export async function getStablecoinYields(minTVL: number = 100000): Promise<{
  usdc: YieldOpportunity[];
  usdt: YieldOpportunity[];
  dai: YieldOpportunity[];
  stablePairs: YieldOpportunity[];
}> {
  const cacheKey = `defi:yields:stablecoins:${minTVL}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug('Fetching stablecoin yields');
    
    const [usdcResults, usdtResults, daiResults] = await Promise.all([
      searchYieldsByToken('USDC', minTVL, 0),
      searchYieldsByToken('USDT', minTVL, 0),
      searchYieldsByToken('DAI', minTVL, 0),
    ]);

    // Get stable-stable pairs (low IL risk)
    const response = await axios.get(`${DEFILLAMA_API_V2}/pools`, {
      timeout: 20000,
    });

    let stablePairs: YieldOpportunity[] = [];
    if (Array.isArray(response.data?.data)) {
      stablePairs = response.data.data
        .filter((pool: any) => {
          const symbol = pool.symbol?.toLowerCase() || '';
          const isStablePair = 
            (symbol.includes('usdc') && symbol.includes('usdt')) ||
            (symbol.includes('usdc') && symbol.includes('dai')) ||
            (symbol.includes('usdt') && symbol.includes('dai')) ||
            (symbol.includes('frax') && (symbol.includes('usdc') || symbol.includes('usdt'))) ||
            pool.ilRisk === 'no';
          return isStablePair && pool.tvlUsd >= minTVL;
        })
        .map((pool: any) => ({
          pool: pool.pool,
          chain: pool.chain,
          project: pool.project,
          symbol: pool.symbol,
          tvlUsd: pool.tvlUsd || 0,
          apy: pool.apy || 0,
          apyBase: pool.apyBase,
          apyReward: pool.apyReward,
          ilRisk: pool.ilRisk || 'no',
        }))
        .sort((a: YieldOpportunity, b: YieldOpportunity) => b.apy - a.apy)
        .slice(0, 50);
    }

    const result = {
      usdc: usdcResults.results.slice(0, 20),
      usdt: usdtResults.results.slice(0, 20),
      dai: daiResults.results.slice(0, 20),
      stablePairs,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error: any) {
    logger.error('Error fetching stablecoin yields:', error.message);
    return {
      usdc: [],
      usdt: [],
      dai: [],
      stablePairs: [],
    };
  }
}

/**
 * Get protocol rankings by TVL
 */
export async function getProtocolRankings(
  limit: number = 50,
  chain?: string
): Promise<ProtocolTVL[]> {
  const cacheKey = `defi:rankings:${limit}:${chain || 'all'}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const protocols = await getAllProtocols();
    
    let filtered = protocols;
    if (chain && chain !== 'all') {
      filtered = protocols.filter((p) => p.chain === chain);
    }

    // Sort by TVL
    filtered.sort((a, b) => (b.tvl || 0) - (a.tvl || 0));

    const rankings: ProtocolTVL[] = filtered.slice(0, limit).map((p) => ({
      protocol: p.name,
      tvl: p.tvl || 0,
      change_1d: p.change_1d,
      change_7d: p.change_7d,
      change_30d: p.change_30d,
      chains: [p.chain],
      category: undefined, // Would need additional API call
    }));

    cache.set(cacheKey, { data: rankings, timestamp: Date.now() });
    return rankings;
  } catch (error: any) {
    logger.error('Error fetching protocol rankings:', error.message);
    return [];
  }
}

/**
 * Search protocols
 */
export async function searchProtocols(query: string): Promise<Protocol[]> {
  const cacheKey = `defi:search:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const allProtocols = await getAllProtocols();
    const queryLower = query.toLowerCase();
    
    const results = allProtocols.filter(
      (p) =>
        p.name.toLowerCase().includes(queryLower) ||
        p.id.toLowerCase().includes(queryLower) ||
        p.symbol?.toLowerCase().includes(queryLower)
    );

    cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  } catch (error: any) {
    logger.error('Error searching protocols:', error.message);
    return [];
  }
}

/**
 * Get chain TVL breakdown
 */
export async function getChainTVL(): Promise<Record<string, number>> {
  const cacheKey = 'defi:chains:tvl';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug('Fetching chain TVL from DeFiLlama');
    
    const response = await axios.get(`${DEFILLAMA_API_BASE}/v2/chains`, {
      timeout: 10000,
    });

    if (response.data) {
      const chainTVL: Record<string, number> = {};
      
      for (const chain of response.data) {
        chainTVL[chain.name] = chain.tvl || 0;
      }

      cache.set(cacheKey, { data: chainTVL, timestamp: Date.now() });
      return chainTVL;
    }

    return {};
  } catch (error: any) {
    logger.error('Error fetching chain TVL:', error.message);
    return {};
  }
}

/**
 * Get protocol revenue data
 */
export async function getProtocolRevenue(protocolId: string): Promise<ProtocolRevenue | null> {
  const cacheKey = `defi:protocol:${protocolId}:revenue`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug(`Fetching revenue data for protocol ${protocolId}`);
    
    // Try multiple DeFiLlama endpoints for fees/revenue data
    const endpoints = [
      `${DEFILLAMA_API_BASE}/v2/historicalProtocolFees/${protocolId}`,
      `${DEFILLAMA_API_BASE}/summary/fees/${protocolId}`,
      `${DEFILLAMA_API_BASE}/protocol/${protocolId}`,
    ];

    const responses = await Promise.allSettled(
      endpoints.map(url => axios.get(url, { timeout: 10000 }))
    );

    let protocol: any = null;
    let feesData: any = null;

    // Try to get protocol data
    if (responses[2].status === 'fulfilled') {
      protocol = responses[2].value.data;
    }

    // Try to get fees data from historical endpoint
    if (responses[0].status === 'fulfilled') {
      const data = responses[0].value.data;
      if (Array.isArray(data)) {
        feesData = data;
      } else if (data && typeof data === 'object') {
        feesData = data.data || data.fees || [];
      }
    }

    // Try summary endpoint as fallback
    if (!feesData && responses[1].status === 'fulfilled') {
      const data = responses[1].value.data;
      if (data) {
        feesData = Array.isArray(data) ? data : [data];
      }
    }

    if (!protocol && !feesData) {
      logger.debug(`No revenue data found for protocol ${protocolId}`);
      return null;
    }

    // Calculate revenue from fees data
    let revenue24h = 0;
    let revenue7d = 0;
    let revenue30d = 0;
    let fees24h = 0;
    let fees7d = 0;
    let fees30d = 0;

    if (feesData && Array.isArray(feesData) && feesData.length > 0) {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      // Sum fees/revenue for different periods
      feesData.forEach((point: any) => {
        // Handle different date formats
        let pointDate: number;
        if (typeof point.date === 'number') {
          // If date is in seconds (Unix timestamp), convert to milliseconds
          pointDate = point.date < 1e12 ? point.date * 1000 : point.date;
        } else if (point.timestamp) {
          pointDate = point.timestamp < 1e12 ? point.timestamp * 1000 : point.timestamp;
        } else {
          return; // Skip if no date
        }

        const fees = point.feesUsd || point.fees || point.total24h || point.total7d || point.total30d || 0;
        // Revenue is typically a portion of fees, or use revenueUsd if available
        // For most protocols, revenue is 80-100% of fees
        const revenue = point.revenueUsd || point.revenue || (fees * 0.85); // Default to 85% of fees as revenue

        if (pointDate >= oneDayAgo) {
          fees24h += fees;
          revenue24h += revenue;
        }
        if (pointDate >= sevenDaysAgo) {
          fees7d += fees;
          revenue7d += revenue;
        }
        if (pointDate >= thirtyDaysAgo) {
          fees30d += fees;
          revenue30d += revenue;
        }
      });

      logger.debug(`Protocol ${protocolId} revenue from fees data - 24h: ${revenue24h}, 30d: ${revenue30d}, data points: ${feesData.length}`);
    } else if (protocol) {
      // Fallback: try to get from protocol object directly
      fees24h = protocol.fees24h || 0;
      fees7d = protocol.fees7d || 0;
      fees30d = protocol.fees30d || 0;
      revenue24h = protocol.revenue24h || protocol.fees24h || 0;
      revenue7d = protocol.revenue7d || protocol.fees7d || 0;
      revenue30d = protocol.revenue30d || protocol.fees30d || 0;

      // If we have dimensions data, try to extract fees info
      if (protocol.dimensions && protocol.dimensions.fees) {
        logger.debug(`Protocol ${protocolId} has fees dimension: ${protocol.dimensions.fees}`);
        // Note: dimensions.fees is just a string identifier, not actual fee data
        // We'd need to call another endpoint to get the actual fees
      }
    }

    // Calculate annualized revenue (30d * 12)
    const revenue1y = revenue30d ? revenue30d * 12 : undefined;
    const fees1y = fees30d ? fees30d * 12 : undefined;

    // Calculate multiples
    const mcap = protocol?.mcap;
    const fdv = protocol?.fdv;
    const mcapToRevenue = revenue1y && mcap ? mcap / revenue1y : undefined;
    const fdvToRevenue = revenue1y && fdv ? fdv / revenue1y : undefined;

    const revenue: ProtocolRevenue = {
      protocol: protocol?.name || protocolId,
      revenue24h,
      revenue7d,
      revenue30d,
      revenue1y,
      fees24h,
      fees7d,
      fees30d,
      fees1y,
      mcap,
      fdv,
      mcapToRevenue,
      fdvToRevenue,
    };

    // Only return if we have meaningful data
    if (revenue24h > 0 || revenue30d > 0 || fees24h > 0 || fees30d > 0) {
      cache.set(cacheKey, { data: revenue, timestamp: Date.now() });
      logger.debug(`Protocol ${protocolId} revenue: 24h=${revenue24h}, 30d=${revenue30d}`);
      return revenue;
    }

    logger.debug(`Protocol ${protocolId} has no revenue data`);
    return null;
  } catch (error: any) {
    logger.error(`Error fetching revenue for protocol ${protocolId}:`, error.message);
    return null;
  }
}

/**
 * Get historical revenue data for a protocol
 */
export async function getProtocolRevenueHistory(protocolId: string): Promise<RevenueData[]> {
  const cacheKey = `defi:protocol:${protocolId}:revenue:history`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 5) {
    return cached.data;
  }

  try {
    logger.debug(`Fetching revenue history for protocol ${protocolId}`);
    
    const response = await axios.get(`${DEFILLAMA_API_BASE}/v2/historicalProtocolFees/${protocolId}`, {
      timeout: 10000,
    });

    if (Array.isArray(response.data)) {
      const revenueData: RevenueData[] = response.data.map((point: any) => ({
        date: point.date * 1000,
        fees: point.fees,
        revenue: point.revenue,
        feesUsd: point.feesUsd || point.fees,
        revenueUsd: point.revenueUsd || point.revenue || point.feesUsd || point.fees,
      }));

      cache.set(cacheKey, { data: revenueData, timestamp: Date.now() });
      return revenueData;
    }

    return [];
  } catch (error: any) {
    logger.error(`Error fetching revenue history for protocol ${protocolId}:`, error.message);
    return [];
  }
}

/**
 * Map chain display names to DeFiLlama API identifiers
 */
const CHAIN_NAME_MAP: Record<string, string> = {
  'ethereum': 'ethereum',
  'solana': 'solana',
  'bsc': 'bsc',
  'binance': 'bsc',
  'polygon': 'polygon',
  'arbitrum': 'arbitrum',
  'optimism': 'optimism',
  'avalanche': 'avalanche',
  'avax': 'avalanche',
  'base': 'base',
  'fantom': 'fantom',
  'cronos': 'cronos',
  'cosmos': 'cosmos',
};

/**
 * Get chain revenue data
 */
export async function getChainRevenue(chainName: string): Promise<ChainRevenue | null> {
  // Normalize chain name to lowercase
  const chainLower = chainName.toLowerCase();
  const chainId = CHAIN_NAME_MAP[chainLower] || chainLower;
  
  const cacheKey = `defi:chain:${chainId}:revenue`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug(`Fetching revenue data for chain ${chainId}`);
    
    // Try multiple DeFiLlama endpoints for chain fees/revenue
    let response;
    let feesData: any[] = [];
    
    // Try v2/historicalChainFees first
    try {
      response = await axios.get(`${DEFILLAMA_API_BASE}/v2/historicalChainFees/${chainId}`, {
        timeout: 10000,
      });
      if (Array.isArray(response.data)) {
        feesData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // Might be an object with a data array
        feesData = response.data.data || response.data.fees || [];
      }
    } catch (err: any) {
      logger.debug(`v2/historicalChainFees failed for ${chainId}: ${err.message}`);
      // Try alternative endpoint
      try {
        response = await axios.get(`${DEFILLAMA_API_BASE}/summary/fees/${chainId}`, {
          timeout: 10000,
        });
        // Summary endpoint might return different format
        if (response.data) {
          feesData = [response.data]; // Wrap in array for processing
        }
      } catch (err2: any) {
        logger.debug(`summary/fees also failed for ${chainId}: ${err2.message}`);
      }
    }

    if (feesData.length > 0) {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      let fees24h = 0;
      let fees7d = 0;
      let fees30d = 0;
      let revenue24h = 0;
      let revenue7d = 0;
      let revenue30d = 0;

      feesData.forEach((point: any) => {
        // Handle different date formats
        let pointDate: number;
        if (typeof point.date === 'number') {
          // If date is in seconds (Unix timestamp), convert to milliseconds
          pointDate = point.date < 1e12 ? point.date * 1000 : point.date;
        } else if (point.timestamp) {
          pointDate = point.timestamp < 1e12 ? point.timestamp * 1000 : point.timestamp;
        } else {
          return; // Skip if no date
        }
        
        const fees = point.feesUsd || point.fees || point.total24h || point.total7d || point.total30d || 0;
        // Revenue is typically a portion of fees, or use revenueUsd if available
        const revenue = point.revenueUsd || point.revenue || (fees * 0.8); // Default to 80% of fees as revenue

        if (pointDate >= oneDayAgo) {
          fees24h += fees;
          revenue24h += revenue;
        }
        if (pointDate >= sevenDaysAgo) {
          fees7d += fees;
          revenue7d += revenue;
        }
        if (pointDate >= thirtyDaysAgo) {
          fees30d += fees;
          revenue30d += revenue;
        }
      });
      
      // Log for debugging
      logger.debug(`Chain ${chainId} (${chainName}) revenue calculated - 24h: ${revenue24h}, 7d: ${revenue7d}, 30d: ${revenue30d}, data points: ${feesData.length}`);

      // Only return if we have meaningful data
      if (revenue24h > 0 || revenue30d > 0 || fees24h > 0 || fees30d > 0) {
        const chainRevenue: ChainRevenue = {
          chain: chainName, // Use original chainName for display
          revenue24h,
          revenue7d,
          revenue30d,
          fees24h,
          fees7d,
          fees30d,
        };

        cache.set(cacheKey, { data: chainRevenue, timestamp: Date.now() });
        logger.debug(`Chain ${chainId} (${chainName}) revenue calculated: 24h=${revenue24h}, 30d=${revenue30d}`);
        return chainRevenue;
      }
      
      logger.debug(`Chain ${chainId} (${chainName}) has no revenue data`);
      return null;
    }

    return null;
  } catch (error: any) {
    logger.error(`Error fetching revenue for chain ${chainId}:`, error.message);
    // Return null but don't throw - allow other chains to load
    return null;
  }
}

/**
 * Get all chains revenue data at once
 * Aggregates protocol-level revenue by chain for more reliable data
 */
export async function getAllChainsRevenue(): Promise<ChainRevenue[]> {
  const cacheKey = 'defi:chains:revenue:all';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug('Fetching revenue data for all chains by aggregating protocols');
    
    // Get ALL protocols (not just top 100) to ensure we capture all revenue
    const allProtocols = await getAllProtocols();
    
    // Aggregate revenue by chain
    const chainRevenueMap = new Map<string, {
      revenue24h: number;
      revenue7d: number;
      revenue30d: number;
      fees24h: number;
      fees7d: number;
      fees30d: number;
    }>();

    // Map chain identifiers to display names
    const chainDisplayNames: Record<string, string> = {
      'Ethereum': 'Ethereum',
      'Solana': 'Solana',
      'BSC': 'BSC',
      'Binance': 'BSC',
      'Polygon': 'Polygon',
      'Arbitrum': 'Arbitrum',
      'Optimism': 'Optimism',
      'Avalanche': 'Avalanche',
      'Base': 'Base',
      'Fantom': 'Fantom',
      'Tron': 'Tron',
      'Near': 'Near',
      'Cosmos': 'Cosmos',
      'Osmosis': 'Osmosis',
      'Kava': 'Kava',
      'Celo': 'Celo',
      'Moonriver': 'Moonriver',
      'Harmony': 'Harmony',
      'Gnosis': 'Gnosis',
      'Cardano': 'Cardano',
      'Stacks': 'Stacks',
      'Bitcoin': 'Bitcoin',
      'multi': 'Multi-Chain',
    };

    // First, try to get revenue from protocol-level data in getAllProtocols response
    // Many protocols already have revenue24h, revenue7d, revenue30d in the protocol object
    logger.debug(`Processing ${allProtocols.length} protocols for revenue data`);
    
    for (const protocol of allProtocols) {
      if (!protocol.chain) continue;
      
      const displayChain = chainDisplayNames[protocol.chain] || protocol.chain;
      
      if (!chainRevenueMap.has(displayChain)) {
        chainRevenueMap.set(displayChain, {
          revenue24h: 0,
          revenue7d: 0,
          revenue30d: 0,
          fees24h: 0,
          fees7d: 0,
          fees30d: 0,
        });
      }

      const chainData = chainRevenueMap.get(displayChain)!;
      
      // Add protocol revenue from protocol object (if available)
      if (protocol.revenue24h) chainData.revenue24h += protocol.revenue24h;
      if (protocol.revenue7d) chainData.revenue7d += protocol.revenue7d;
      if (protocol.revenue30d) chainData.revenue30d += protocol.revenue30d;
      if (protocol.fees24h) chainData.fees24h += protocol.fees24h;
      if (protocol.fees7d) chainData.fees7d += protocol.fees7d;
      if (protocol.fees30d) chainData.fees30d += protocol.fees30d;
    }
    
    logger.debug(`Initial aggregation from protocol objects: ${Array.from(chainRevenueMap.entries()).map(([c, d]) => `${c}:24h=${d.revenue24h.toFixed(0)}`).join(', ')}`);

    // Now fetch detailed revenue for top protocols (those with TVL > 0)
    // This supplements the data from protocol objects
    const topProtocols = allProtocols
      .filter(p => p.tvl && p.tvl > 0)
      .sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
      .slice(0, 200); // Increased to 200 protocols
    
    logger.debug(`Fetching detailed revenue for top ${topProtocols.length} protocols`);
    
    // Fetch revenue in batches to avoid overwhelming the API
    const batchSize = 20;
    const protocolRevenueMap = new Map<string, ProtocolRevenue>();
    
    for (let i = 0; i < topProtocols.length; i += batchSize) {
      const batch = topProtocols.slice(i, i + batchSize);
      const revenuePromises = batch.map(async (protocol) => {
        try {
          const revenue = await getProtocolRevenue(protocol.id);
          if (revenue) {
            protocolRevenueMap.set(protocol.id, revenue);
            protocolRevenueMap.set(protocol.name.toLowerCase(), revenue);
          }
        } catch (err: any) {
          // Silently fail for individual protocols
        }
        return null;
      });
      
      await Promise.all(revenuePromises);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < topProtocols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    logger.debug(`Fetched detailed revenue for ${protocolRevenueMap.size} protocols`);
    
    // Aggregate detailed revenue data by chain
    for (const protocol of topProtocols) {
      if (!protocol.chain) continue;
      
      const revenue = protocolRevenueMap.get(protocol.id) || 
                     protocolRevenueMap.get(protocol.name.toLowerCase());
      
      if (!revenue) continue;
      
      const displayChain = chainDisplayNames[protocol.chain] || protocol.chain;
      const chainData = chainRevenueMap.get(displayChain);
      
      if (chainData) {
        // Use detailed revenue data if it's higher than what we have (more accurate)
        if (revenue.revenue24h && revenue.revenue24h > chainData.revenue24h) {
          chainData.revenue24h = revenue.revenue24h;
        }
        if (revenue.revenue7d && revenue.revenue7d > chainData.revenue7d) {
          chainData.revenue7d = revenue.revenue7d;
        }
        if (revenue.revenue30d && revenue.revenue30d > chainData.revenue30d) {
          chainData.revenue30d = revenue.revenue30d;
        }
        if (revenue.fees24h && revenue.fees24h > chainData.fees24h) {
          chainData.fees24h = revenue.fees24h;
        }
        if (revenue.fees7d && revenue.fees7d > chainData.fees7d) {
          chainData.fees7d = revenue.fees7d;
        }
        if (revenue.fees30d && revenue.fees30d > chainData.fees30d) {
          chainData.fees30d = revenue.fees30d;
        }
      }
    }
    
    logger.debug(`After detailed protocol revenue: ${Array.from(chainRevenueMap.entries()).map(([c, d]) => `${c}:24h=${d.revenue24h.toFixed(0)}`).join(', ')}`);

    // Try direct chain revenue API calls as primary source (most accurate)
    const majorChains = ['Ethereum', 'Solana', 'BSC', 'Polygon', 'Arbitrum', 'Optimism', 'Avalanche', 'Base', 'Fantom', 'Tron', 'Near', 'Cosmos', 'Osmosis', 'Kava', 'Celo', 'Moonriver', 'Harmony', 'Gnosis', 'Cardano', 'Stacks', 'Bitcoin'];
    const chainRevenuePromises = majorChains.map(async (chainName) => {
      try {
        const directRevenue = await getChainRevenue(chainName);
        if (directRevenue) {
          logger.debug(`Got direct revenue for ${chainName}: 24h=${directRevenue.revenue24h}, 30d=${directRevenue.revenue30d}`);
        }
        return { chainName, revenue: directRevenue };
      } catch (err: any) {
        logger.debug(`Failed to get direct revenue for ${chainName}: ${err.message}`);
        return { chainName, revenue: null };
      }
    });

    const directResults = await Promise.all(chainRevenuePromises);
    
    // Use direct API results as primary source (most accurate), supplement with aggregated protocol data
    directResults.forEach(({ chainName, revenue: directRev }) => {
      if (directRev && directRev.chain) {
        const existing = chainRevenueMap.get(directRev.chain);
        if (existing) {
          // Always use direct API data if available (it's more accurate)
          if (directRev.revenue24h !== undefined && directRev.revenue24h > 0) {
            existing.revenue24h = directRev.revenue24h;
          }
          if (directRev.revenue30d !== undefined && directRev.revenue30d > 0) {
            existing.revenue30d = directRev.revenue30d;
          }
          if (directRev.revenue7d !== undefined && directRev.revenue7d > 0) {
            existing.revenue7d = directRev.revenue7d;
          }
          if (directRev.fees24h !== undefined && directRev.fees24h > 0) {
            existing.fees24h = directRev.fees24h;
          }
          if (directRev.fees30d !== undefined && directRev.fees30d > 0) {
            existing.fees30d = directRev.fees30d;
          }
          if (directRev.fees7d !== undefined && directRev.fees7d > 0) {
            existing.fees7d = directRev.fees7d;
          }
        } else {
          // Add new chain from direct API
          chainRevenueMap.set(directRev.chain, {
            revenue24h: directRev.revenue24h || 0,
            revenue7d: directRev.revenue7d || 0,
            revenue30d: directRev.revenue30d || 0,
            fees24h: directRev.fees24h || 0,
            fees7d: directRev.fees7d || 0,
            fees30d: directRev.fees30d || 0,
          });
        }
      }
    });
    
    logger.debug(`After direct API calls: ${Array.from(chainRevenueMap.entries()).map(([c, d]) => `${c}:24h=${d.revenue24h.toFixed(0)},30d=${d.revenue30d.toFixed(0)}`).join('; ')}`);

    // Convert map to array - include all major chains even if revenue is 0
    const results: ChainRevenue[] = majorChains.map(chainName => {
      const data = chainRevenueMap.get(chainName) || {
        revenue24h: 0,
        revenue7d: 0,
        revenue30d: 0,
        fees24h: 0,
        fees7d: 0,
        fees30d: 0,
      };
      return {
        chain: chainName,
        ...data,
      };
    });

    // Add any other chains that have revenue data
    chainRevenueMap.forEach((data, chain) => {
      if (!majorChains.includes(chain)) {
        results.push({
          chain,
          ...data,
        });
      }
    });

    logger.debug(`Aggregated revenue for ${results.length} chains`);
    results.forEach(r => {
      if ((r.revenue24h && r.revenue24h > 0) || (r.revenue30d && r.revenue30d > 0)) {
        logger.info(`Chain ${r.chain}: 24h=${(r.revenue24h || 0).toFixed(0)}, 7d=${(r.revenue7d || 0).toFixed(0)}, 30d=${(r.revenue30d || 0).toFixed(0)}`);
      }
    });
    
    cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  } catch (error: any) {
    logger.error('Error fetching all chains revenue:', error.message);
    logger.error(error.stack);
    return [];
  }
}

/**
 * Get all protocols with revenue data for comparison
 * Uses DeFiLlama's fees overview endpoint for comprehensive data
 */
export async function getProtocolsWithRevenue(limit: number = 50): Promise<ProtocolRevenue[]> {
  const cacheKey = `defi:protocols:revenue:${limit}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info('Fetching protocol revenue from DeFiLlama fees overview');
    
    // Use the fees overview endpoint which returns all protocols with fees/revenue
    const response = await axios.get('https://api.llama.fi/overview/fees', {
      timeout: 30000,
    });

    if (!response.data?.protocols) {
      logger.warn('No protocols in fees overview response');
      return [];
    }

    const protocolsWithRevenue: ProtocolRevenue[] = [];
    
    // Also get basic protocol info for mcap/fdv
    const allProtocols = await getAllProtocols();
    const protocolMap = new Map(allProtocols.map(p => [p.name.toLowerCase(), p]));

    for (const p of response.data.protocols) {
      if (!p.name) continue;
      
      // Extract revenue data from the fees overview response
      const revenue24h = p.total24h || 0;
      const revenue7d = p.total7d || 0;
      const revenue30d = p.total30d || (revenue24h * 30); // Estimate if not available
      const revenue1y = p.total1y || (revenue30d * 12);
      
      // Get mcap/fdv from protocol info
      const protocolInfo = protocolMap.get(p.name.toLowerCase());
      const mcap = protocolInfo?.mcap;
      const fdv = protocolInfo?.fdv;
      
      // Calculate valuation multiples
      const mcapToRevenue = revenue1y > 0 && mcap ? mcap / revenue1y : undefined;
      const fdvToRevenue = revenue1y > 0 && fdv ? fdv / revenue1y : undefined;

      if (revenue24h > 0 || revenue30d > 0) {
        protocolsWithRevenue.push({
          protocol: p.displayName || p.name,
          revenue24h,
          revenue7d,
          revenue30d,
          revenue1y,
          fees24h: p.dailyFees || p.total24h || 0,
          fees7d: p.weeklyFees || p.total7d || 0,
          fees30d: p.monthlyFees || p.total30d || 0,
          fees1y: p.yearlyFees || p.total1y || 0,
          mcap,
          fdv,
          mcapToRevenue,
          fdvToRevenue,
        });
      }
    }

    // Sort by 30-day revenue descending
    protocolsWithRevenue.sort((a, b) => (b.revenue30d || b.revenue24h || 0) - (a.revenue30d || a.revenue24h || 0));

    logger.info(`Fetched revenue for ${protocolsWithRevenue.length} protocols from fees overview`);
    cache.set(cacheKey, { data: protocolsWithRevenue.slice(0, limit), timestamp: Date.now() });
    return protocolsWithRevenue.slice(0, limit);
  } catch (error: any) {
    logger.error('Error fetching protocols with revenue:', error.message);
    
    // Fallback: try the old method with protocol data
    try {
      logger.info('Falling back to protocol-level revenue data');
      const protocols = await getAllProtocols();
      const protocolsWithRevenue: ProtocolRevenue[] = protocols
        .filter(p => (p.revenue24h || p.revenue30d || p.fees24h || p.fees30d) && p.tvl && p.tvl > 0)
        .map(p => ({
          protocol: p.name,
          revenue24h: p.revenue24h,
          revenue7d: p.revenue7d,
          revenue30d: p.revenue30d,
          fees24h: p.fees24h,
          fees7d: p.fees7d,
          fees30d: p.fees30d,
          mcap: p.mcap,
          fdv: p.fdv,
          mcapToRevenue: p.mcap && p.revenue30d ? (p.mcap / (p.revenue30d * 12)) : undefined,
          fdvToRevenue: p.fdv && p.revenue30d ? (p.fdv / (p.revenue30d * 12)) : undefined,
        } as ProtocolRevenue))
        .sort((a, b) => (b.revenue30d || 0) - (a.revenue30d || 0))
        .slice(0, limit);
      
      cache.set(cacheKey, { data: protocolsWithRevenue, timestamp: Date.now() });
      return protocolsWithRevenue;
    } catch (fallbackError: any) {
      logger.error('Fallback also failed:', fallbackError.message);
      return [];
    }
  }
}

