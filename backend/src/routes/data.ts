import { Hono } from 'hono';
import { getQuote, getChartData, getNews, getMostActive, getOptions, getHistoricalComparison, getRatioAnalysis } from '../services/marketData.js';
import { getCryptoQuote, getCryptoChart, getCryptoNews } from '../services/cryptoData.js';
import { getFilings } from '../services/edgarData.js';
import { getForm13F, searchManagers, getAllManagers } from '../services/form13FData.js';
import { getPrivateMarketQuote, getPrivateMarketChart, searchPrivateCompanies } from '../services/nasdaqPrivateMarkets.js';
import { getFinancialStatements } from '../services/financialStatements.js';
import { getFundamentalAnalysis } from '../services/fundamentalAnalysis.js';
import { logger } from '../utils/logger.js';

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  Bindings: Env;
};

const router = new Hono<{ Bindings: Env }>();

// Get quote data for equities
router.get('/quote/:ticker', async (c) => {
  try {
    const { ticker } = c.req.param();
    const { countryCode } = c.req.query();
    
    logger.info(`GET /quote/${ticker}`, { countryCode });
    const quote = await getQuote(ticker, countryCode as string);
    return c.json(quote);
  } catch (error) {
    logger.error('Quote error:', error);
    return c.json({ 
      error: 'Failed to fetch quote',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get chart data for equities
router.get('/chart/:ticker', async (c) => {
  try {
    const { ticker } = c.req.param();
    const { period, countryCode } = c.req.query();

    logger.info(`GET /chart/${ticker}`, { period, countryCode });
    const data = await getChartData(ticker, (period as string) || '1d', (countryCode as string) || '');
    return c.json({ ticker, period: period || '1d', data });
  } catch (error) {
    logger.error('Chart error:', error);
    return c.json({ 
      error: 'Failed to fetch chart data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get news for equities
router.get('/news/:ticker', async (c) => {
  try {
    const { ticker } = c.req.param();
    const { limit } = c.req.query();

    logger.info(`GET /news/${ticker}`, { limit });
    const news = await getNews(ticker, parseInt(limit as string) || 20);
    return c.json({ ticker, news });
  } catch (error) {
    logger.error('News error:', error);
    return c.json({ 
      error: 'Failed to fetch news',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get options chain
router.get('/options/:ticker', async (c) => {
  try {
    const { ticker } = c.req.param();
    logger.info(`GET /options/${ticker}`);
    const options = await getOptions(ticker);
    return c.json(options);
  } catch (error) {
    logger.error('Options error:', error);
    return c.json({ 
      error: 'Failed to fetch options',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get historical performance comparison
router.get('/historical-comparison', async (c) => {
  try {
    const { tickers, period } = c.req.query();
    if (!tickers || typeof tickers !== 'string') {
      return c.json({ error: 'tickers parameter required (comma-separated)' }, 400);
    }
    const tickerArray = tickers.split(',').map(t => t.trim()).filter(Boolean);
    if (tickerArray.length === 0) {
      return c.json({ error: 'At least one ticker required' }, 400);
    }
    logger.info(`GET /historical-comparison?tickers=${tickers}&period=${period || '1y'}`);
    const comparison = await getHistoricalComparison(tickerArray, (period as string) || '1y');
    return c.json(comparison);
  } catch (error) {
    logger.error('Historical comparison error:', error);
    return c.json({ 
      error: 'Failed to fetch historical comparison',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get ratio analysis
router.get('/ratio-analysis', async (c) => {
  try {
    const { ticker1, ticker2, period } = c.req.query();
    if (!ticker1 || !ticker2) {
      return c.json({ error: 'ticker1 and ticker2 parameters required' }, 400);
    }
    logger.info(`GET /ratio-analysis?ticker1=${ticker1}&ticker2=${ticker2}&period=${period || '1y'}`);
    const analysis = await getRatioAnalysis(ticker1 as string, ticker2 as string, (period as string) || '1y');
    return c.json(analysis);
  } catch (error) {
    logger.error('Ratio analysis error:', error);
    return c.json({ 
      error: 'Failed to fetch ratio analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get most active stocks
router.get('/most-active', async (c) => {
  try {
    const stocks = await getMostActive();
    return c.json({ stocks });
  } catch (error) {
    logger.error('Most active error:', error);
    return c.json({ 
      error: 'Failed to fetch most active stocks',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get crypto quote
router.get('/crypto/:pair', async (c) => {
  try {
    const { pair } = c.req.param();
    logger.info(`GET /crypto/${pair}`);
    const quote = await getCryptoQuote(pair);
    return c.json(quote);
  } catch (error) {
    logger.error('Crypto quote error:', error);
    return c.json({ 
      error: 'Failed to fetch crypto data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get crypto chart
router.get('/crypto/:pair/chart', async (c) => {
  try {
    const { pair } = c.req.param();
    const { period } = c.req.query();
    const data = await getCryptoChart(pair, (period as string) || '1d');
    return c.json({ pair, period: period || '1d', data });
  } catch (error) {
    logger.error('Crypto chart error:', error);
    return c.json({ 
      error: 'Failed to fetch crypto chart',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get crypto news
router.get('/crypto/:pair/news', async (c) => {
  try {
    const { pair } = c.req.param();
    const { limit } = c.req.query();
    logger.info(`GET /crypto/${pair}/news`, { limit });
    const news = await getCryptoNews(pair, parseInt(limit as string) || 20);
    return c.json({ pair, news });
  } catch (error) {
    logger.error('Crypto news error:', error);
    return c.json({ 
      error: 'Failed to fetch crypto news',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get EDGAR filings
router.get('/filings/:ticker', async (c) => {
  try {
    const { ticker } = c.req.param();
    const { limit } = c.req.query();
    const filings = await getFilings(ticker, parseInt(limit as string) || 20);
    return c.json({ ticker, filings });
  } catch (error) {
    logger.error('Filings error:', error);
    return c.json({ 
      error: 'Failed to fetch filings',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get 13-F filings for a manager
router.get('/form13f/:managerName', async (c) => {
  try {
    const { managerName } = c.req.param();
    const { limit } = c.req.query();
    const decodedName = decodeURIComponent(managerName);
    logger.info(`GET /form13f/${decodedName}`, { limit });
    const form13FData = await getForm13F(decodedName, parseInt(limit as string) || 10);
    return c.json(form13FData);
  } catch (error) {
    logger.error('13-F error:', error);
    return c.json({ 
      error: 'Failed to fetch 13-F filings',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get all tracked managers
router.get('/managers', async (c) => {
  try {
    logger.info(`GET /managers`);
    const managers = getAllManagers();
    return c.json({ managers });
  } catch (error) {
    logger.error('Get managers error:', error);
    return c.json({ 
      error: 'Failed to get managers',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Search for managers
router.get('/managers/search', async (c) => {
  try {
    const { q } = c.req.query();
    if (!q) {
      return c.json({ error: 'Query parameter required' }, 400);
    }
    logger.info(`GET /managers/search`, { q });
    const results = await searchManagers(q as string);
    return c.json({ managers: results });
  } catch (error) {
    logger.error('Manager search error:', error);
    return c.json({ 
      error: 'Failed to search managers',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get private market quote (Nasdaq Private Markets)
router.get('/private-market/:companyName', async (c) => {
  try {
    const { companyName } = c.req.param();
    const { ticker } = c.req.query();
    logger.info(`GET /private-market/${companyName}`, { ticker });
    const quote = await getPrivateMarketQuote(companyName, ticker as string);
    if (quote) {
      return c.json(quote);
    } else {
      return c.json({ 
        error: 'Private market data not found',
        message: 'Company may not be listed on Nasdaq Private Markets or API key not configured'
      }, 404);
    }
  } catch (error) {
    logger.error('Private market quote error:', error);
    return c.json({ 
      error: 'Failed to fetch private market data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get private market chart
router.get('/private-market/:companyName/chart', async (c) => {
  try {
    const { companyName } = c.req.param();
    const { ticker, period } = c.req.query();
    logger.info(`GET /private-market/${companyName}/chart`, { ticker, period });
    const chartData = await getPrivateMarketChart(companyName, ticker as string, (period as string) || '1y');
    return c.json({ companyName, ticker, period: period || '1y', data: chartData });
  } catch (error) {
    logger.error('Private market chart error:', error);
    return c.json({ 
      error: 'Failed to fetch private market chart',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Search private companies
router.get('/private-market/search', async (c) => {
  try {
    const { q } = c.req.query();
    if (!q) {
      return c.json({ error: 'Query parameter required' }, 400);
    }
    logger.info(`GET /private-market/search`, { q });
    const companies = await searchPrivateCompanies(q as string);
    return c.json({ companies });
  } catch (error) {
    logger.error('Private market search error:', error);
    return c.json({ 
      error: 'Failed to search private companies',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get fundamental analysis
router.get('/fundamental-analysis/:ticker', async (c) => {
  try {
    const { ticker } = c.req.param();
    const { countryCode } = c.req.query();
    logger.info(`GET /fundamental-analysis/${ticker}`);
    const analysis = await getFundamentalAnalysis(ticker, countryCode as string);
    return c.json(analysis);
  } catch (error) {
    logger.error('Fundamental analysis error:', error);
    return c.json({ 
      error: 'Failed to fetch fundamental analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get financial statements
router.get('/financials/:ticker', async (c) => {
  try {
    const { ticker } = c.req.param();
    const { countryCode, periodType } = c.req.query();
    logger.info(`GET /financials/${ticker}`, { countryCode, periodType });
    const statements = await getFinancialStatements(
      ticker,
      countryCode as string,
      (periodType as 'quarterly' | 'annual') || 'quarterly'
    );
    return c.json({ ticker, periodType: periodType || 'quarterly', statements });
  } catch (error) {
    logger.error('Financials error:', error);
    return c.json({ 
      error: 'Failed to fetch financial statements',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export { router as dataRoutes };