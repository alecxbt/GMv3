import axios from 'axios';
import { logger } from '../utils/logger.js';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes for filings
const TICKER_CIK_CACHE_TTL = 86400000; // 24 hours for ticker->CIK mapping

// Cache for ticker to CIK mapping
let tickerCikMap: Map<string, string> | null = null;
let tickerCikMapTimestamp = 0;

/**
 * Get ticker to CIK mapping from SEC
 */
async function getTickerCikMap(): Promise<Map<string, string>> {
  // Return cached map if still valid
  if (tickerCikMap && Date.now() - tickerCikMapTimestamp < TICKER_CIK_CACHE_TTL) {
    return tickerCikMap;
  }

  try {
    logger.debug('Fetching ticker to CIK mapping from SEC');
    const response = await axios.get(
      'https://www.sec.gov/files/company_tickers.json',
      {
        headers: {
          'User-Agent': 'GM Terminal (contact@example.com)', // SEC requires User-Agent
          'Accept': 'application/json',
        },
        timeout: 15000,
      }
    );

    const map = new Map<string, string>();
    if (response.data) {
      // SEC returns object with numeric keys, each value has ticker and cik_str
      Object.values(response.data).forEach((company: any) => {
        if (company.ticker && company.cik_str) {
          const ticker = company.ticker.toUpperCase();
          const cik = company.cik_str.toString().padStart(10, '0');
          map.set(ticker, cik);
        }
      });
    }

    tickerCikMap = map;
    tickerCikMapTimestamp = Date.now();
    logger.debug(`Loaded ${map.size} ticker to CIK mappings`);
    return map;
  } catch (error) {
    logger.error('Error fetching ticker to CIK mapping:', error);
    // Return empty map if fetch fails
    return new Map<string, string>();
  }
}

/**
 * Convert ticker to CIK
 */
async function tickerToCIK(ticker: string): Promise<string | null> {
  const map = await getTickerCikMap();
  const cik = map.get(ticker.toUpperCase());
  return cik || null;
}

/**
 * Get SEC EDGAR filings for a ticker
 */
export async function getFilings(ticker: string, limit: number = 20): Promise<any[]> {
  const cacheKey = `filings:${ticker}:${limit}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug(`Fetching EDGAR filings for ${ticker}`);
    
    // Convert ticker to CIK
    const cik = await tickerToCIK(ticker);
    if (!cik) {
      throw new Error(`Ticker ${ticker} not found in SEC database`);
    }

    logger.debug(`Found CIK ${cik} for ticker ${ticker}`);

    // Get filings using CIK
    const response = await axios.get(
      `https://data.sec.gov/submissions/CIK${cik}.json`,
      {
        headers: {
          'User-Agent': 'GM Terminal (contact@example.com)',
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data?.filings?.recent) {
      const filings = response.data.filings.recent;
      const forms = filings.form || [];
      const dates = filings.filingDate || [];
      const descriptions = filings.description || [];
      const accessionNumbers = filings.accessionNumber || [];

      const result = [];
      for (let i = 0; i < Math.min(forms.length, limit); i++) {
        if (forms[i] && dates[i] && accessionNumbers[i]) {
          const accessionNumber = accessionNumbers[i];
          // Build proper EDGAR URL
          const accessionNoDashes = accessionNumber.replace(/-/g, '');
          const url = `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${accessionNumber}&xbrl_type=v`;
          
          result.push({
            id: `filing-${i}`,
            form: forms[i],
            date: dates[i],
            description: descriptions[i] || forms[i],
            url,
            ticker,
            accessionNumber,
          });
        }
      }

      if (result.length > 0) {
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        logger.debug(`Fetched ${result.length} filings for ${ticker}`);
        return result;
      }
    }

    throw new Error(`No filings found for ${ticker}`);
  } catch (error: any) {
    logger.error(`Error fetching filings for ${ticker}:`, {
      message: error.message,
      status: error.response?.status,
    });
    
    // Don't return mock data - throw error instead
    throw new Error(`Failed to fetch filings for ${ticker}: ${error.message}`);
  }
}

