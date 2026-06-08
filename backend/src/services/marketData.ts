import axios from 'axios';
import YahooFinance from 'yahoo-finance2';
import { logger } from '../utils/logger.js';
import { getCryptoChart } from './cryptoData.js';

// Initialize Yahoo Finance client with suppressed notices
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// API Configuration
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NASDAQ_DATA_LINK_API_KEY = process.env.NASDAQ_DATA_LINK_API_KEY;
// Options API - Using Polygon.io (MASSIVE)
const POLYGON_OPTIONS_API_KEY = process.env.POLYGON_API_KEY;

// Cache for rate limiting
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
}

interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

/**
 * Get real-time quote using Alpha Vantage or Yahoo Finance
 */
export async function getQuote(ticker: string, countryCode?: string): Promise<Quote> {
  const cacheKey = `quote:${ticker}:${countryCode || 'US'}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug(`Fetching quote for ${ticker}${countryCode ? ` (${countryCode})` : ''}`);
    
    // Check if this is a private market company (Nasdaq Private Markets)
    // This would typically be determined by a flag or special ticker format
    // For now, we'll check private markets as a fallback if public markets fail
    
    // PRIMARY: Try Nasdaq Data Link first for public equities (primary data source)
    if (NASDAQ_DATA_LINK_API_KEY) {
      try {
        // Get latest 2 days to calculate change properly (today vs yesterday)
        const response = await axios.get(
          `https://data.nasdaq.com/api/v3/datasets/WIKI/${ticker}.json`,
          {
            params: {
              api_key: NASDAQ_DATA_LINK_API_KEY,
              limit: 2, // Get last 2 days to calculate change
              order: 'desc',
            },
            headers: {
              'User-Agent': 'GM Terminal',
            },
            timeout: 5000,
          }
        );

        if (response.data?.dataset?.data && response.data.dataset.data.length > 0) {
          const latest = response.data.dataset.data[0];
          const previous = response.data.dataset.data[1] || latest;
          const columns = response.data.dataset.column_names || [];
          const closeIdx = columns.indexOf('Close') !== -1 ? columns.indexOf('Close') : 0;
          const openIdx = columns.indexOf('Open') !== -1 ? columns.indexOf('Open') : 1;
          const highIdx = columns.indexOf('High') !== -1 ? columns.indexOf('High') : 2;
          const lowIdx = columns.indexOf('Low') !== -1 ? columns.indexOf('Low') : 3;
          const volumeIdx = columns.indexOf('Volume') !== -1 ? columns.indexOf('Volume') : 4;
          
          const currentPrice = parseFloat(latest[closeIdx]) || 0;
          const previousClose = parseFloat(previous[closeIdx]) || currentPrice;
          const change = currentPrice - previousClose;
          const changePercent = previousClose ? (change / previousClose) * 100 : 0;

          const result: Quote = {
            symbol: ticker,
            price: currentPrice,
            change,
            changePercent,
            volume: parseInt(latest[volumeIdx]) || 0,
            high: parseFloat(latest[highIdx]),
            low: parseFloat(latest[lowIdx]),
            open: parseFloat(latest[openIdx]),
            previousClose,
            timestamp: Date.now(),
          };
          cache.set(cacheKey, { data: result, timestamp: Date.now() });
          logger.debug(`Quote fetched from Nasdaq Data Link (PRIMARY) for ${ticker}`);
          return result;
        }
      } catch (error: any) {
        logger.warn(`Nasdaq Data Link API error for ${ticker}, trying fallback sources:`, error.message);
      }
    } else {
      logger.warn(`Nasdaq Data Link API key not configured - using fallback sources for ${ticker}`);
    }

    // Try Alpha Vantage (free tier: 5 calls/min, 500/day)
    if (ALPHA_VANTAGE_API_KEY && ALPHA_VANTAGE_API_KEY !== 'demo') {
      try {
        const response = await axios.get('https://www.alphavantage.co/query', {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol: countryCode === 'US' ? ticker : `${ticker}.${countryCode}`,
            apikey: ALPHA_VANTAGE_API_KEY,
          },
          timeout: 5000,
        });

        if (response.data['Global Quote'] && !response.data['Note']) {
          const quote = response.data['Global Quote'];
          const result: Quote = {
            symbol: quote['01. symbol'],
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
            volume: parseInt(quote['06. volume']),
            high: parseFloat(quote['03. high']),
            low: parseFloat(quote['04. low']),
            open: parseFloat(quote['02. open']),
            previousClose: parseFloat(quote['08. previous close']),
            timestamp: Date.now(),
          };
          cache.set(cacheKey, { data: result, timestamp: Date.now() });
          logger.debug(`Quote fetched from Alpha Vantage for ${ticker}`);
          return result;
        }
      } catch (avError) {
        logger.warn(`Alpha Vantage API error for ${ticker}, trying Polygon.io:`, avError);
      }
    }

    // Try Polygon.io (supports stocks, options, currencies, indices)
    if (POLYGON_API_KEY) {
      try {
        const response = await axios.get(
          `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`,
          {
            params: {
              adjusted: true,
              apiKey: POLYGON_API_KEY,
            },
            timeout: 5000,
          }
        );

        if (response.data?.results?.[0]) {
          const result = response.data.results[0];
          const currentPrice = result.c || result.close || 0;
          const previousClose = result.o || result.open || currentPrice;
          const change = currentPrice - previousClose;
          const changePercent = previousClose ? (change / previousClose) * 100 : 0;

          const quote: Quote = {
            symbol: ticker,
            price: currentPrice,
            change,
            changePercent,
            volume: result.v || 0,
            high: result.h || result.high,
            low: result.l || result.low,
            open: result.o || result.open,
            previousClose,
            timestamp: Date.now(),
          };
          cache.set(cacheKey, { data: quote, timestamp: Date.now() });
          logger.debug(`Quote fetched from Polygon.io for ${ticker}`);
          return quote;
        }
      } catch (polyError: any) {
        logger.warn(`Polygon.io API error for ${ticker}, trying Yahoo Finance:`, polyError.message);
      }
    }

    // Fallback to Yahoo Finance (unofficial API)
    logger.debug(`Trying Yahoo Finance for ${ticker}`);
    const yahooResponse = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`,
      { timeout: 5000 }
    );

    if (yahooResponse.data?.chart?.result?.[0]) {
      const result = yahooResponse.data.chart.result[0];
      const meta = result.meta;
      const previousClose = meta.previousClose || meta.regularMarketPrice;
      const currentPrice = meta.regularMarketPrice;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      const quote: Quote = {
        symbol: ticker,
        price: currentPrice,
        change,
        changePercent,
        volume: meta.regularMarketVolume || 0,
        high: meta.regularMarketDayHigh,
        low: meta.regularMarketDayLow,
        open: meta.regularMarketPreviousClose,
        previousClose,
        timestamp: Date.now(),
      };
      cache.set(cacheKey, { data: quote, timestamp: Date.now() });
      logger.debug(`Quote fetched from Yahoo Finance for ${ticker}`);
      return quote;
    }

    throw new Error('No data available from any source');
  } catch (error) {
    logger.error(`Error fetching quote for ${ticker}:`, error);
    throw error instanceof Error ? error : new Error(`Failed to fetch quote for ${ticker}`);
  }
}

/**
 * Get historical chart data
 */
export async function getChartData(
  ticker: string,
  period: string = '1d',
  countryCode?: string
): Promise<ChartDataPoint[]> {
  const cacheKey = `chart:${ticker}:${period}:${countryCode || 'US'}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug(`Fetching chart data for ${ticker}${countryCode ? ` (${countryCode})` : ''}, period: ${period}`);
    
    // PRIMARY: Try Nasdaq Data Link first for chart data (primary data source)
    if (NASDAQ_DATA_LINK_API_KEY) {
      try {
        // Calculate date range based on period
        const endDate = new Date();
        const startDate = new Date();
        switch (period) {
          case '1d':
            startDate.setDate(startDate.getDate() - 1);
            break;
          case '5d':
            startDate.setDate(startDate.getDate() - 5);
            break;
          case '1mo':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case '3mo':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case '1y':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          case '5y':
            startDate.setFullYear(startDate.getFullYear() - 5);
            break;
          default:
            startDate.setDate(startDate.getDate() - 1);
        }

        const response = await axios.get(
          `https://data.nasdaq.com/api/v3/datasets/WIKI/${ticker}.json`,
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
          const dateIdx = columns.indexOf('Date') !== -1 ? columns.indexOf('Date') : 0;
          const closeIdx = columns.indexOf('Close') !== -1 ? columns.indexOf('Close') : 1;
          const openIdx = columns.indexOf('Open') !== -1 ? columns.indexOf('Open') : 2;
          const highIdx = columns.indexOf('High') !== -1 ? columns.indexOf('High') : 3;
          const lowIdx = columns.indexOf('Low') !== -1 ? columns.indexOf('Low') : 4;
          const volumeIdx = columns.indexOf('Volume') !== -1 ? columns.indexOf('Volume') : 5;

          const chartData: ChartDataPoint[] = data.map((row: any[]) => ({
            time: row[dateIdx],
            price: parseFloat(row[closeIdx]) || 0,
            volume: parseInt(row[volumeIdx]) || 0,
            open: parseFloat(row[openIdx]),
            high: parseFloat(row[highIdx]),
            low: parseFloat(row[lowIdx]),
            close: parseFloat(row[closeIdx]),
          }));

          cache.set(cacheKey, { data: chartData, timestamp: Date.now() });
          logger.debug(`Chart data fetched from Nasdaq Data Link (PRIMARY) for ${ticker}`);
          return chartData;
        }
      } catch (error: any) {
        logger.warn(`Nasdaq Data Link chart API error for ${ticker}, trying fallback sources:`, error.message);
      }
    } else {
      logger.warn(`Nasdaq Data Link API key not configured - using fallback sources for chart data for ${ticker}`);
    }

    // Try Alpha Vantage for chart data
    if (ALPHA_VANTAGE_API_KEY && ALPHA_VANTAGE_API_KEY !== 'demo') {
      try {
        // Alpha Vantage TIME_SERIES_DAILY for historical data
        const functionMap: Record<string, string> = {
          '1d': 'TIME_SERIES_INTRADAY',
          '5d': 'TIME_SERIES_DAILY',
          '1mo': 'TIME_SERIES_DAILY',
          '3mo': 'TIME_SERIES_DAILY',
          '1y': 'TIME_SERIES_DAILY',
          '5y': 'TIME_SERIES_DAILY_ADJUSTED',
        };
        
        const functionName = functionMap[period] || 'TIME_SERIES_DAILY';
        const symbol = countryCode === 'US' ? ticker : `${ticker}.${countryCode}`;
        
        const response = await axios.get('https://www.alphavantage.co/query', {
          params: {
            function: functionName,
            symbol,
            interval: period === '1d' ? '1min' : undefined,
            outputsize: period === '1d' || period === '5d' ? 'compact' : 'full',
            apikey: ALPHA_VANTAGE_API_KEY,
          },
          timeout: 10000,
        });

        if (response.data && !response.data['Note'] && !response.data['Error Message']) {
          // Find the time series key (varies by function)
          const timeSeriesKey = Object.keys(response.data).find(key => 
            key.includes('Time Series') || key.includes('Meta Data')
          );
          
          if (timeSeriesKey && timeSeriesKey.includes('Time Series')) {
            const timeSeries = response.data[timeSeriesKey];
            const chartData: ChartDataPoint[] = Object.entries(timeSeries)
              .map(([date, values]: [string, any]) => {
                // Handle different Alpha Vantage response formats
                const close = parseFloat(values['4. close'] || values['5. adjusted close'] || values['close'] || 0);
                const open = parseFloat(values['1. open'] || values['open'] || close);
                const high = parseFloat(values['2. high'] || values['high'] || close);
                const low = parseFloat(values['3. low'] || values['low'] || close);
                const volume = parseInt(values['5. volume'] || values['6. volume'] || values['volume'] || '0');
                
                return {
                  time: date,
                  price: close,
                  volume,
                  open,
                  high,
                  low,
                  close,
                };
              })
              .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
              .slice(-200); // Limit to last 200 data points for performance

            if (chartData.length > 0) {
              cache.set(cacheKey, { data: chartData, timestamp: Date.now() });
              logger.debug(`Chart data fetched from Alpha Vantage for ${ticker} (${chartData.length} points)`);
              return chartData;
            }
          }
        }
      } catch (avError: any) {
        logger.warn(`Alpha Vantage chart API error for ${ticker}, trying Polygon.io:`, avError.message);
      }
    }

    // Try Polygon.io for chart data
    if (POLYGON_API_KEY) {
      try {
        // Calculate date range based on period
        const endDate = new Date();
        const startDate = new Date();
        const multiplier = period === '1d' ? 1 : period === '5d' ? 5 : period === '1mo' ? 30 : period === '3mo' ? 90 : period === '1y' ? 365 : 1825;
        startDate.setDate(startDate.getDate() - multiplier);
        
        const timespan = period === '1d' ? 'minute' : period === '5d' ? 'hour' : 'day';
        const multiplierValue = period === '1d' ? 1 : period === '5d' ? 1 : 1;
        
        const response = await axios.get(
          `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${multiplierValue}/${timespan}/${startDate.toISOString().split('T')[0]}/${endDate.toISOString().split('T')[0]}`,
          {
            params: {
              adjusted: true,
              sort: 'asc',
              limit: 5000,
              apiKey: POLYGON_API_KEY,
            },
            timeout: 10000,
          }
        );

        if (response.data?.results && response.data.results.length > 0) {
          const chartData: ChartDataPoint[] = response.data.results.map((bar: any) => ({
            time: new Date(bar.t).toISOString(),
            price: bar.c || bar.close || 0,
            volume: bar.v || bar.volume || 0,
            open: bar.o || bar.open,
            high: bar.h || bar.high,
            low: bar.l || bar.low,
            close: bar.c || bar.close,
          }));

          cache.set(cacheKey, { data: chartData, timestamp: Date.now() });
          logger.debug(`Chart data fetched from Polygon.io for ${ticker}`);
          return chartData;
        }
      } catch (polyError: any) {
        logger.warn(`Polygon.io chart API error for ${ticker}, trying Yahoo Finance:`, polyError.message);
      }
    }

    // Fallback to Yahoo Finance for chart data (if Nasdaq unavailable)
    const intervals: Record<string, string> = {
      '1d': '1m',
      '5d': '5m',
      '1mo': '1h',
      '3mo': '1d',
      '1y': '1d',
      '5y': '1wk',
    };

    const ranges: Record<string, string> = {
      '1d': '1d',
      '5d': '5d',
      '1mo': '1mo',
      '3mo': '3mo',
      '1y': '1y',
      '5y': '5y',
    };

    const interval = intervals[period] || '1d';
    const range = ranges[period] || '1d';

    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`,
      {
        params: {
          interval,
          range,
        },
        timeout: 10000,
      }
    );

    if (response.data?.chart?.result?.[0]) {
      const result = response.data.chart.result[0];
      const timestamps = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0] || {};
      const opens = quotes.open || [];
      const highs = quotes.high || [];
      const lows = quotes.low || [];
      const closes = quotes.close || [];
      const volumes = quotes.volume || [];

      const data: ChartDataPoint[] = timestamps.map((ts: number, i: number) => ({
        time: new Date(ts * 1000).toISOString(),
        price: closes[i] || 0,
        volume: volumes[i] || 0,
        open: opens[i],
        high: highs[i],
        low: lows[i],
        close: closes[i],
      }));

      cache.set(cacheKey, { data, timestamp: Date.now() });
      logger.debug(`Chart data fetched from Yahoo Finance for ${ticker}`);
      return data;
    }

    throw new Error('No chart data available from any source');
  } catch (error) {
    logger.error(`Error fetching chart data for ${ticker}:`, error);
    throw error instanceof Error ? error : new Error(`Failed to fetch chart data for ${ticker}`);
  }
}

/**
 * Get news for a ticker
 */
export async function getNews(ticker: string, limit: number = 20): Promise<any[]> {
  const cacheKey = `news:${ticker}:${limit}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 5) { // 5 min cache for news
    return cached.data;
  }

  try {
    // Try NewsAPI first
    if (NEWS_API_KEY) {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: ticker,
          sortBy: 'publishedAt',
          pageSize: limit,
          apiKey: NEWS_API_KEY,
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
          ticker,
          description: article.description,
          imageUrl: article.urlToImage,
        }));
        cache.set(cacheKey, { data: news, timestamp: Date.now() });
        return news;
      }
    }

    // Fallback to NewsData.io (free tier)
    try {
      const response = await axios.get('https://newsdata.io/api/1/news', {
        params: {
          q: ticker,
          language: 'en',
          apikey: process.env.NEWSDATA_API_KEY,
        },
        timeout: 5000,
      });

      if (response.data?.results) {
        const news = response.data.results.slice(0, limit).map((article: any) => ({
          id: article.article_id || `news-${Date.now()}-${Math.random()}`,
          title: article.title,
          source: article.source_name || 'Unknown',
          url: article.link,
          publishedAt: article.pubDate,
          ticker,
          description: article.description,
          imageUrl: article.image_url,
        }));
        cache.set(cacheKey, { data: news, timestamp: Date.now() });
        return news;
      }
    } catch (e) {
      console.error('NewsData.io error:', e);
    }

    // No news available from any source
    logger.warn(`No news available for ${ticker} from any source`);
    return [];
  } catch (error) {
    logger.error(`Error fetching news for ${ticker}:`, error);
    throw error instanceof Error ? error : new Error(`Failed to fetch news for ${ticker}`);
  }
}

/**
 * Get most active stocks
 */
export async function getMostActive(): Promise<any[]> {
  const cacheKey = 'most-active';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // PRIMARY: Try Polygon.io for most active stocks
  if (POLYGON_API_KEY && POLYGON_API_KEY !== 'demo') {
    try {
      logger.debug('Fetching most active stocks from Polygon.io');
      // Get snapshot of all stocks and sort by volume
      const response = await axios.get(
        'https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers',
        {
          params: {
            apikey: POLYGON_API_KEY,
          },
          timeout: 10000,
        }
      );

      if (response.data?.results && Array.isArray(response.data.results)) {
        // Filter and sort by volume (most active = highest volume)
        const stocks = response.data.results
          .filter((stock: any) => stock.ticker && stock.day?.v && stock.day?.v > 0) // Has ticker and volume
          .sort((a: any, b: any) => (b.day?.v || 0) - (a.day?.v || 0)) // Sort by volume descending
          .slice(0, 20)
          .map((stock: any) => {
            const day = stock.day || {};
            const prevDay = stock.prevDay || {};
            const currentPrice = day.c || day.close || 0;
            const prevClose = prevDay.c || prevDay.close || currentPrice;
            const change = currentPrice - prevClose;
            const changePercent = prevClose ? (change / prevClose) * 100 : 0;
            
            return {
              symbol: stock.ticker,
              name: stock.name || stock.ticker,
              price: currentPrice,
              change: change,
              changePercent: changePercent,
              volume: day.v || day.volume || 0,
            };
          });

        if (stocks.length > 0) {
          cache.set(cacheKey, { data: stocks, timestamp: Date.now() });
          logger.debug(`Fetched ${stocks.length} most active stocks from Polygon.io`);
          return stocks;
        }
      }
    } catch (polygonError: any) {
      logger.warn('Polygon.io most active error, trying fallback:', {
        message: polygonError.message,
        status: polygonError.response?.status,
      });
      // Continue to fallback
    }
  }

  // FALLBACK: Try Yahoo Finance
  try {
    logger.debug('Fetching most active stocks from Yahoo Finance');
    const response = await axios.get(
      'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved',
      {
        params: {
          formatted: true,
          lang: 'en-US',
          region: 'US',
          scrIds: 'most_actives',
          count: 20,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        timeout: 10000,
      }
    );

    if (response.data?.finance?.result?.[0]?.quotes) {
      const stocks = response.data.finance.result[0].quotes.map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.shortName || quote.longName || quote.symbol,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: (quote.regularMarketChangePercent || 0) * 100, // Convert to percentage
        volume: quote.regularMarketVolume || 0,
      }));
      
      if (stocks.length > 0) {
        cache.set(cacheKey, { data: stocks, timestamp: Date.now() });
        logger.debug(`Fetched ${stocks.length} most active stocks from Yahoo Finance`);
        return stocks;
      }
    }
  } catch (yahooError: any) {
    logger.warn('Yahoo Finance most active error:', {
      message: yahooError.message,
      status: yahooError.response?.status,
    });
  }

  // FALLBACK 2: Try Alpha Vantage (if available)
  if (ALPHA_VANTAGE_API_KEY && ALPHA_VANTAGE_API_KEY !== 'demo') {
    try {
      logger.debug('Fetching most active stocks from Alpha Vantage');
      // Alpha Vantage doesn't have a direct "most active" endpoint
      // We'll use top gainers/losers as a proxy
      const response = await axios.get(
        'https://www.alphavantage.co/query',
        {
          params: {
            function: 'TOP_GAINERS_LOSERS',
            apikey: ALPHA_VANTAGE_API_KEY,
          },
          timeout: 10000,
        }
      );

      if (response.data?.most_actively_traded) {
        const stocks = response.data.most_actively_traded.map((stock: any) => ({
          symbol: stock.ticker,
          name: stock.ticker,
          price: parseFloat(stock.price) || 0,
          change: parseFloat(stock.change_amount) || 0,
          changePercent: parseFloat(stock.change_percentage?.replace('%', '')) || 0,
          volume: parseInt(stock.volume) || 0,
        }));

        if (stocks.length > 0) {
          cache.set(cacheKey, { data: stocks, timestamp: Date.now() });
          logger.debug(`Fetched ${stocks.length} most active stocks from Alpha Vantage`);
          return stocks;
        }
      }
    } catch (avError: any) {
      logger.warn('Alpha Vantage most active error:', {
        message: avError.message,
        status: avError.response?.status,
      });
    }
  }

  // If all sources fail, return empty array instead of throwing
  logger.error('All most active stock data sources failed');
  return [];
}

/**
 * Get options chain data using yahoo-finance2 library (more reliable than raw API)
 */
export async function getOptions(ticker: string): Promise<any> {
  const cacheKey = `options:${ticker}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 5) { // 5 min cache for options
    return cached.data;
  }

  const upperTicker = ticker.toUpperCase();

  try {
    logger.info(`Fetching options chain for ${upperTicker} using yahoo-finance2`);
    
    // Use yahoo-finance2 library for reliable options data
    const options = await yahooFinance.options(upperTicker);
    
    if (!options || !options.expirationDates || options.expirationDates.length === 0) {
      throw new Error(`No options available for ${upperTicker}`);
    }

    logger.debug(`Found ${options.expirationDates.length} expiration dates for ${upperTicker}`);

    // Get underlying price from quote
    const underlyingPrice = options.quote?.regularMarketPrice || 0;
    
    // Convert expiration dates to ISO format
    const expirationDates = options.expirationDates.map((date: Date) => {
      return date.toISOString().split('T')[0];
    });

    // Process initial options data
    const allCalls: any[] = [];
    const allPuts: any[] = [];
    const allStrikes = new Set<number>();

    // Helper function to process options for an expiration
    const processOptions = (optionsData: any, expDate: string) => {
      const calls = optionsData.calls || [];
      const puts = optionsData.puts || [];

      for (const call of calls) {
        allStrikes.add(call.strike);
        allCalls.push({
          contract_type: 'call',
          strike_price: call.strike,
          expiration_date: expDate,
          ticker: call.contractSymbol,
          bid: call.bid || 0,
          ask: call.ask || 0,
          last: call.lastPrice || 0,
          volume: call.volume || 0,
          open_interest: call.openInterest || 0,
          implied_volatility: call.impliedVolatility,
          change: call.change || 0,
          percentChange: call.percentChange || 0,
          inTheMoney: call.inTheMoney || false,
        });
      }

      for (const put of puts) {
        allStrikes.add(put.strike);
        allPuts.push({
          contract_type: 'put',
          strike_price: put.strike,
          expiration_date: expDate,
          ticker: put.contractSymbol,
          bid: put.bid || 0,
          ask: put.ask || 0,
          last: put.lastPrice || 0,
          volume: put.volume || 0,
          open_interest: put.openInterest || 0,
          implied_volatility: put.impliedVolatility,
          change: put.change || 0,
          percentChange: put.percentChange || 0,
          inTheMoney: put.inTheMoney || false,
        });
      }
    };

    // Process the first expiration (included in initial response)
    if (options.options && options.options.length > 0) {
      const firstExpDate = expirationDates[0];
      processOptions(options.options[0], firstExpDate);
      logger.debug(`Processed initial expiration ${firstExpDate}: ${options.options[0].calls?.length || 0} calls, ${options.options[0].puts?.length || 0} puts`);
    }

    // Fetch additional expirations (limit to 4 more)
    const additionalDates = options.expirationDates.slice(1, 5);
    
    for (const expDate of additionalDates) {
      try {
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 150));
        
        const expOptions = await yahooFinance.options(upperTicker, { date: expDate });
        
        if (expOptions.options && expOptions.options.length > 0) {
          const expDateStr = expDate.toISOString().split('T')[0];
          processOptions(expOptions.options[0], expDateStr);
          logger.debug(`Fetched expiration ${expDateStr}`);
        }
      } catch (expError: any) {
        logger.warn(`Error fetching options for expiration ${expDate}:`, expError.message);
        // Continue with other expirations
      }
    }

    if (allCalls.length === 0 && allPuts.length === 0) {
      throw new Error(`No options contracts found for ${upperTicker}`);
    }

    const strikes = Array.from(allStrikes).sort((a, b) => a - b);

    const resultData = {
      symbol: upperTicker,
      underlyingPrice,
      expirationDates,
      strikes,
      calls: allCalls,
      puts: allPuts,
    };

    logger.info(`Options chain fetched for ${upperTicker}: ${allCalls.length} calls, ${allPuts.length} puts, ${expirationDates.length} expirations`);
    cache.set(cacheKey, { data: resultData, timestamp: Date.now() });
    return resultData;
  } catch (error: any) {
    logger.error(`Yahoo Finance options error for ${upperTicker}:`, {
      message: error.message,
      name: error.name,
    });

    // Handle specific error types
    if (error.message?.includes('No data found') || error.message?.includes('Symbol not found')) {
      throw new Error(`No options available for ${upperTicker}. This symbol may not have options or may not exist.`);
    }
    if (error.message?.includes('rate limit') || error.message?.includes('Too many')) {
      throw new Error('Rate limit exceeded. Please wait 30-60 seconds and try again.');
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      throw new Error('Service unavailable. Please check your internet connection.');
    }
    
    // Re-throw with the original message if it's our custom error
    if (error.message?.includes('No options')) {
      throw error;
    }
    
    throw new Error(`Failed to fetch options for ${upperTicker}: ${error.message}`);
  }
}

/**
 * Detect if a ticker is a crypto pair
 */
function isCryptoPair(ticker: string): boolean {
  const upper = ticker.toUpperCase();
  // Crypto pairs are typically 6-8 characters (3-4 base + 3-4 quote)
  if (upper.length < 6 || upper.length > 8) return false;
  
  // Common crypto symbols
  const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'MATIC', 'AVAX', 'LINK', 'UNI', 'ATOM',
    'XRP', 'DOGE', 'SHIB', 'LTC', 'BCH', 'XLM', 'ALGO', 'VET', 'FIL', 'TRX',
    'ETC', 'XMR', 'ZEC', 'DASH', 'EOS', 'AAVE', 'MKR', 'COMP', 'SNX', 'YFI',
    'USD', 'USDT', 'USDC', 'DAI', 'EUR', 'GBP', 'JPY'];
  
  // Check if it starts with a known crypto symbol
  for (const symbol of cryptoSymbols) {
    if (upper.startsWith(symbol) && upper.length > symbol.length) {
      const remaining = upper.slice(symbol.length);
      // Check if remaining part is also a crypto symbol, USD, or common fiat
      if (cryptoSymbols.includes(remaining) || 
          remaining === 'USD' || remaining === 'USDT' || remaining === 'USDC' ||
          remaining === 'EUR' || remaining === 'GBP' || remaining === 'JPY') {
        return true;
      }
      // Also check for 3-4 character crypto symbols that might not be in our list
      if (remaining.length >= 3 && remaining.length <= 4 && /^[A-Z]+$/.test(remaining)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get historical performance comparison for multiple securities (supports both equities and crypto)
 * Returns percentage gain/loss over time for each security
 */
export async function getHistoricalComparison(tickers: string[], period: string = '1y'): Promise<any> {
  const cacheKey = `historical-comparison:${tickers.sort().join(',')}:${period}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 5) {
    return cached.data;
  }

  try {
    logger.debug(`Fetching historical comparison for ${tickers.join(', ')}, period: ${period}`);
    
    // Fetch chart data for all tickers - detect crypto vs equity
    const chartDataPromises = tickers.map(async (ticker) => {
      // Check if it's a crypto pair
      if (isCryptoPair(ticker)) {
        logger.debug(`Detected crypto pair: ${ticker}, using crypto chart API`);
        return await getCryptoChart(ticker, period);
      } else {
        // Default to equity chart
        return await getChartData(ticker, period);
      }
    });
    const allChartData = await Promise.all(chartDataPromises);
    
    // Calculate percentage changes from first data point
    const comparisonData = allChartData.map((data, index) => {
      if (!data || data.length === 0) {
        return {
          ticker: tickers[index],
          data: [],
          error: 'No data available',
        };
      }
      
      const firstPrice = data[0].price || data[0].close || 0;
      if (firstPrice === 0) {
        return {
          ticker: tickers[index],
          data: [],
          error: 'Invalid first price',
        };
      }
      
      const performanceData = data.map((point) => {
        const currentPrice = point.price || point.close || 0;
        const percentChange = ((currentPrice - firstPrice) / firstPrice) * 100;
        return {
          time: point.time,
          percentChange,
          price: currentPrice,
        };
      });
      
      return {
        ticker: tickers[index],
        data: performanceData,
      };
    });
    
    const result = {
      tickers,
      period,
      data: comparisonData,
      timestamp: Date.now(),
    };
    
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    logger.error(`Error fetching historical comparison:`, error);
    throw error instanceof Error ? error : new Error('Failed to fetch historical comparison');
  }
}

/**
 * Get ratio analysis between two securities
 * Returns ratio chart, correlation, and beta
 */
export async function getRatioAnalysis(ticker1: string, ticker2: string, period: string = '1y'): Promise<any> {
  const cacheKey = `ratio-analysis:${ticker1}:${ticker2}:${period}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 5) {
    return cached.data;
  }

  try {
    logger.debug(`Fetching ratio analysis for ${ticker1}/${ticker2}, period: ${period}`);
    
    // Fetch chart data for both tickers
    const [data1, data2] = await Promise.all([
      getChartData(ticker1, period),
      getChartData(ticker2, period),
    ]);
    
    if (!data1 || data1.length === 0 || !data2 || data2.length === 0) {
      throw new Error('Insufficient data for ratio analysis');
    }
    
    // Align data by time and calculate ratio
    const ratioData: Array<{ time: string; ratio: number; price1: number; price2: number }> = [];
    const returns1: number[] = [];
    const returns2: number[] = [];
    
    // Create a map of ticker2 data by time for quick lookup
    const data2Map = new Map<string, number>();
    data2.forEach((point) => {
      const time = point.time;
      const price = point.price || point.close || 0;
      if (price > 0) {
        data2Map.set(time, price);
      }
    });
    
    // Calculate ratio and returns
    let prevPrice1 = 0;
    let prevPrice2 = 0;
    
    data1.forEach((point, index) => {
      const time = point.time;
      const price1 = point.price || point.close || 0;
      const price2 = data2Map.get(time) || 0;
      
      if (price1 > 0 && price2 > 0) {
        const ratio = price1 / price2;
        ratioData.push({ time, ratio, price1, price2 });
        
        // Calculate returns for correlation and beta
        if (index > 0 && prevPrice1 > 0 && prevPrice2 > 0) {
          const return1 = (price1 - prevPrice1) / prevPrice1;
          const return2 = (price2 - prevPrice2) / prevPrice2;
          returns1.push(return1);
          returns2.push(return2);
        }
        
        prevPrice1 = price1;
        prevPrice2 = price2;
      }
    });
    
    if (ratioData.length === 0) {
      throw new Error('No valid ratio data points');
    }
    
    // Calculate correlation
    let correlation = 0;
    if (returns1.length > 0 && returns2.length > 0) {
      const mean1 = returns1.reduce((a, b) => a + b, 0) / returns1.length;
      const mean2 = returns2.reduce((a, b) => a + b, 0) / returns2.length;
      
      let numerator = 0;
      let sumSq1 = 0;
      let sumSq2 = 0;
      
      for (let i = 0; i < returns1.length; i++) {
        const diff1 = returns1[i] - mean1;
        const diff2 = returns2[i] - mean2;
        numerator += diff1 * diff2;
        sumSq1 += diff1 * diff1;
        sumSq2 += diff2 * diff2;
      }
      
      const denominator = Math.sqrt(sumSq1 * sumSq2);
      correlation = denominator > 0 ? numerator / denominator : 0;
    }
    
    // Calculate beta (covariance of returns1 and returns2 / variance of returns2)
    let beta = 0;
    if (returns1.length > 0 && returns2.length > 0) {
      const mean1 = returns1.reduce((a, b) => a + b, 0) / returns1.length;
      const mean2 = returns2.reduce((a, b) => a + b, 0) / returns2.length;
      
      let covariance = 0;
      let variance2 = 0;
      
      for (let i = 0; i < returns1.length; i++) {
        const diff1 = returns1[i] - mean1;
        const diff2 = returns2[i] - mean2;
        covariance += diff1 * diff2;
        variance2 += diff2 * diff2;
      }
      
      covariance /= returns1.length;
      variance2 /= returns2.length;
      
      beta = variance2 > 0 ? covariance / variance2 : 0;
    }
    
    const result = {
      ticker1,
      ticker2,
      period,
      ratioData,
      correlation,
      beta,
      timestamp: Date.now(),
    };
    
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    logger.error(`Error fetching ratio analysis:`, error);
    throw error instanceof Error ? error : new Error('Failed to fetch ratio analysis');
  }
}

