import axios from 'axios';
import { logger } from '../utils/logger.js';

// Free API endpoints
const SEC_EDGAR_API = 'https://data.sec.gov';
const FINNHUB_API = 'https://finnhub.io/api/v1';
const FMP_API = 'https://financialmodelingprep.com/api/v3';
const ALPHA_VANTAGE_API = 'https://www.alphavantage.co/query';

// Cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 600000; // 10 minutes for fundamental data

export interface FinancialStatement {
  date: string;
  period: string;
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  eps?: number;
  ebitda?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  cashAndEquivalents?: number;
  totalDebt?: number;
  freeCashFlow?: number;
  operatingCashFlow?: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  employees?: number;
  description?: string;
  ceo?: string;
  website?: string;
  exchange?: string;
  country?: string;
  ipoDate?: string;
}

export interface InsiderTrade {
  symbol: string;
  filingDate: string;
  transactionDate: string;
  reportingName: string;
  reportingTitle?: string;
  transactionType: 'buy' | 'sell' | 'grant' | 'exercise';
  shares: number;
  pricePerShare?: number;
  totalValue?: number;
  sharesOwned?: number;
}

export interface InstitutionalHolding {
  institutionName: string;
  shares: number;
  value: number;
  percentOwnership: number;
  change?: number;
  changePercent?: number;
  filingDate: string;
}

export interface Form13F {
  institutionName: string;
  cik: string;
  filingDate: string;
  holdings: {
    symbol: string;
    name: string;
    shares: number;
    value: number;
    percentOfPortfolio: number;
    change?: number;
  }[];
  totalValue: number;
}

export interface AnalystRating {
  symbol: string;
  date: string;
  firm: string;
  analyst?: string;
  rating: string;
  priceTarget?: number;
  previousRating?: string;
  previousPriceTarget?: number;
}

export interface EarningsEstimate {
  symbol: string;
  date: string;
  quarter: string;
  epsEstimate: number;
  revenueEstimate: number;
  numAnalysts: number;
  epsActual?: number;
  revenueActual?: number;
  surprise?: number;
  surprisePercent?: number;
}

/**
 * Get company profile
 */
export async function getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  const cacheKey = `fundamental:profile:${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 6) { // 1 hour cache for profiles
    return cached.data;
  }

  try {
    logger.info(`Fetching company profile for ${symbol}`);

    // Try Finnhub
    try {
      const response = await axios.get(
        `${FINNHUB_API}/stock/profile2`,
        {
          params: { symbol },
          timeout: 10000,
        }
      );

      if (response.data && response.data.name) {
        const profile: CompanyProfile = {
          symbol: response.data.ticker || symbol,
          name: response.data.name,
          sector: response.data.finnhubIndustry,
          industry: response.data.finnhubIndustry,
          marketCap: response.data.marketCapitalization ? response.data.marketCapitalization * 1000000 : undefined,
          employees: response.data.employeeTotal,
          website: response.data.weburl,
          exchange: response.data.exchange,
          country: response.data.country,
          ipoDate: response.data.ipo,
        };

        cache.set(cacheKey, { data: profile, timestamp: Date.now() });
        return profile;
      }
    } catch (e: any) {
      logger.debug('Finnhub profile failed:', e.message);
    }

    // Fallback
    return {
      symbol,
      name: symbol,
    };
  } catch (error: any) {
    logger.error(`Error fetching profile for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Get financial statements
 */
export async function getFinancials(symbol: string): Promise<{
  income: FinancialStatement[];
  balance: FinancialStatement[];
  cashflow: FinancialStatement[];
}> {
  const cacheKey = `fundamental:financials:${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 6) {
    return cached.data;
  }

  try {
    logger.info(`Fetching financials for ${symbol}`);
    
    const result = {
      income: [] as FinancialStatement[],
      balance: [] as FinancialStatement[],
      cashflow: [] as FinancialStatement[],
    };

    // Try Finnhub financials
    try {
      const [incomeResp, balanceResp, cashflowResp] = await Promise.all([
        axios.get(`${FINNHUB_API}/stock/financials-reported`, {
          params: { symbol, freq: 'quarterly' },
          timeout: 10000,
        }).catch(() => null),
        axios.get(`${FINNHUB_API}/stock/financials-reported`, {
          params: { symbol, freq: 'quarterly' },
          timeout: 10000,
        }).catch(() => null),
        axios.get(`${FINNHUB_API}/stock/financials-reported`, {
          params: { symbol, freq: 'quarterly' },
          timeout: 10000,
        }).catch(() => null),
      ]);

      // Parse Finnhub response (simplified)
      if (incomeResp?.data?.data) {
        for (const report of incomeResp.data.data.slice(0, 8)) {
          result.income.push({
            date: report.endDate || report.filedDate,
            period: report.quarter ? `Q${report.quarter}` : 'Annual',
            revenue: report.report?.ic?.find((i: any) => i.concept === 'us-gaap_Revenues')?.value,
            netIncome: report.report?.ic?.find((i: any) => i.concept === 'us-gaap_NetIncomeLoss')?.value,
          });
        }
      }
    } catch (e: any) {
      logger.debug('Finnhub financials failed:', e.message);
    }

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error: any) {
    logger.error(`Error fetching financials for ${symbol}:`, error.message);
    return { income: [], balance: [], cashflow: [] };
  }
}

/**
 * Get insider trades from SEC
 */
export async function getInsiderTrades(symbol: string, limit: number = 50): Promise<InsiderTrade[]> {
  const cacheKey = `fundamental:insider:${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info(`Fetching insider trades for ${symbol}`);
    const trades: InsiderTrade[] = [];

    // Try Finnhub insider transactions
    try {
      const response = await axios.get(
        `${FINNHUB_API}/stock/insider-transactions`,
        {
          params: { symbol },
          timeout: 10000,
        }
      );

      if (response.data?.data) {
        for (const tx of response.data.data.slice(0, limit)) {
          let transactionType: InsiderTrade['transactionType'] = 'buy';
          if (tx.transactionCode === 'S' || tx.transactionCode === 'F') {
            transactionType = 'sell';
          } else if (tx.transactionCode === 'G' || tx.transactionCode === 'A') {
            transactionType = 'grant';
          } else if (tx.transactionCode === 'M') {
            transactionType = 'exercise';
          }

          trades.push({
            symbol,
            filingDate: tx.filingDate,
            transactionDate: tx.transactionDate,
            reportingName: tx.name,
            transactionType,
            shares: Math.abs(tx.share || 0),
            pricePerShare: tx.transactionPrice,
            totalValue: tx.transactionPrice && tx.share ? Math.abs(tx.transactionPrice * tx.share) : undefined,
            sharesOwned: tx.shareOwned,
          });
        }
      }
    } catch (e: any) {
      logger.debug('Finnhub insider trades failed:', e.message);
    }

    // Sort by filing date descending
    trades.sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime());

    cache.set(cacheKey, { data: trades, timestamp: Date.now() });
    return trades;
  } catch (error: any) {
    logger.error(`Error fetching insider trades for ${symbol}:`, error.message);
    return [];
  }
}

/**
 * Get institutional holders
 */
export async function getInstitutionalHolders(symbol: string): Promise<InstitutionalHolding[]> {
  const cacheKey = `fundamental:institutional:${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 6) {
    return cached.data;
  }

  try {
    logger.info(`Fetching institutional holders for ${symbol}`);
    const holdings: InstitutionalHolding[] = [];

    // Try Finnhub institutional ownership
    try {
      const response = await axios.get(
        `${FINNHUB_API}/stock/ownership`,
        {
          params: { symbol },
          timeout: 10000,
        }
      );

      if (response.data?.ownership) {
        for (const holder of response.data.ownership.slice(0, 20)) {
          holdings.push({
            institutionName: holder.name,
            shares: holder.share || 0,
            value: holder.value || 0,
            percentOwnership: holder.percent || 0,
            change: holder.change,
            filingDate: holder.filingDate,
          });
        }
      }
    } catch (e: any) {
      logger.debug('Finnhub institutional failed:', e.message);
    }

    cache.set(cacheKey, { data: holdings, timestamp: Date.now() });
    return holdings;
  } catch (error: any) {
    logger.error(`Error fetching institutional holders for ${symbol}:`, error.message);
    return [];
  }
}

/**
 * Get analyst ratings
 */
export async function getAnalystRatings(symbol: string): Promise<AnalystRating[]> {
  const cacheKey = `fundamental:analyst:${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info(`Fetching analyst ratings for ${symbol}`);
    const ratings: AnalystRating[] = [];

    // Try Finnhub recommendations
    try {
      const response = await axios.get(
        `${FINNHUB_API}/stock/recommendation`,
        {
          params: { symbol },
          timeout: 10000,
        }
      );

      if (Array.isArray(response.data)) {
        for (const rec of response.data.slice(0, 10)) {
          // Convert Finnhub format to our format
          const consensus = (rec.strongBuy * 5 + rec.buy * 4 + rec.hold * 3 + rec.sell * 2 + rec.strongSell * 1) /
            (rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell || 1);
          
          let rating = 'Hold';
          if (consensus >= 4) rating = 'Strong Buy';
          else if (consensus >= 3.5) rating = 'Buy';
          else if (consensus >= 2.5) rating = 'Hold';
          else if (consensus >= 1.5) rating = 'Sell';
          else rating = 'Strong Sell';

          ratings.push({
            symbol,
            date: rec.period,
            firm: 'Consensus',
            rating,
          });
        }
      }
    } catch (e: any) {
      logger.debug('Finnhub recommendations failed:', e.message);
    }

    // Try Finnhub price targets
    try {
      const ptResponse = await axios.get(
        `${FINNHUB_API}/stock/price-target`,
        {
          params: { symbol },
          timeout: 10000,
        }
      );

      if (ptResponse.data?.targetMean) {
        ratings.unshift({
          symbol,
          date: new Date().toISOString().split('T')[0],
          firm: 'Analyst Consensus',
          rating: 'Price Target',
          priceTarget: ptResponse.data.targetMean,
        });
      }
    } catch (e: any) {
      logger.debug('Finnhub price target failed:', e.message);
    }

    cache.set(cacheKey, { data: ratings, timestamp: Date.now() });
    return ratings;
  } catch (error: any) {
    logger.error(`Error fetching analyst ratings for ${symbol}:`, error.message);
    return [];
  }
}

/**
 * Get earnings estimates
 */
export async function getEarningsEstimates(symbol: string): Promise<EarningsEstimate[]> {
  const cacheKey = `fundamental:estimates:${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info(`Fetching earnings estimates for ${symbol}`);
    const estimates: EarningsEstimate[] = [];

    // Try Finnhub earnings
    try {
      const response = await axios.get(
        `${FINNHUB_API}/stock/earnings`,
        {
          params: { symbol },
          timeout: 10000,
        }
      );

      if (Array.isArray(response.data)) {
        for (const earning of response.data.slice(0, 8)) {
          estimates.push({
            symbol,
            date: earning.period,
            quarter: `Q${earning.quarter}`,
            epsEstimate: earning.estimate || 0,
            revenueEstimate: 0, // Finnhub doesn't provide revenue estimate
            numAnalysts: 0,
            epsActual: earning.actual,
            surprise: earning.surprise,
            surprisePercent: earning.surprisePercent,
          });
        }
      }
    } catch (e: any) {
      logger.debug('Finnhub earnings failed:', e.message);
    }

    cache.set(cacheKey, { data: estimates, timestamp: Date.now() });
    return estimates;
  } catch (error: any) {
    logger.error(`Error fetching earnings estimates for ${symbol}:`, error.message);
    return [];
  }
}

/**
 * Get short interest data
 */
export async function getShortInterest(symbol: string): Promise<{
  shortInterest: number;
  shortInterestRatio: number;
  shortPercentOfFloat: number;
  daysTocover: number;
  date: string;
} | null> {
  const cacheKey = `fundamental:short:${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 6) {
    return cached.data;
  }

  try {
    logger.info(`Fetching short interest for ${symbol}`);

    // Try Finnhub
    try {
      const response = await axios.get(
        `${FINNHUB_API}/stock/short-interest`,
        {
          params: { symbol },
          timeout: 10000,
        }
      );

      if (response.data?.data?.[0]) {
        const latest = response.data.data[0];
        const result = {
          shortInterest: latest.shortInterest || 0,
          shortInterestRatio: latest.shortInterestRatio || 0,
          shortPercentOfFloat: latest.shortPercentOfFloat || 0,
          daysTocover: latest.daysToCover || 0,
          date: latest.settlementDate,
        };

        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (e: any) {
      logger.debug('Finnhub short interest failed:', e.message);
    }

    return null;
  } catch (error: any) {
    logger.error(`Error fetching short interest for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Get key metrics/ratios
 */
export async function getKeyMetrics(symbol: string): Promise<{
  peRatio?: number;
  pbRatio?: number;
  psRatio?: number;
  pegRatio?: number;
  evToEbitda?: number;
  debtToEquity?: number;
  currentRatio?: number;
  roe?: number;
  roa?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  dividendYield?: number;
} | null> {
  const cacheKey = `fundamental:metrics:${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info(`Fetching key metrics for ${symbol}`);

    // Try Finnhub basic financials
    try {
      const response = await axios.get(
        `${FINNHUB_API}/stock/metric`,
        {
          params: { symbol, metric: 'all' },
          timeout: 10000,
        }
      );

      if (response.data?.metric) {
        const m = response.data.metric;
        const result = {
          peRatio: m.peBasicExclExtraTTM,
          pbRatio: m.pbQuarterly,
          psRatio: m.psTTM,
          pegRatio: m.pegRatio,
          evToEbitda: m.currentEv ? m.currentEv / (m.ebitdaTTM || 1) : undefined,
          debtToEquity: m.totalDebt ? m.totalDebt / (m.totalEquity || 1) : undefined,
          currentRatio: m.currentRatioQuarterly,
          roe: m.roeTTM,
          roa: m.roaTTM,
          revenueGrowth: m.revenueGrowthTTMYoy,
          earningsGrowth: m.epsGrowthTTMYoy,
          dividendYield: m.dividendYieldIndicatedAnnual,
        };

        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (e: any) {
      logger.debug('Finnhub metrics failed:', e.message);
    }

    return null;
  } catch (error: any) {
    logger.error(`Error fetching key metrics for ${symbol}:`, error.message);
    return null;
  }
}

