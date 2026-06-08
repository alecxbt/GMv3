import { Router } from 'express';
import { getQuote, getChartData, getNews, getMostActive, getOptions, getHistoricalComparison, getRatioAnalysis } from '../services/marketData.js';
import { getCryptoQuote, getCryptoChart, getCryptoNews } from '../services/cryptoData.js';
import { getFilings } from '../services/edgarData.js';
import { getForm13F, searchManagers, getAllManagers } from '../services/form13FData.js';
import { getPrivateMarketQuote, getPrivateMarketChart, searchPrivateCompanies } from '../services/nasdaqPrivateMarkets.js';
import { getFinancialStatements } from '../services/financialStatements.js';
import { getFundamentalAnalysis } from '../services/fundamentalAnalysis.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Get quote data for equities
router.get('/quote/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { countryCode } = req.query;
    
    logger.info(`GET /quote/${ticker}`, { countryCode });
    const quote = await getQuote(ticker, countryCode as string);
    res.json(quote);
  } catch (error) {
    logger.error('Quote error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quote',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get chart data for equities
router.get('/chart/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { period = '1d', countryCode } = req.query;

    logger.info(`GET /chart/${ticker}`, { period, countryCode });
    const data = await getChartData(ticker, period as string, countryCode as string);
    res.json({ ticker, period, data });
  } catch (error) {
    logger.error('Chart error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chart data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get news for equities
router.get('/news/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { limit = 20 } = req.query;

    logger.info(`GET /news/${ticker}`, { limit });
    const news = await getNews(ticker, parseInt(limit as string));
    res.json({ ticker, news });
  } catch (error) {
    logger.error('News error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch news',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get options chain
router.get('/options/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    logger.info(`GET /options/${ticker}`);
    const options = await getOptions(ticker);
    res.json(options);
  } catch (error) {
    logger.error('Options error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch options',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get historical performance comparison
router.get('/historical-comparison', async (req, res) => {
  try {
    const { tickers, period } = req.query;
    if (!tickers || typeof tickers !== 'string') {
      return res.status(400).json({ error: 'tickers parameter required (comma-separated)' });
    }
    const tickerArray = tickers.split(',').map(t => t.trim()).filter(Boolean);
    if (tickerArray.length === 0) {
      return res.status(400).json({ error: 'At least one ticker required' });
    }
    logger.info(`GET /historical-comparison?tickers=${tickers}&period=${period || '1y'}`);
    const comparison = await getHistoricalComparison(tickerArray, (period as string) || '1y');
    res.json(comparison);
  } catch (error) {
    logger.error('Historical comparison error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch historical comparison',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get ratio analysis
router.get('/ratio-analysis', async (req, res) => {
  try {
    const { ticker1, ticker2, period } = req.query;
    if (!ticker1 || !ticker2) {
      return res.status(400).json({ error: 'ticker1 and ticker2 parameters required' });
    }
    logger.info(`GET /ratio-analysis?ticker1=${ticker1}&ticker2=${ticker2}&period=${period || '1y'}`);
    const analysis = await getRatioAnalysis(ticker1 as string, ticker2 as string, (period as string) || '1y');
    res.json(analysis);
  } catch (error) {
    logger.error('Ratio analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch ratio analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get most active stocks
router.get('/most-active', async (req, res) => {
  try {
    const stocks = await getMostActive();
    res.json({ stocks });
  } catch (error) {
    logger.error('Most active error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch most active stocks',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get crypto quote
router.get('/crypto/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    logger.info(`GET /crypto/${pair}`);
    const quote = await getCryptoQuote(pair);
    res.json(quote);
  } catch (error) {
    logger.error('Crypto quote error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch crypto data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get crypto chart
router.get('/crypto/:pair/chart', async (req, res) => {
  try {
    const { pair } = req.params;
    const { period = '1d' } = req.query;
    const data = await getCryptoChart(pair, period as string);
    res.json({ pair, period, data });
  } catch (error) {
    logger.error('Crypto chart error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch crypto chart',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get crypto news
router.get('/crypto/:pair/news', async (req, res) => {
  try {
    const { pair } = req.params;
    const { limit = 20 } = req.query;
    logger.info(`GET /crypto/${pair}/news`, { limit });
    const news = await getCryptoNews(pair, parseInt(limit as string));
    res.json({ pair, news });
  } catch (error) {
    logger.error('Crypto news error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch crypto news',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get EDGAR filings
router.get('/filings/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { limit = 20 } = req.query;
    const filings = await getFilings(ticker, parseInt(limit as string));
    res.json({ ticker, filings });
  } catch (error) {
    logger.error('Filings error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch filings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get 13-F filings for a manager
router.get('/form13f/:managerName', async (req, res) => {
  try {
    const { managerName } = req.params;
    const { limit = 10 } = req.query;
    const decodedName = decodeURIComponent(managerName);
    logger.info(`GET /form13f/${decodedName}`, { limit });
    const form13FData = await getForm13F(decodedName, parseInt(limit as string));
    res.json(form13FData);
  } catch (error) {
    logger.error('13-F error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch 13-F filings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all tracked managers
router.get('/managers', async (req, res) => {
  try {
    logger.info(`GET /managers`);
    const managers = getAllManagers();
    res.json({ managers });
  } catch (error) {
    logger.error('Get managers error:', error);
    res.status(500).json({ 
      error: 'Failed to get managers',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Search for managers
router.get('/managers/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter required' });
    }
    logger.info(`GET /managers/search`, { q });
    const results = await searchManagers(q as string);
    res.json({ managers: results });
  } catch (error) {
    logger.error('Manager search error:', error);
    res.status(500).json({ 
      error: 'Failed to search managers',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get private market quote (Nasdaq Private Markets)
router.get('/private-market/:companyName', async (req, res) => {
  try {
    const { companyName } = req.params;
    const { ticker } = req.query;
    logger.info(`GET /private-market/${companyName}`, { ticker });
    const quote = await getPrivateMarketQuote(companyName, ticker as string);
    if (quote) {
      res.json(quote);
    } else {
      res.status(404).json({ 
        error: 'Private market data not found',
        message: 'Company may not be listed on Nasdaq Private Markets or API key not configured'
      });
    }
  } catch (error) {
    logger.error('Private market quote error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch private market data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get private market chart
router.get('/private-market/:companyName/chart', async (req, res) => {
  try {
    const { companyName } = req.params;
    const { ticker, period = '1y' } = req.query;
    logger.info(`GET /private-market/${companyName}/chart`, { ticker, period });
    const chartData = await getPrivateMarketChart(companyName, ticker as string, period as string);
    res.json({ companyName, ticker, period, data: chartData });
  } catch (error) {
    logger.error('Private market chart error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch private market chart',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Search private companies
router.get('/private-market/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter required' });
    }
    logger.info(`GET /private-market/search`, { q });
    const companies = await searchPrivateCompanies(q as string);
    res.json({ companies });
  } catch (error) {
    logger.error('Private market search error:', error);
    res.status(500).json({ 
      error: 'Failed to search private companies',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get fundamental analysis
router.get('/fundamental-analysis/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { countryCode } = req.query;
    logger.info(`GET /fundamental-analysis/${ticker}`);
    const analysis = await getFundamentalAnalysis(ticker, countryCode as string);
    res.json(analysis);
  } catch (error) {
    logger.error('Fundamental analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch fundamental analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get financial statements
router.get('/financials/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { countryCode, periodType = 'quarterly' } = req.query;
    logger.info(`GET /financials/${ticker}`, { countryCode, periodType });
    const statements = await getFinancialStatements(
      ticker,
      countryCode as string,
      periodType as 'quarterly' | 'annual'
    );
    res.json({ ticker, periodType, statements });
  } catch (error) {
    logger.error('Financials error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch financial statements',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as dataRoutes };

