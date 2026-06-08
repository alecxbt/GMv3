import axios from 'axios';
import { logger } from '../utils/logger.js';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes for private market data

// API Configuration
const NASDAQ_PRIVATE_MARKETS_API_KEY = process.env.NASDAQ_PRIVATE_MARKETS_API_KEY;
const NASDAQ_DATA_LINK_API_KEY = process.env.NASDAQ_DATA_LINK_API_KEY;

interface PrivateMarketQuote {
  symbol: string;
  companyName: string;
  latestValuation: number;
  valuationDate: string;
  valuationType: 'primary' | 'secondary' | '409a' | 'mutual_fund_mark';
  sharePrice?: number;
  totalShares?: number;
  lastTransactionDate?: string;
  fundingRound?: string;
  investors?: string[];
  timestamp: number;
}

interface PrivateMarketChartPoint {
  time: string;
  valuation: number;
  sharePrice?: number;
  transactionType?: string;
}

/**
 * Get private market data for a company from Nasdaq Private Markets
 * Uses Tape D® API via Nasdaq Data Link
 */
export async function getPrivateMarketQuote(
  companyName: string,
  ticker?: string
): Promise<PrivateMarketQuote | null> {
  if (!NASDAQ_PRIVATE_MARKETS_API_KEY && !NASDAQ_DATA_LINK_API_KEY) {
    logger.warn('Nasdaq Private Markets API key not configured');
    return null;
  }

  const cacheKey = `npm:${companyName}:${ticker || ''}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug(`Fetching private market data for ${companyName}${ticker ? ` (${ticker})` : ''}`);

    // Try Nasdaq Data Link API first (Tape D® data)
    if (NASDAQ_DATA_LINK_API_KEY) {
      try {
        // Nasdaq Data Link endpoint for private market data
        // Note: This is a placeholder - actual endpoint may vary
        const response = await axios.get(
          `https://data.nasdaq.com/api/v3/datasets/NASDAQ_PRIVATE_MARKETS/${ticker || companyName.toUpperCase()}.json`,
          {
            params: {
              api_key: NASDAQ_DATA_LINK_API_KEY,
              limit: 1,
              order: 'desc',
            },
            headers: {
              'User-Agent': 'GM Terminal',
            },
            timeout: 10000,
          }
        );

        if (response.data?.dataset?.data?.[0]) {
          const data = response.data.dataset.data[0];
          const columns = response.data.dataset.column_names || [];
          
          // Map columns to data (structure may vary)
          const quote: PrivateMarketQuote = {
            symbol: ticker || companyName.toUpperCase(),
            companyName: companyName,
            latestValuation: parseFloat(data[columns.indexOf('Valuation')] || data[0]) || 0,
            valuationDate: data[columns.indexOf('Date')] || data[1] || new Date().toISOString(),
            valuationType: (data[columns.indexOf('Type')] || 'primary') as any,
            sharePrice: parseFloat(data[columns.indexOf('SharePrice')] || data[2]) || undefined,
            totalShares: parseFloat(data[columns.indexOf('TotalShares')] || data[3]) || undefined,
            lastTransactionDate: data[columns.indexOf('LastTransaction')] || undefined,
            fundingRound: data[columns.indexOf('FundingRound')] || undefined,
            timestamp: Date.now(),
          };

          cache.set(cacheKey, { data: quote, timestamp: Date.now() });
          logger.debug(`Private market data fetched from Nasdaq Data Link for ${companyName}`);
          return quote;
        }
      } catch (error: any) {
        logger.warn(`Nasdaq Data Link API error for ${companyName}, trying alternative:`, error.message);
      }
    }

    // Alternative: Direct Nasdaq Private Markets API (if available)
    if (NASDAQ_PRIVATE_MARKETS_API_KEY) {
      try {
        const response = await axios.get(
          'https://api.nasdaqprivatemarkets.com/v1/companies',
          {
            params: {
              name: companyName,
              ticker: ticker,
            },
            headers: {
              'Authorization': `Bearer ${NASDAQ_PRIVATE_MARKETS_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        if (response.data?.companies?.[0]) {
          const company = response.data.companies[0];
          const quote: PrivateMarketQuote = {
            symbol: company.ticker || companyName.toUpperCase(),
            companyName: company.name || companyName,
            latestValuation: company.latestValuation || company.valuation || 0,
            valuationDate: company.valuationDate || company.lastUpdated || new Date().toISOString(),
            valuationType: company.valuationType || 'primary',
            sharePrice: company.sharePrice,
            totalShares: company.totalShares,
            lastTransactionDate: company.lastTransactionDate,
            fundingRound: company.fundingRound,
            investors: company.investors || [],
            timestamp: Date.now(),
          };

          cache.set(cacheKey, { data: quote, timestamp: Date.now() });
          logger.debug(`Private market data fetched from Nasdaq Private Markets API for ${companyName}`);
          return quote;
        }
      } catch (error: any) {
        logger.warn(`Nasdaq Private Markets API error for ${companyName}:`, error.message);
      }
    }

    return null;
  } catch (error) {
    logger.error(`Error fetching private market data for ${companyName}:`, error);
    return null;
  }
}

/**
 * Get historical valuation data for a private company
 */
export async function getPrivateMarketChart(
  companyName: string,
  ticker?: string,
  period: string = '1y'
): Promise<PrivateMarketChartPoint[]> {
  if (!NASDAQ_PRIVATE_MARKETS_API_KEY && !NASDAQ_DATA_LINK_API_KEY) {
    return [];
  }

  const cacheKey = `npm:chart:${companyName}:${ticker || ''}:${period}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug(`Fetching private market chart for ${companyName}${ticker ? ` (${ticker})` : ''}`);

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '1w':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '1m':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setFullYear(startDate.getFullYear() - 1);
    }

    if (NASDAQ_DATA_LINK_API_KEY) {
      try {
        const response = await axios.get(
          `https://data.nasdaq.com/api/v3/datasets/NASDAQ_PRIVATE_MARKETS/${ticker || companyName.toUpperCase()}.json`,
          {
            params: {
              api_key: NASDAQ_DATA_LINK_API_KEY,
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              order: 'asc',
            },
            headers: {
              'User-Agent': 'GM Terminal',
            },
            timeout: 10000,
          }
        );

        if (response.data?.dataset?.data) {
          const data = response.data.dataset.data;
          const columns = response.data.dataset.column_names || [];
          
          const chartData: PrivateMarketChartPoint[] = data.map((row: any[]) => ({
            time: row[columns.indexOf('Date')] || row[0],
            valuation: parseFloat(row[columns.indexOf('Valuation')] || row[1]) || 0,
            sharePrice: parseFloat(row[columns.indexOf('SharePrice')] || row[2]) || undefined,
            transactionType: row[columns.indexOf('Type')] || undefined,
          }));

          cache.set(cacheKey, { data: chartData, timestamp: Date.now() });
          return chartData;
        }
      } catch (error: any) {
        logger.warn(`Nasdaq Data Link chart API error:`, error.message);
      }
    }

    // Return empty array if no data available
    return [];
  } catch (error) {
    logger.error(`Error fetching private market chart for ${companyName}:`, error);
    return [];
  }
}

/**
 * Search for private companies on Nasdaq Private Markets
 */
export async function searchPrivateCompanies(query: string): Promise<any[]> {
  if (!NASDAQ_PRIVATE_MARKETS_API_KEY && !NASDAQ_DATA_LINK_API_KEY) {
    return [];
  }

  try {
    logger.debug(`Searching private companies: ${query}`);

    if (NASDAQ_PRIVATE_MARKETS_API_KEY) {
      const response = await axios.get(
        'https://api.nasdaqprivatemarkets.com/v1/companies/search',
        {
          params: {
            q: query,
            limit: 20,
          },
          headers: {
            'Authorization': `Bearer ${NASDAQ_PRIVATE_MARKETS_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.data?.companies) {
        return response.data.companies;
      }
    }

    return [];
  } catch (error) {
    logger.error(`Error searching private companies:`, error);
    return [];
  }
}

export type { PrivateMarketQuote, PrivateMarketChartPoint };

