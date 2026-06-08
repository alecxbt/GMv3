import axios from 'axios';
import { logger } from '../utils/logger.js';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour for fundamental data

// API Configuration
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const FINANCIAL_MODELING_PREP_API_KEY = process.env.FINANCIAL_MODELING_PREP_API_KEY;

export interface FundamentalAnalysis {
  ticker: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  description?: string;
  
  // Valuation Ratios
  valuation: {
    peRatio?: number; // Price-to-Earnings
    pegRatio?: number; // Price/Earnings to Growth
    pbRatio?: number; // Price-to-Book
    evToRevenue?: number; // Enterprise Value to Revenue
    evToEbitda?: number; // Enterprise Value to EBITDA
    priceToSales?: number;
    priceToCashFlow?: number;
  };
  
  // Profitability Ratios
  profitability: {
    roe?: number; // Return on Equity
    roa?: number; // Return on Assets
    roic?: number; // Return on Invested Capital
    profitMargin?: number;
    grossMargin?: number;
    operatingMargin?: number;
    ebitdaMargin?: number;
  };
  
  // Debt Ratios
  debt: {
    debtToEquity?: number;
    debtToAssets?: number;
    currentRatio?: number;
    quickRatio?: number;
    interestCoverage?: number;
  };
  
  // Growth Metrics
  growth: {
    revenueGrowth?: number; // Year-over-year
    earningsGrowth?: number; // Year-over-year
    epsGrowth?: number;
    bookValueGrowth?: number;
  };
  
  // Market Metrics
  market: {
    marketCap?: number; // in millions
    enterpriseValue?: number; // in millions
    sharesOutstanding?: number; // in millions
    floatShares?: number; // in millions
    dividendYield?: number;
    payoutRatio?: number;
    beta?: number;
  };
  
  // Analyst Estimates
  analystEstimates?: {
    targetPrice?: number;
    recommendation?: string; // e.g., "Buy", "Hold", "Sell"
    numberOfAnalysts?: number;
    earningsEstimate?: number;
    revenueEstimate?: number;
  };
  
  timestamp: number;
}

/**
 * Get fundamental analysis data using Alpha Vantage and Polygon.io
 */
export async function getFundamentalAnalysis(ticker: string, countryCode?: string): Promise<FundamentalAnalysis> {
  const cacheKey = `fundamental:${ticker}:${countryCode || 'US'}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug(`Fetching fundamental analysis for ${ticker}${countryCode ? ` (${countryCode})` : ''}`);
    
    const result: FundamentalAnalysis = {
      ticker,
      valuation: {},
      profitability: {},
      debt: {},
      growth: {},
      market: {},
      timestamp: Date.now(),
    };

    // Try Alpha Vantage first (OVERVIEW endpoint)
    if (ALPHA_VANTAGE_API_KEY && ALPHA_VANTAGE_API_KEY !== 'demo') {
      try {
        const response = await axios.get('https://www.alphavantage.co/query', {
          params: {
            function: 'OVERVIEW',
            symbol: ticker,
            apikey: ALPHA_VANTAGE_API_KEY,
          },
          timeout: 10000,
        });

        // Check for rate limit or error messages first
        if (response.data?.Note) {
          logger.warn(`Alpha Vantage rate limit note for ${ticker}: ${response.data.Note}`);
          throw new Error('API rate limit reached. Please try again later.');
        }
        if (response.data?.['Error Message']) {
          logger.warn(`Alpha Vantage error for ${ticker}: ${response.data['Error Message']}`);
          throw new Error(response.data['Error Message']);
        }
        
        if (response.data && response.data.Symbol) {
          const data = response.data;
          
          logger.debug(`Alpha Vantage OVERVIEW response for ${ticker}:`, {
            hasName: !!data.Name,
            hasSector: !!data.Sector,
            hasPERatio: !!data.PERatio,
            PERatioValue: data.PERatio,
            ReturnOnEquityTTM: data.ReturnOnEquityTTM,
            MarketCap: data.MarketCapitalization,
            Symbol: data.Symbol,
          });
          
          // Company Info - Always assign if present
          result.companyName = data.Name || result.companyName;
          result.sector = data.Sector || result.sector;
          result.industry = data.Industry || result.industry;
          result.description = data.Description || result.description;
          
          // Valuation Ratios
          if (data.PERatio && data.PERatio !== 'None' && data.PERatio !== '') {
            const pe = parseFloat(data.PERatio);
            if (!isNaN(pe)) result.valuation.peRatio = pe;
          }
          if (data.PEGRatio && data.PEGRatio !== 'None' && data.PEGRatio !== '') {
            const peg = parseFloat(data.PEGRatio);
            if (!isNaN(peg)) result.valuation.pegRatio = peg;
          }
          if (data.PriceToBookRatio && data.PriceToBookRatio !== 'None' && data.PriceToBookRatio !== '') {
            const pb = parseFloat(data.PriceToBookRatio);
            if (!isNaN(pb)) result.valuation.pbRatio = pb;
          }
          if (data.EVToRevenue && data.EVToRevenue !== 'None' && data.EVToRevenue !== '') {
            const evRev = parseFloat(data.EVToRevenue);
            if (!isNaN(evRev)) result.valuation.evToRevenue = evRev;
          }
          if (data.EVToEBITDA && data.EVToEBITDA !== 'None' && data.EVToEBITDA !== '') {
            const evEbitda = parseFloat(data.EVToEBITDA);
            if (!isNaN(evEbitda)) result.valuation.evToEbitda = evEbitda;
          }
          if (data.PriceToSalesRatioTTM && data.PriceToSalesRatioTTM !== 'None' && data.PriceToSalesRatioTTM !== '') {
            const ps = parseFloat(data.PriceToSalesRatioTTM);
            if (!isNaN(ps)) result.valuation.priceToSales = ps;
          }
          
          // Profitability Ratios
          // Note: Alpha Vantage returns ROE/ROA as ratios (e.g., 1.714 = 171.4%), so multiply by 100
          if (data.ReturnOnEquityTTM && data.ReturnOnEquityTTM !== 'None' && data.ReturnOnEquityTTM !== '') {
            const roe = parseFloat(data.ReturnOnEquityTTM);
            if (!isNaN(roe)) result.profitability.roe = roe * 100; // Convert ratio to percentage
          }
          if (data.ReturnOnAssetsTTM && data.ReturnOnAssetsTTM !== 'None' && data.ReturnOnAssetsTTM !== '') {
            const roa = parseFloat(data.ReturnOnAssetsTTM);
            if (!isNaN(roa)) result.profitability.roa = roa * 100; // Convert ratio to percentage
          }
          if (data.ProfitMargin && data.ProfitMargin !== 'None' && data.ProfitMargin !== '') {
            const margin = parseFloat(data.ProfitMargin);
            if (!isNaN(margin)) result.profitability.profitMargin = margin * 100; // Convert decimal to percentage
          }
          if (data.GrossProfitTTM && data.GrossProfitTTM !== 'None' && data.RevenueTTM && data.RevenueTTM !== 'None') {
            const grossProfit = parseFloat(data.GrossProfitTTM);
            const revenue = parseFloat(data.RevenueTTM);
            if (revenue > 0) {
              result.profitability.grossMargin = (grossProfit / revenue) * 100;
            }
          }
          if (data.OperatingMarginTTM && data.OperatingMarginTTM !== 'None' && data.OperatingMarginTTM !== '') {
            const margin = parseFloat(data.OperatingMarginTTM);
            if (!isNaN(margin)) result.profitability.operatingMargin = margin * 100; // Convert to percentage
          }
          
          // Debt Ratios
          if (data.DebtToEquity && data.DebtToEquity !== 'None' && data.DebtToEquity !== '') {
            const dte = parseFloat(data.DebtToEquity);
            if (!isNaN(dte)) result.debt.debtToEquity = dte;
          }
          if (data.CurrentRatio && data.CurrentRatio !== 'None' && data.CurrentRatio !== '') {
            const cr = parseFloat(data.CurrentRatio);
            if (!isNaN(cr)) result.debt.currentRatio = cr;
          }
          
          // Market Metrics
          if (data.MarketCapitalization && data.MarketCapitalization !== 'None' && data.MarketCapitalization !== '') {
            const mcap = parseFloat(data.MarketCapitalization);
            if (!isNaN(mcap)) result.market.marketCap = mcap / 1_000_000; // Convert to millions
          }
          if (data.EnterpriseValue && data.EnterpriseValue !== 'None' && data.EnterpriseValue !== '') {
            const ev = parseFloat(data.EnterpriseValue);
            if (!isNaN(ev)) result.market.enterpriseValue = ev / 1_000_000; // Convert to millions
          }
          if (data.SharesOutstanding && data.SharesOutstanding !== 'None' && data.SharesOutstanding !== '') {
            const shares = parseFloat(data.SharesOutstanding);
            if (!isNaN(shares)) result.market.sharesOutstanding = shares / 1_000_000; // Convert to millions
          }
          if (data.DividendYield && data.DividendYield !== 'None' && data.DividendYield !== '') {
            const divYield = parseFloat(data.DividendYield);
            if (!isNaN(divYield)) result.market.dividendYield = divYield * 100; // Convert decimal to percentage
          }
          if (data.PayoutRatio && data.PayoutRatio !== 'None' && data.PayoutRatio !== '') {
            const payout = parseFloat(data.PayoutRatio);
            if (!isNaN(payout)) result.market.payoutRatio = payout * 100; // Convert decimal to percentage
          }
          if (data.Beta && data.Beta !== 'None' && data.Beta !== '') {
            const beta = parseFloat(data.Beta);
            if (!isNaN(beta)) result.market.beta = beta;
          }
          
          // Analyst Estimates
          if (data.AnalystTargetPrice && data.AnalystTargetPrice !== 'None' && data.AnalystTargetPrice !== '') {
            const targetPrice = parseFloat(data.AnalystTargetPrice);
            if (!isNaN(targetPrice)) {
              result.analystEstimates = {
                targetPrice,
                recommendation: data.AnalystRecommendation || undefined,
              };
            }
          }
          
          // Always return the result - even if some fields are missing, we may have partial data
          logger.debug(`Fundamental analysis fetched from Alpha Vantage for ${ticker}`, {
            hasCompanyName: !!result.companyName,
            hasSector: !!result.sector,
            valuationCount: Object.values(result.valuation).filter(v => v !== undefined).length,
            profitabilityCount: Object.values(result.profitability).filter(v => v !== undefined).length,
          });
          cache.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        }
      } catch (avError: any) {
        logger.warn(`Alpha Vantage fundamental analysis error for ${ticker}, trying Polygon.io:`, avError.message);
      }
    }

    // Try Polygon.io
    if (POLYGON_API_KEY) {
      try {
        // Get company details
        const companyResponse = await axios.get(
          `https://api.polygon.io/v2/reference/company/${ticker}`,
          {
            params: {
              apiKey: POLYGON_API_KEY,
            },
            timeout: 10000,
          }
        );

        if (companyResponse.data?.results) {
          const company = companyResponse.data.results;
          
          result.companyName = company.name;
          result.sector = company.sic_description || company.industry;
          result.description = company.description;
          
          // Get financials for ratios
          const financialsResponse = await axios.get(
            `https://api.polygon.io/v2/reference/financials`,
            {
              params: {
                ticker: ticker,
                apiKey: POLYGON_API_KEY,
                limit: 1,
              },
              timeout: 10000,
            }
          );

          if (financialsResponse.data?.results && financialsResponse.data.results.length > 0) {
            const financials = financialsResponse.data.results[0];
            
            // Extract ratios if available
            if (financials.financials) {
              const fin = financials.financials;
              
              // Calculate ratios from financials if we have the data
              // Note: Polygon.io basic plan may have limited financials data
            }
          }
          
          logger.debug(`Fundamental analysis fetched from Polygon.io for ${ticker}`);
          cache.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        }
      } catch (polyError: any) {
        logger.warn(`Polygon.io fundamental analysis error for ${ticker}, trying Yahoo Finance:`, polyError.message);
      }
    }

    // Try Financial Modeling Prep (comprehensive fundamental data)
    if (FINANCIAL_MODELING_PREP_API_KEY) {
      try {
        // Get key metrics
        const metricsResponse = await axios.get(
          `https://financialmodelingprep.com/api/v3/key-metrics/${ticker}`,
          {
            params: {
              apikey: FINANCIAL_MODELING_PREP_API_KEY,
              limit: 1,
            },
            timeout: 10000,
          }
        );

        if (metricsResponse.data && Array.isArray(metricsResponse.data) && metricsResponse.data.length > 0) {
          const metrics = metricsResponse.data[0];
          
          // Valuation Ratios
          if (metrics.peRatio) result.valuation.peRatio = metrics.peRatio;
          if (metrics.pegRatio) result.valuation.pegRatio = metrics.pegRatio;
          if (metrics.pbRatio) result.valuation.pbRatio = metrics.pbRatio;
          if (metrics.evToRevenue) result.valuation.evToRevenue = metrics.evToRevenue;
          if (metrics.evToEbitda) result.valuation.evToEbitda = metrics.evToEbitda;
          if (metrics.priceToSalesRatio) result.valuation.priceToSales = metrics.priceToSalesRatio;
          if (metrics.pocfratio) result.valuation.priceToCashFlow = metrics.pocfratio;
          
          // Profitability Ratios
          if (metrics.roe) result.profitability.roe = metrics.roe * 100; // Convert to percentage
          if (metrics.roa) result.profitability.roa = metrics.roa * 100; // Convert to percentage
          if (metrics.roic) result.profitability.roic = metrics.roic * 100; // Convert to percentage
          if (metrics.netProfitMargin) result.profitability.profitMargin = metrics.netProfitMargin * 100; // Convert to percentage
          if (metrics.grossProfitMargin) result.profitability.grossMargin = metrics.grossProfitMargin * 100; // Convert to percentage
          if (metrics.operatingProfitMargin) result.profitability.operatingMargin = metrics.operatingProfitMargin * 100; // Convert to percentage
          
          // Debt Ratios
          if (metrics.debtToEquity) result.debt.debtToEquity = metrics.debtToEquity;
          if (metrics.debtToAssets) result.debt.debtToAssets = metrics.debtToAssets;
          if (metrics.currentRatio) result.debt.currentRatio = metrics.currentRatio;
          if (metrics.quickRatio) result.debt.quickRatio = metrics.quickRatio;
          if (metrics.interestCoverage) result.debt.interestCoverage = metrics.interestCoverage;
          
          // Market Metrics
          if (metrics.marketCap) result.market.marketCap = metrics.marketCap / 1_000_000; // Convert to millions
          if (metrics.enterpriseValue) result.market.enterpriseValue = metrics.enterpriseValue / 1_000_000; // Convert to millions
          if (metrics.sharesOutstanding) result.market.sharesOutstanding = metrics.sharesOutstanding / 1_000_000; // Convert to millions
        }

        // Get company profile
        const profileResponse = await axios.get(
          `https://financialmodelingprep.com/api/v3/profile/${ticker}`,
          {
            params: {
              apikey: FINANCIAL_MODELING_PREP_API_KEY,
            },
            timeout: 10000,
          }
        );

        if (profileResponse.data && Array.isArray(profileResponse.data) && profileResponse.data.length > 0) {
          const profile = profileResponse.data[0];
          
          if (!result.companyName) result.companyName = profile.companyName;
          if (!result.sector) result.sector = profile.sector;
          if (!result.industry) result.industry = profile.industry;
          if (!result.description) result.description = profile.description;
          
          if (profile.beta) result.market.beta = profile.beta;
          if (profile.mktCap) result.market.marketCap = profile.mktCap / 1_000_000; // Convert to millions
          if (profile.lastDiv) result.market.dividendYield = profile.lastDiv; // May need adjustment
        }

        // Get ratios for additional metrics
        const ratiosResponse = await axios.get(
          `https://financialmodelingprep.com/api/v3/ratios/${ticker}`,
          {
            params: {
              apikey: FINANCIAL_MODELING_PREP_API_KEY,
              limit: 1,
            },
            timeout: 10000,
          }
        );

        if (ratiosResponse.data && Array.isArray(ratiosResponse.data) && ratiosResponse.data.length > 0) {
          const ratios = ratiosResponse.data[0];
          
          // Fill in any missing ratios
          if (!result.valuation.peRatio && ratios.priceEarningsRatio) {
            result.valuation.peRatio = ratios.priceEarningsRatio;
          }
          if (!result.profitability.roe && ratios.returnOnEquity) {
            result.profitability.roe = ratios.returnOnEquity * 100;
          }
          if (!result.profitability.roa && ratios.returnOnAssets) {
            result.profitability.roa = ratios.returnOnAssets * 100;
          }
        }

        // Get analyst estimates
        const estimatesResponse = await axios.get(
          `https://financialmodelingprep.com/api/v3/analyst-estimates/${ticker}`,
          {
            params: {
              apikey: FINANCIAL_MODELING_PREP_API_KEY,
              limit: 1,
            },
            timeout: 10000,
          }
        );

        if (estimatesResponse.data && Array.isArray(estimatesResponse.data) && estimatesResponse.data.length > 0) {
          const estimates = estimatesResponse.data[0];
          
          result.analystEstimates = {
            earningsEstimate: estimates.estimatedEarningAvg,
            revenueEstimate: estimates.estimatedRevenueAvg,
            numberOfAnalysts: estimates.numberOfAnalysts,
          };
        }

        logger.debug(`Fundamental analysis fetched from Financial Modeling Prep for ${ticker}`);
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      } catch (fmpError: any) {
        logger.warn(`Financial Modeling Prep fundamental analysis error for ${ticker}, trying Yahoo Finance:`, fmpError.message);
      }
    }

    // Fallback to Yahoo Finance (limited fundamental data)
    try {
      const yahooResponse = await axios.get(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}`,
        {
          params: {
            modules: 'summaryProfile,defaultKeyStatistics,financialData,recommendationTrend',
          },
          timeout: 10000,
        }
      );

      if (yahooResponse.data?.quoteSummary?.result?.[0]) {
        const summary = yahooResponse.data.quoteSummary.result[0];
        
        // Company Info
        if (summary.summaryProfile) {
          result.companyName = summary.summaryProfile.longName;
          result.sector = summary.summaryProfile.sector;
          result.industry = summary.summaryProfile.industry;
          result.description = summary.summaryProfile.longBusinessSummary;
        }
        
        // Key Statistics
        if (summary.defaultKeyStatistics) {
          const stats = summary.defaultKeyStatistics;
          
          if (stats.trailingPE?.raw) {
            result.valuation.peRatio = stats.trailingPE.raw;
          }
          if (stats.priceToBook?.raw) {
            result.valuation.pbRatio = stats.priceToBook.raw;
          }
          if (stats.enterpriseToRevenue?.raw) {
            result.valuation.evToRevenue = stats.enterpriseToRevenue.raw;
          }
          if (stats.enterpriseToEbitda?.raw) {
            result.valuation.evToEbitda = stats.enterpriseToEbitda.raw;
          }
          if (stats.marketCap?.raw) {
            result.market.marketCap = stats.marketCap.raw / 1_000_000; // Convert to millions
          }
          if (stats.sharesOutstanding?.raw) {
            result.market.sharesOutstanding = stats.sharesOutstanding.raw / 1_000_000; // Convert to millions
          }
          if (stats.beta?.raw) {
            result.market.beta = stats.beta.raw;
          }
          if (stats.dividendYield?.raw) {
            result.market.dividendYield = stats.dividendYield.raw * 100; // Convert to percentage
          }
        }
        
        // Financial Data
        if (summary.financialData) {
          const finData = summary.financialData;
          
          if (finData.returnOnEquity?.raw) {
            result.profitability.roe = finData.returnOnEquity.raw * 100; // Convert to percentage
          }
          if (finData.returnOnAssets?.raw) {
            result.profitability.roa = finData.returnOnAssets.raw * 100; // Convert to percentage
          }
          if (finData.profitMargins?.raw) {
            result.profitability.profitMargin = finData.profitMargins.raw * 100; // Convert to percentage
          }
          if (finData.grossMargins?.raw) {
            result.profitability.grossMargin = finData.grossMargins.raw * 100; // Convert to percentage
          }
          if (finData.operatingMargins?.raw) {
            result.profitability.operatingMargin = finData.operatingMargins.raw * 100; // Convert to percentage
          }
          if (finData.debtToEquity?.raw) {
            result.debt.debtToEquity = finData.debtToEquity.raw;
          }
          if (finData.currentRatio?.raw) {
            result.debt.currentRatio = finData.currentRatio.raw;
          }
        }
        
        // Analyst Recommendations
        if (summary.recommendationTrend) {
          const rec = summary.recommendationTrend;
          if (rec.trend?.[0]) {
            const trend = rec.trend[0];
            result.analystEstimates = {
              recommendation: trend.strongBuy > 0 ? 'Strong Buy' : 
                            trend.buy > 0 ? 'Buy' :
                            trend.hold > 0 ? 'Hold' :
                            trend.sell > 0 ? 'Sell' : 'Strong Sell',
              numberOfAnalysts: (trend.strongBuy || 0) + (trend.buy || 0) + (trend.hold || 0) + (trend.sell || 0) + (trend.strongSell || 0),
            };
          }
        }
        
        logger.debug(`Fundamental analysis fetched from Yahoo Finance for ${ticker}`);
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (yahooError: any) {
      logger.warn(`Yahoo Finance fundamental analysis error for ${ticker}:`, yahooError.message);
    }

    // Return basic result if no data found
    logger.warn(`No fundamental analysis data available for ${ticker} from any source`);
    
    // Check if we got any data at all
    const hasAnyData = 
      result.companyName ||
      result.sector ||
      result.industry ||
      Object.values(result.valuation).some(v => v !== undefined) ||
      Object.values(result.profitability).some(v => v !== undefined) ||
      Object.values(result.debt).some(v => v !== undefined) ||
      Object.values(result.market).some(v => v !== undefined) ||
      result.analystEstimates;
    
    if (!hasAnyData) {
      logger.error(`No fundamental analysis data found for ${ticker} from any API source`);
    }
    
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    logger.error(`Error fetching fundamental analysis for ${ticker}:`, error);
    throw error instanceof Error ? error : new Error(`Failed to fetch fundamental analysis for ${ticker}`);
  }
}

