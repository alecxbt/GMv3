import axios from 'axios';
import { logger } from '../utils/logger.js';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour for financial statements

// API Configuration
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const NASDAQ_DATA_LINK_API_KEY = process.env.NASDAQ_DATA_LINK_API_KEY;

export interface FinancialStatement {
  period: string; // e.g., "2023-09-30" or "2023-Q3"
  periodType: 'quarterly' | 'annual';
  incomeStatement?: IncomeStatement;
  balanceSheet?: BalanceSheet;
  cashFlow?: CashFlow;
}

export interface IncomeStatement {
  revenue: number; // in millions
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  interestExpense: number;
  incomeBeforeTax: number;
  incomeTaxExpense: number;
  netIncome: number;
  eps: number;
  sharesOutstanding: number; // in millions
}

export interface BalanceSheet {
  cashAndCashEquivalents: number; // in millions
  shortTermInvestments: number;
  accountsReceivable: number;
  inventory: number;
  currentAssets: number;
  propertyPlantEquipment: number;
  longTermInvestments: number;
  totalAssets: number;
  accountsPayable: number;
  shortTermDebt: number;
  currentLiabilities: number;
  longTermDebt: number;
  totalLiabilities: number;
  commonStock: number;
  retainedEarnings: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
}

export interface CashFlow {
  netIncome: number; // in millions
  depreciation: number;
  changesInWorkingCapital: number;
  operatingCashFlow: number;
  capitalExpenditures: number;
  investments: number;
  investingCashFlow: number;
  debtIssuance: number;
  dividendsPaid: number;
  financingCashFlow: number;
  freeCashFlow: number;
  netChangeInCash: number;
}

/**
 * Get financial statements for a company
 */
export async function getFinancialStatements(
  ticker: string,
  countryCode?: string,
  periodType: 'quarterly' | 'annual' = 'quarterly'
): Promise<FinancialStatement[]> {
  const cacheKey = `financials:${ticker}:${countryCode || 'US'}:${periodType}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.debug(`Fetching financial statements for ${ticker}${countryCode ? ` (${countryCode})` : ''}, period: ${periodType}`);

    // Try Alpha Vantage first
    if (ALPHA_VANTAGE_API_KEY && ALPHA_VANTAGE_API_KEY !== 'demo') {
      try {
        const functionName = periodType === 'quarterly' ? 'INCOME_STATEMENT' : 'INCOME_STATEMENT';
        const response = await axios.get('https://www.alphavantage.co/query', {
          params: {
            function: functionName,
            symbol: ticker,
            apikey: ALPHA_VANTAGE_API_KEY,
          },
          timeout: 10000,
        });

        if (response.data && !response.data['Note'] && response.data['symbol']) {
          const statements = parseAlphaVantageFinancials(response.data, periodType);
          if (statements.length > 0) {
            cache.set(cacheKey, { data: statements, timestamp: Date.now() });
            logger.debug(`Financial statements fetched from Alpha Vantage for ${ticker}`);
            return statements;
          }
        }
      } catch (error: any) {
        logger.warn(`Alpha Vantage financials error for ${ticker}, trying alternatives:`, error.message);
      }
    }

    // Try Polygon.io
    if (POLYGON_API_KEY) {
      try {
        const response = await axios.get(
          `https://api.polygon.io/v2/reference/financials`,
          {
            params: {
              ticker: ticker,
              timeframe: periodType === 'quarterly' ? 'quarterly' : 'annual',
              limit: 8, // Get last 8 periods
              apiKey: POLYGON_API_KEY,
            },
            timeout: 10000,
          }
        );

        if (response.data?.results) {
          const statements = parsePolygonFinancials(response.data.results, periodType);
          if (statements.length > 0) {
            cache.set(cacheKey, { data: statements, timestamp: Date.now() });
            logger.debug(`Financial statements fetched from Polygon for ${ticker}`);
            return statements;
          }
        }
      } catch (error: any) {
        logger.warn(`Polygon financials error for ${ticker}, trying Yahoo Finance:`, error.message);
      }
    }

    // Fallback to Yahoo Finance (unofficial API)
    try {
      const statements = await fetchYahooFinanceFinancials(ticker, periodType);
      if (statements.length > 0) {
        cache.set(cacheKey, { data: statements, timestamp: Date.now() });
        logger.debug(`Financial statements fetched from Yahoo Finance for ${ticker}`);
        return statements;
      }
    } catch (error: any) {
      logger.warn(`Yahoo Finance financials error for ${ticker}:`, error.message);
    }

    // No data available from any source
    logger.warn(`No financial data available for ${ticker} from any source`);
    throw new Error(`No financial statements available for ${ticker}`);
  } catch (error) {
    logger.error(`Error fetching financial statements for ${ticker}:`, error);
    throw error instanceof Error ? error : new Error(`Failed to fetch financial statements for ${ticker}`);
  }
}

/**
 * Parse Alpha Vantage financial data
 */
function parseAlphaVantageFinancials(data: any, periodType: 'quarterly' | 'annual'): FinancialStatement[] {
  const statements: FinancialStatement[] = [];
  const periods = periodType === 'quarterly' 
    ? (data.quarterlyReports || []).slice(0, 8)
    : (data.annualReports || []).slice(0, 5);

  for (const period of periods) {
    const statement: FinancialStatement = {
      period: period.fiscalDateEnding,
      periodType,
      incomeStatement: {
        revenue: parseFloat(period.totalRevenue || 0) / 1000000, // Convert to millions
        costOfRevenue: parseFloat(period.costOfRevenue || 0) / 1000000,
        grossProfit: parseFloat(period.grossProfit || 0) / 1000000,
        operatingExpenses: parseFloat(period.operatingExpenses || 0) / 1000000,
        operatingIncome: parseFloat(period.operatingIncome || 0) / 1000000,
        interestExpense: parseFloat(period.interestExpense || 0) / 1000000,
        incomeBeforeTax: parseFloat(period.incomeBeforeTax || 0) / 1000000,
        incomeTaxExpense: parseFloat(period.incomeTaxExpense || 0) / 1000000,
        netIncome: parseFloat(period.netIncome || 0) / 1000000,
        eps: parseFloat(period.dilutedEPS || 0),
        sharesOutstanding: parseFloat(period.dilutedAverageShares || 0) / 1000000,
      },
    };
    statements.push(statement);
  }

  return statements;
}

/**
 * Parse Polygon.io financial data
 */
function parsePolygonFinancials(results: any[], periodType: 'quarterly' | 'annual'): FinancialStatement[] {
  const statements: FinancialStatement[] = [];

  for (const result of results.slice(0, 8)) {
    const financials = result.financials;
    if (!financials) continue;

    const statement: FinancialStatement = {
      period: result.start_date || result.end_date,
      periodType,
      incomeStatement: financials.income_statement ? {
        revenue: (financials.income_statement.revenues?.value || 0) / 1000000,
        costOfRevenue: (financials.income_statement.cost_of_revenue?.value || 0) / 1000000,
        grossProfit: (financials.income_statement.gross_profit?.value || 0) / 1000000,
        operatingExpenses: (financials.income_statement.operating_expenses?.value || 0) / 1000000,
        operatingIncome: (financials.income_statement.operating_income?.value || 0) / 1000000,
        interestExpense: (financials.income_statement.interest_expense?.value || 0) / 1000000,
        incomeBeforeTax: (financials.income_statement.income_before_tax?.value || 0) / 1000000,
        incomeTaxExpense: (financials.income_statement.income_tax_expense?.value || 0) / 1000000,
        netIncome: (financials.income_statement.net_income?.value || 0) / 1000000,
        eps: financials.income_statement.earnings_per_share?.value || 0,
        sharesOutstanding: (financials.income_statement.weighted_average_shares?.value || 0) / 1000000,
      } : undefined,
      balanceSheet: financials.balance_sheet ? {
        cashAndCashEquivalents: (financials.balance_sheet.cash_and_equivalents?.value || 0) / 1000000,
        shortTermInvestments: (financials.balance_sheet.short_term_investments?.value || 0) / 1000000,
        accountsReceivable: (financials.balance_sheet.accounts_receivable?.value || 0) / 1000000,
        inventory: (financials.balance_sheet.inventory?.value || 0) / 1000000,
        currentAssets: (financials.balance_sheet.current_assets?.value || 0) / 1000000,
        propertyPlantEquipment: (financials.balance_sheet.property_plant_equipment?.value || 0) / 1000000,
        longTermInvestments: (financials.balance_sheet.long_term_investments?.value || 0) / 1000000,
        totalAssets: (financials.balance_sheet.assets?.value || 0) / 1000000,
        accountsPayable: (financials.balance_sheet.accounts_payable?.value || 0) / 1000000,
        shortTermDebt: (financials.balance_sheet.short_term_debt?.value || 0) / 1000000,
        currentLiabilities: (financials.balance_sheet.current_liabilities?.value || 0) / 1000000,
        longTermDebt: (financials.balance_sheet.long_term_debt?.value || 0) / 1000000,
        totalLiabilities: (financials.balance_sheet.liabilities?.value || 0) / 1000000,
        commonStock: (financials.balance_sheet.common_stock?.value || 0) / 1000000,
        retainedEarnings: (financials.balance_sheet.retained_earnings?.value || 0) / 1000000,
        totalEquity: (financials.balance_sheet.equity?.value || 0) / 1000000,
        totalLiabilitiesAndEquity: (financials.balance_sheet.liabilities_and_equity?.value || 0) / 1000000,
      } : undefined,
      cashFlow: financials.cash_flow_statement ? {
        netIncome: (financials.cash_flow_statement.net_income?.value || 0) / 1000000,
        depreciation: (financials.cash_flow_statement.depreciation?.value || 0) / 1000000,
        changesInWorkingCapital: (financials.cash_flow_statement.changes_in_working_capital?.value || 0) / 1000000,
        operatingCashFlow: (financials.cash_flow_statement.operating_cash_flow?.value || 0) / 1000000,
        capitalExpenditures: (financials.cash_flow_statement.capital_expenditures?.value || 0) / 1000000,
        investments: (financials.cash_flow_statement.investments?.value || 0) / 1000000,
        investingCashFlow: (financials.cash_flow_statement.investing_cash_flow?.value || 0) / 1000000,
        debtIssuance: (financials.cash_flow_statement.debt_issuance?.value || 0) / 1000000,
        dividendsPaid: (financials.cash_flow_statement.dividends_paid?.value || 0) / 1000000,
        financingCashFlow: (financials.cash_flow_statement.financing_cash_flow?.value || 0) / 1000000,
        freeCashFlow: (financials.cash_flow_statement.free_cash_flow?.value || 0) / 1000000,
        netChangeInCash: (financials.cash_flow_statement.net_change_in_cash?.value || 0) / 1000000,
      } : undefined,
    };
    statements.push(statement);
  }

  return statements;
}

/**
 * Fetch financials from Yahoo Finance (unofficial API)
 */
async function fetchYahooFinanceFinancials(
  ticker: string,
  periodType: 'quarterly' | 'annual'
): Promise<FinancialStatement[]> {
  // Yahoo Finance doesn't have a direct API for financial statements
  // Return empty array - will be handled by caller
  logger.warn(`Yahoo Finance financial statements not available for ${ticker}`);
  return [];
}

/**
 * Generate mock financial data for testing
 * NOTE: This function is kept for reference but should not be used in production
 * All mock data fallbacks have been removed per requirements
 */
function _generateMockFinancials_DEPRECATED(ticker: string, periodType: 'quarterly' | 'annual'): FinancialStatement[] {
  const periods = periodType === 'quarterly' ? 8 : 5;
  const statements: FinancialStatement[] = [];

  for (let i = 0; i < periods; i++) {
    const date = new Date();
    if (periodType === 'quarterly') {
      date.setMonth(date.getMonth() - (i * 3));
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const period = `${date.getFullYear()}-Q${quarter}`;
      statements.push({
        period,
        periodType: 'quarterly',
        incomeStatement: {
          revenue: 80000 + Math.random() * 10000 - 5000,
          costOfRevenue: 50000 + Math.random() * 5000 - 2500,
          grossProfit: 30000 + Math.random() * 5000 - 2500,
          operatingExpenses: 15000 + Math.random() * 2000 - 1000,
          operatingIncome: 15000 + Math.random() * 3000 - 1500,
          interestExpense: 500 + Math.random() * 200 - 100,
          incomeBeforeTax: 14500 + Math.random() * 3000 - 1500,
          incomeTaxExpense: 3000 + Math.random() * 500 - 250,
          netIncome: 11500 + Math.random() * 2500 - 1250,
          eps: 1.5 + Math.random() * 0.3 - 0.15,
          sharesOutstanding: 15000,
        },
        balanceSheet: {
          cashAndCashEquivalents: 50000 + Math.random() * 10000 - 5000,
          shortTermInvestments: 20000 + Math.random() * 5000 - 2500,
          accountsReceivable: 30000 + Math.random() * 5000 - 2500,
          inventory: 10000 + Math.random() * 2000 - 1000,
          currentAssets: 110000 + Math.random() * 15000 - 7500,
          propertyPlantEquipment: 50000 + Math.random() * 10000 - 5000,
          longTermInvestments: 100000 + Math.random() * 20000 - 10000,
          totalAssets: 260000 + Math.random() * 30000 - 15000,
          accountsPayable: 20000 + Math.random() * 3000 - 1500,
          shortTermDebt: 10000 + Math.random() * 2000 - 1000,
          currentLiabilities: 30000 + Math.random() * 4000 - 2000,
          longTermDebt: 50000 + Math.random() * 10000 - 5000,
          totalLiabilities: 80000 + Math.random() * 12000 - 6000,
          commonStock: 50000,
          retainedEarnings: 130000 + Math.random() * 20000 - 10000,
          totalEquity: 180000 + Math.random() * 20000 - 10000,
          totalLiabilitiesAndEquity: 260000 + Math.random() * 30000 - 15000,
        },
        cashFlow: {
          netIncome: 11500 + Math.random() * 2500 - 1250,
          depreciation: 3000 + Math.random() * 500 - 250,
          changesInWorkingCapital: -2000 + Math.random() * 1000 - 500,
          operatingCashFlow: 12500 + Math.random() * 3000 - 1500,
          capitalExpenditures: -5000 + Math.random() * 1000 - 500,
          investments: -3000 + Math.random() * 1000 - 500,
          investingCashFlow: -8000 + Math.random() * 1500 - 750,
          debtIssuance: 2000 + Math.random() * 1000 - 500,
          dividendsPaid: -3000 + Math.random() * 500 - 250,
          financingCashFlow: -1000 + Math.random() * 500 - 250,
          freeCashFlow: 7500 + Math.random() * 2500 - 1250,
          netChangeInCash: 3500 + Math.random() * 2000 - 1000,
        },
      });
    } else {
      date.setFullYear(date.getFullYear() - i);
      const period = `${date.getFullYear()}`;
      statements.push({
        period,
        periodType: 'annual',
        incomeStatement: {
          revenue: 320000 + Math.random() * 40000 - 20000,
          costOfRevenue: 200000 + Math.random() * 20000 - 10000,
          grossProfit: 120000 + Math.random() * 20000 - 10000,
          operatingExpenses: 60000 + Math.random() * 8000 - 4000,
          operatingIncome: 60000 + Math.random() * 12000 - 6000,
          interestExpense: 2000 + Math.random() * 800 - 400,
          incomeBeforeTax: 58000 + Math.random() * 12000 - 6000,
          incomeTaxExpense: 12000 + Math.random() * 2000 - 1000,
          netIncome: 46000 + Math.random() * 10000 - 5000,
          eps: 6.0 + Math.random() * 1.2 - 0.6,
          sharesOutstanding: 15000,
        },
        balanceSheet: {
          cashAndCashEquivalents: 50000 + Math.random() * 10000 - 5000,
          shortTermInvestments: 20000 + Math.random() * 5000 - 2500,
          accountsReceivable: 30000 + Math.random() * 5000 - 2500,
          inventory: 10000 + Math.random() * 2000 - 1000,
          currentAssets: 110000 + Math.random() * 15000 - 7500,
          propertyPlantEquipment: 50000 + Math.random() * 10000 - 5000,
          longTermInvestments: 100000 + Math.random() * 20000 - 10000,
          totalAssets: 260000 + Math.random() * 30000 - 15000,
          accountsPayable: 20000 + Math.random() * 3000 - 1500,
          shortTermDebt: 10000 + Math.random() * 2000 - 1000,
          currentLiabilities: 30000 + Math.random() * 4000 - 2000,
          longTermDebt: 50000 + Math.random() * 10000 - 5000,
          totalLiabilities: 80000 + Math.random() * 12000 - 6000,
          commonStock: 50000,
          retainedEarnings: 130000 + Math.random() * 20000 - 10000,
          totalEquity: 180000 + Math.random() * 20000 - 10000,
          totalLiabilitiesAndEquity: 260000 + Math.random() * 30000 - 15000,
        },
        cashFlow: {
          netIncome: 46000 + Math.random() * 10000 - 5000,
          depreciation: 12000 + Math.random() * 2000 - 1000,
          changesInWorkingCapital: -8000 + Math.random() * 4000 - 2000,
          operatingCashFlow: 50000 + Math.random() * 12000 - 6000,
          capitalExpenditures: -20000 + Math.random() * 4000 - 2000,
          investments: -12000 + Math.random() * 4000 - 2000,
          investingCashFlow: -32000 + Math.random() * 6000 - 3000,
          debtIssuance: 8000 + Math.random() * 4000 - 2000,
          dividendsPaid: -12000 + Math.random() * 2000 - 1000,
          financingCashFlow: -4000 + Math.random() * 2000 - 1000,
          freeCashFlow: 30000 + Math.random() * 10000 - 5000,
          netChangeInCash: 14000 + Math.random() * 8000 - 4000,
        },
      });
    }
  }

  return statements;
}

