import axios from 'axios';
import { logger } from '../utils/logger.js';

// Polymarket API Configuration
const POLYMARKET_API_BASE = 'https://clob.polymarket.com';
const POLYMARKET_GRAPHQL = 'https://data-api.polymarket.com';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 60 seconds

export interface Market {
  id: string;
  question: string;
  slug: string;
  volume24h?: number;
  volume7d?: number;
  volume30d?: number;
  liquidity?: number;
  yesPrice?: number;
  noPrice?: number;
  endDate?: string;
  category?: string;
  subcategory?: string;
  active?: boolean;
  outcomePrices?: {
    YES?: number;
    NO?: number;
  };
  description?: string;
  image?: string;
  resolutionSource?: string;
}

interface GetMarketsOptions {
  limit?: number;
  category?: string;
  active?: boolean;
}

/**
 * Get all markets from Polymarket
 */
export async function getPolymarketMarkets(options: GetMarketsOptions = {}): Promise<Market[]> {
  const { limit = 500, category, active } = options;
  const cacheKey = `prediction:markets:${limit}:${category || 'all'}:${active || 'all'}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug('Fetching markets from Polymarket');
    
    // Polymarket uses GraphQL API
    // For now, we'll use a simplified approach - in production, you'd use their GraphQL endpoint
    // This is a placeholder that will need to be updated with actual Polymarket API integration
    
    // GraphQL query for markets
    const query = `
      query GetMarkets($limit: Int, $active: Boolean) {
        markets(limit: $limit, active: $active) {
          id
          question
          slug
          volume24h
          volume7d
          volume30d
          liquidity
          yesPrice
          noPrice
          endDate
          category
          subcategory
          active
          description
          image
          resolutionSource
        }
      }
    `;

    // Try GraphQL endpoint first
    let response;
    try {
      response = await axios.post(
        `${POLYMARKET_GRAPHQL}/graphql`,
        {
          query,
          variables: { limit, active },
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.data?.markets) {
        const markets: Market[] = response.data.data.markets.map((m: any) => ({
          id: m.id,
          question: m.question,
          slug: m.slug,
          volume24h: m.volume24h,
          volume7d: m.volume7d,
          volume30d: m.volume30d,
          liquidity: m.liquidity,
          yesPrice: m.yesPrice,
          noPrice: m.noPrice,
          endDate: m.endDate,
          category: m.category,
          subcategory: m.subcategory,
          active: m.active,
          outcomePrices: {
            YES: m.yesPrice,
            NO: m.noPrice,
          },
          description: m.description,
          image: m.image,
          resolutionSource: m.resolutionSource,
        }));

        // Filter by category if specified
        const filtered = category
          ? markets.filter(m => m.category?.toLowerCase() === category.toLowerCase())
          : markets;

        cache.set(cacheKey, { data: filtered, timestamp: Date.now() });
        return filtered;
      }
    } catch (graphqlError: any) {
      logger.debug('GraphQL endpoint failed, trying alternative:', graphqlError.message);
    }

    // Fallback: Try REST API if available
    try {
      response = await axios.get(`${POLYMARKET_API_BASE}/markets`, {
        params: { limit, category, active },
        timeout: 10000,
      });

      if (Array.isArray(response.data)) {
        const markets: Market[] = response.data.map((m: any) => ({
          id: m.id || m.slug,
          question: m.question || m.title,
          slug: m.slug || m.id,
          volume24h: m.volume24h || m.volume?.day || 0,
          volume7d: m.volume7d || m.volume?.week || 0,
          volume30d: m.volume30d || m.volume?.month || 0,
          liquidity: m.liquidity || 0,
          yesPrice: m.yesPrice || m.outcomePrices?.YES || 0,
          noPrice: m.noPrice || m.outcomePrices?.NO || 0,
          endDate: m.endDate || m.end_date,
          category: m.category,
          subcategory: m.subcategory,
          active: m.active !== false,
          outcomePrices: {
            YES: m.yesPrice || m.outcomePrices?.YES,
            NO: m.noPrice || m.outcomePrices?.NO,
          },
          description: m.description,
          image: m.image,
          resolutionSource: m.resolutionSource,
        }));

        cache.set(cacheKey, { data: markets, timestamp: Date.now() });
        return markets;
      }
    } catch (restError: any) {
      logger.debug('REST API also failed:', restError.message);
    }

    // Return mock data for development until API is properly integrated
    logger.warn('Polymarket API not available, returning mock data');
    const mockMarkets: Market[] = [
      {
        id: '1',
        question: 'Will Bitcoin reach $100,000 by end of 2024?',
        slug: 'bitcoin-100k-2024',
        volume24h: 1250000,
        volume7d: 8500000,
        volume30d: 35000000,
        liquidity: 500000,
        yesPrice: 0.42,
        noPrice: 0.58,
        category: 'Crypto',
        active: true,
      },
      {
        id: '2',
        question: 'Will the S&P 500 close above 5,000 by end of Q1 2024?',
        slug: 'sp500-5000-q1-2024',
        volume24h: 2100000,
        volume7d: 15000000,
        volume30d: 60000000,
        liquidity: 1200000,
        yesPrice: 0.65,
        noPrice: 0.35,
        category: 'Markets',
        active: true,
      },
      {
        id: '3',
        question: 'Will there be a recession in the US in 2024?',
        slug: 'us-recession-2024',
        volume24h: 1800000,
        volume7d: 12000000,
        volume30d: 45000000,
        liquidity: 800000,
        yesPrice: 0.28,
        noPrice: 0.72,
        category: 'Economics',
        active: true,
      },
    ];

    cache.set(cacheKey, { data: mockMarkets, timestamp: Date.now() });
    return mockMarkets;
  } catch (error: any) {
    logger.error('Error fetching markets from Polymarket:', error.message);
    return [];
  }
}

/**
 * Get a specific market by ID or slug
 */
export async function getPolymarketMarket(idOrSlug: string): Promise<Market | null> {
  const cacheKey = `prediction:market:${idOrSlug}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug(`Fetching market ${idOrSlug} from Polymarket`);
    
    // Try GraphQL
    const query = `
      query GetMarket($id: String!) {
        market(id: $id) {
          id
          question
          slug
          volume24h
          volume7d
          volume30d
          liquidity
          yesPrice
          noPrice
          endDate
          category
          subcategory
          active
          description
          image
          resolutionSource
        }
      }
    `;

    try {
      const response = await axios.post(
        `${POLYMARKET_GRAPHQL}/graphql`,
        {
          query,
          variables: { id: idOrSlug },
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.data?.market) {
        const m = response.data.data.market;
        const market: Market = {
          id: m.id,
          question: m.question,
          slug: m.slug,
          volume24h: m.volume24h,
          volume7d: m.volume7d,
          volume30d: m.volume30d,
          liquidity: m.liquidity,
          yesPrice: m.yesPrice,
          noPrice: m.noPrice,
          endDate: m.endDate,
          category: m.category,
          subcategory: m.subcategory,
          active: m.active,
          outcomePrices: {
            YES: m.yesPrice,
            NO: m.noPrice,
          },
          description: m.description,
          image: m.image,
          resolutionSource: m.resolutionSource,
        };

        cache.set(cacheKey, { data: market, timestamp: Date.now() });
        return market;
      }
    } catch (graphqlError: any) {
      logger.debug('GraphQL endpoint failed for market:', graphqlError.message);
    }

    // Try REST API
    try {
      const response = await axios.get(`${POLYMARKET_API_BASE}/markets/${idOrSlug}`, {
        timeout: 10000,
      });

      if (response.data) {
        const m = response.data;
        const market: Market = {
          id: m.id || m.slug,
          question: m.question || m.title,
          slug: m.slug || m.id,
          volume24h: m.volume24h || m.volume?.day || 0,
          volume7d: m.volume7d || m.volume?.week || 0,
          volume30d: m.volume30d || m.volume?.month || 0,
          liquidity: m.liquidity || 0,
          yesPrice: m.yesPrice || m.outcomePrices?.YES || 0,
          noPrice: m.noPrice || m.outcomePrices?.NO || 0,
          endDate: m.endDate || m.end_date,
          category: m.category,
          subcategory: m.subcategory,
          active: m.active !== false,
          outcomePrices: {
            YES: m.yesPrice || m.outcomePrices?.YES,
            NO: m.noPrice || m.outcomePrices?.NO,
          },
          description: m.description,
          image: m.image,
          resolutionSource: m.resolutionSource,
        };

        cache.set(cacheKey, { data: market, timestamp: Date.now() });
        return market;
      }
    } catch (restError: any) {
      logger.debug('REST API also failed for market:', restError.message);
    }

    return null;
  } catch (error: any) {
    logger.error(`Error fetching market ${idOrSlug}:`, error.message);
    return null;
  }
}

