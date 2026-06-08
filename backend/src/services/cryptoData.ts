import axios from 'axios';
import { logger } from '../utils/logger.js';

// API Configuration
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds for crypto

interface CryptoQuote {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap?: number;
  high24h?: number;
  low24h?: number;
  timestamp: number;
}

interface CryptoChartPoint {
  time: string;
  price: number;
  volume: number;
}

/**
 * Parse crypto pair (e.g., BTCUSD -> BTC/USD)
 */
function parseCryptoPair(pair: string): { base: string; quote: string } {
  const upper = pair.toUpperCase();
  
  // Common crypto symbols
  const cryptos = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'ADA', 'SOL', 'DOGE', 'DOT', 'MATIC', 'LTC', 'AVAX', 'LINK', 'UNI', 'ATOM', 'ETC', 'XLM', 'ALGO', 'ZEC'];
  
  // Try to find base crypto
  for (const crypto of cryptos) {
    if (upper.startsWith(crypto)) {
      const base = crypto;
      const quote = upper.slice(crypto.length);
      return { base, quote: quote || 'USD' };
    }
  }
  
  // Default: first 3 chars as base, rest as quote
  return {
    base: upper.slice(0, 3),
    quote: upper.slice(3) || 'USD',
  };
}

/**
 * Get crypto quote
 * Priority: CoinMarketCap (if key provided) -> CoinGecko (free fallback)
 */
export async function getCryptoQuote(pair: string): Promise<CryptoQuote> {
  const cacheKey = `crypto:quote:${pair}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const { base, quote } = parseCryptoPair(pair);

  // Try CoinMarketCap first (better data quality and rate limits)
  if (COINMARKETCAP_API_KEY) {
    try {
      logger.debug(`Fetching crypto quote from CoinMarketCap for ${pair}`);
      
      // CoinMarketCap uses symbol lookup
      const symbol = base.toUpperCase();
      const convert = quote.toUpperCase() || 'USD';
      
      const response = await axios.get(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
        {
          params: {
            symbol,
            convert,
          },
          headers: {
            'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
            'Accept': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.data?.data && response.data.data[symbol]) {
        const data = response.data.data[symbol];
        const quoteData = data.quote[convert];
        
        const result: CryptoQuote = {
          symbol: pair,
          price: quoteData.price || 0,
          change24h: quoteData.price_change_24h || 0,
          changePercent24h: quoteData.percent_change_24h || 0,
          volume24h: quoteData.volume_24h || 0,
          marketCap: quoteData.market_cap || 0,
          high24h: quoteData.high_24h,
          low24h: quoteData.low_24h,
          timestamp: Date.now(),
        };
        
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        logger.debug(`Crypto quote fetched from CoinMarketCap for ${pair}`);
        return result;
      }
    } catch (cmcError: any) {
      logger.warn(`CoinMarketCap error for ${pair}, trying CoinGecko:`, cmcError.message);
    }
  }

  // Fallback to CoinGecko (free API)
  try {
    logger.debug(`Fetching crypto quote from CoinGecko for ${pair}`);
    const coinId = base.toLowerCase();
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price`,
      {
        params: {
          ids: coinId,
          vs_currencies: quote.toLowerCase(),
          include_24hr_change: true,
          include_24hr_vol: true,
          include_market_cap: true,
          include_24hr_high_low: true,
        },
        timeout: 5000,
      }
    );

    if (response.data[coinId]) {
      const data = response.data[coinId];
      const priceKey = quote.toLowerCase();
      const price = data[priceKey] || 0;
      const change24h = data[`${priceKey}_24h_change`] || 0;
      const volume24h = data[`${priceKey}_24h_vol`] || 0;
      const marketCap = data[`${priceKey}_market_cap`] || 0;
      const high24h = data[`${priceKey}_24h_high`];
      const low24h = data[`${priceKey}_24h_low`];

      const result: CryptoQuote = {
        symbol: pair,
        price,
        change24h,
        changePercent24h: change24h,
        volume24h,
        marketCap,
        high24h,
        low24h,
        timestamp: Date.now(),
      };
      
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }

    // Try alternative: if it's a ratio pair (e.g., BTCZEC)
    if (quote !== 'USD' && quote.length >= 3) {
      // For ratio pairs, we'd need to calculate from individual prices
      // This is a simplified version
      const baseResponse = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price`,
        {
          params: {
            ids: base.toLowerCase(),
            vs_currencies: 'usd',
          },
          timeout: 5000,
        }
      );
      
      const quoteResponse = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price`,
        {
          params: {
            ids: quote.toLowerCase(),
            vs_currencies: 'usd',
          },
          timeout: 5000,
        }
      );

      if (baseResponse.data[base.toLowerCase()] && quoteResponse.data[quote.toLowerCase()]) {
        const basePrice = baseResponse.data[base.toLowerCase()].usd;
        const quotePrice = quoteResponse.data[quote.toLowerCase()].usd;
        const ratio = basePrice / quotePrice;
        
        const result: CryptoQuote = {
          symbol: pair,
          price: ratio,
          change24h: 0, // Would need historical data for this
          changePercent24h: 0,
          volume24h: 0,
          timestamp: Date.now(),
        };
        
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    }

    throw new Error('Crypto data not found');
  } catch (error) {
    logger.error(`Error fetching crypto quote for ${pair}:`, error);
    throw error instanceof Error ? error : new Error(`Failed to fetch crypto quote for ${pair}`);
  }
}

/**
 * Get crypto chart data
 * Priority: Polygon.io (MASSIVE) -> CoinMarketCap (if key provided) -> CoinGecko (free fallback)
 */
export async function getCryptoChart(
  pair: string,
  period: string = '1d'
): Promise<CryptoChartPoint[]> {
  const cacheKey = `crypto:chart:${pair}:${period}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const { base, quote } = parseCryptoPair(pair);
  const symbol = base.toUpperCase();
  const convert = quote.toUpperCase() || 'USD';

  // PRIMARY: Try Polygon.io first (MASSIVE - best data source)
  // Check if API key is available (may be loaded from dotenv)
  const polygonKey = POLYGON_API_KEY || process.env.POLYGON_API_KEY;
  if (polygonKey && polygonKey !== 'demo') {
    try {
      logger.debug(`Fetching crypto chart from Polygon.io for ${pair} (${period})`);
      
      // Polygon.io crypto format: X:BTCUSD, X:ETHUSD, etc.
      const polygonTicker = `X:${symbol}${convert}`;
      
      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      let multiplier = 1;
      let timespan: 'minute' | 'hour' | 'day' = 'day';
      
      switch (period) {
        case '1d':
          startDate.setDate(startDate.getDate() - 1);
          timespan = 'hour';
          multiplier = 1;
          break;
        case '5d':
          startDate.setDate(startDate.getDate() - 5);
          timespan = 'hour';
          multiplier = 1;
          break;
        case '1mo':
          startDate.setMonth(startDate.getMonth() - 1);
          timespan = 'day';
          multiplier = 1;
          break;
        case '3mo':
          startDate.setMonth(startDate.getMonth() - 3);
          timespan = 'day';
          multiplier = 1;
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          timespan = 'day';
          multiplier = 1;
          break;
        case '5y':
          startDate.setFullYear(startDate.getFullYear() - 5);
          timespan = 'day';
          multiplier = 1;
          break;
        default:
          startDate.setDate(startDate.getDate() - 1);
          timespan = 'hour';
          multiplier = 1;
      }
      
      // Ensure we don't request future dates
      if (startDate > endDate) {
        startDate.setTime(endDate.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
      }
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      logger.debug(`Polygon.io crypto chart request: ${polygonTicker}, ${startDateStr} to ${endDateStr}, ${timespan}`);
      
      const response = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/${polygonTicker}/range/${multiplier}/${timespan}/${startDateStr}/${endDateStr}`,
        {
          params: {
            apiKey: polygonKey,
            limit: 50000, // Max limit
            sort: 'asc',
          },
          timeout: 15000,
        }
      );

      // Check for errors in response
      if (response.data?.status === 'ERROR' || response.data?.status === 'NOT_AUTHORIZED') {
        logger.warn(`Polygon.io crypto chart authorization error for ${pair}:`, response.data);
        throw new Error(`Polygon.io API error: ${response.data.message || 'Not authorized'}`);
      }

      if (response.data?.results && Array.isArray(response.data.results) && response.data.results.length > 0) {
        const results = response.data.results;
        const data: CryptoChartPoint[] = results.map((bar: any) => ({
          time: new Date(bar.t).toISOString(), // t is timestamp in milliseconds
          price: bar.c || bar.close || 0, // c is close price
          volume: bar.v || bar.volume || 0, // v is volume
          open: bar.o || bar.open,
          high: bar.h || bar.high,
          low: bar.l || bar.low,
          close: bar.c || bar.close,
        }));
        
        cache.set(cacheKey, { data, timestamp: Date.now() });
        logger.debug(`Crypto chart fetched from Polygon.io for ${pair} (${data.length} points)`);
        return data;
      } else if (response.data?.resultsCount === 0) {
        logger.warn(`Polygon.io returned 0 results for ${pair}, trying fallback`);
        throw new Error('No data available from Polygon.io');
      }
    } catch (polygonError: any) {
      // Log the error but continue to fallback
      const errorDetails = {
        message: polygonError.message,
        status: polygonError.response?.status,
        statusText: polygonError.response?.statusText,
        data: polygonError.response?.data,
      };
      logger.warn(`Polygon.io crypto chart error for ${pair}, trying fallback:`, errorDetails);
      // Don't throw - continue to fallback providers
    }
  } else {
    logger.debug(`Polygon.io API key not configured, skipping Polygon.io for ${pair}`);
  }

  // SECONDARY: Try CoinMarketCap
  if (COINMARKETCAP_API_KEY) {
    try {
      logger.debug(`Fetching crypto chart from CoinMarketCap for ${pair} (${period})`);
      
      // Map period to CoinMarketCap time ranges
      let timeStart: string;
      let timeEnd = new Date().toISOString();
      const now = Date.now();
      
      switch (period) {
        case '1d':
          timeStart = new Date(now - 24 * 60 * 60 * 1000).toISOString();
          break;
        case '5d':
          timeStart = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '1mo':
          timeStart = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '3mo':
          timeStart = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '1y':
          timeStart = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '5y':
          timeStart = new Date(now - 5 * 365 * 24 * 60 * 60 * 1000).toISOString();
          break;
        default:
          timeStart = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      }
      
      const response = await axios.get(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/ohlcv/historical',
        {
          params: {
            symbol,
            convert,
            time_start: timeStart,
            time_end: timeEnd,
            interval: period === '1d' || period === '5d' ? 'hourly' : 'daily',
          },
          headers: {
            'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
            'Accept': 'application/json',
          },
          timeout: 15000,
        }
      );

      if (response.data?.data?.quotes) {
        const quotes = response.data.data.quotes;
        const data: CryptoChartPoint[] = quotes.map((quote: any) => ({
          time: quote.time_open || quote.time_close,
          price: quote.quote[convert]?.close || quote.quote[convert]?.open || 0,
          volume: quote.quote[convert]?.volume || 0,
        }));
        
        cache.set(cacheKey, { data, timestamp: Date.now() });
        logger.debug(`Crypto chart fetched from CoinMarketCap for ${pair} (${data.length} points)`);
        return data;
      }
    } catch (cmcError: any) {
      logger.warn(`CoinMarketCap chart error for ${pair}, trying CoinGecko:`, cmcError.message);
    }
  }

  // Fallback to CoinGecko (free tier - no API key required)
  try {
    logger.debug(`Fetching crypto chart from CoinGecko for ${pair} (${period})`);
    const coinId = base.toLowerCase();
    
    // CoinGecko market chart - free tier doesn't support interval parameter
    const days = period === '1d' ? 1 : period === '5d' ? 5 : period === '1mo' ? 30 : period === '3mo' ? 90 : period === '1y' ? 365 : 1825;
    
    // CoinGecko free tier: don't use 'interval' parameter (causes 401)
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`,
      {
        params: {
          vs_currency: quote.toLowerCase() === 'usd' ? 'usd' : 'usd', // CoinGecko mostly uses USD
          days,
          // Note: 'interval' parameter requires paid plan - removed for free tier
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'GM Terminal/1.0',
        },
      }
    );

    if (response.data?.prices) {
      const prices = response.data.prices;
      const volumes = response.data.total_volumes || [];
      
      const data: CryptoChartPoint[] = prices.map(([timestamp, price]: [number, number], i: number) => ({
        time: new Date(timestamp).toISOString(),
        price,
        volume: volumes[i]?.[1] || 0,
      }));
      
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    }

    throw new Error('No chart data available');
  } catch (error) {
    logger.error(`Error fetching crypto chart for ${pair} from all sources:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error instanceof Error ? error : new Error(`Failed to fetch crypto chart for ${pair}`);
  }
}

/**
 * Get crypto news
 */
export async function getCryptoNews(pair: string, limit: number = 20): Promise<any[]> {
  const cacheKey = `crypto:news:${pair}:${limit}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 5) {
    return cached.data;
  }

  try {
    const { base } = parseCryptoPair(pair);
    
    // Use NewsAPI or similar
    if (process.env.NEWS_API_KEY) {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: base,
          sortBy: 'publishedAt',
          pageSize: limit,
          apiKey: process.env.NEWS_API_KEY,
        },
        timeout: 5000,
      });

      if (response.data?.articles) {
        const news = response.data.articles.map((article: any) => ({
          id: article.url || `news-${Date.now()}-${Math.random()}`,
          title: article.title,
          source: article.source?.name || 'Unknown',
          url: article.url,
          publishedAt: article.publishedAt,
          ticker: pair,
          description: article.description,
        }));
        cache.set(cacheKey, { data: news, timestamp: Date.now() });
        return news;
      }
    }

    // No news available
    logger.warn(`No crypto news available for ${pair} from any source`);
    return [];
  } catch (error) {
    logger.error(`Error fetching crypto news for ${pair}:`, error);
    // Return empty array for news (not critical - news is optional)
    return [];
  }
}

