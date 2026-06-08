import axios from 'axios';
import { logger } from '../utils/logger.js';

// Free API endpoints
const FRED_API = 'https://api.stlouisfed.org/fred';
const ALPHA_VANTAGE_API = 'https://www.alphavantage.co/query';
const FINNHUB_API = 'https://finnhub.io/api/v1';

// Cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes for economic data

export interface EconomicEvent {
  id: string;
  date: number;
  time?: string;
  event: string;
  country: string;
  impact: 'high' | 'medium' | 'low';
  actual?: string;
  forecast?: string;
  previous?: string;
  category: string;
}

export interface EarningsEvent {
  symbol: string;
  company: string;
  date: number;
  time: 'bmo' | 'amc' | 'dmh' | 'unknown'; // before market open, after market close, during market hours
  epsEstimate?: number;
  epsActual?: number;
  revenueEstimate?: number;
  revenueActual?: number;
  surprise?: number;
  surprisePercent?: number;
}

export interface FedMeeting {
  date: number;
  type: string;
  currentRate?: number;
  expectedRate?: number;
  probability?: number;
}

export interface TreasuryYield {
  maturity: string;
  yield: number;
  change: number;
  date: number;
}

export interface MacroIndicator {
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  date: number;
  unit?: string;
  frequency: string;
}

/**
 * Get economic calendar events
 */
export async function getEconomicCalendar(days: number = 7): Promise<EconomicEvent[]> {
  const cacheKey = `economic:calendar:${days}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info('Fetching economic calendar');
    const events: EconomicEvent[] = [];
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Try Finnhub economic calendar (free tier)
    try {
      const fromDate = now.toISOString().split('T')[0];
      const toDate = endDate.toISOString().split('T')[0];
      
      const response = await axios.get(
        `${FINNHUB_API}/calendar/economic`,
        {
          params: { from: fromDate, to: toDate },
          timeout: 10000,
        }
      );

      if (response.data?.economicCalendar) {
        for (const item of response.data.economicCalendar) {
          events.push({
            id: `${item.event}-${item.time}`,
            date: new Date(item.time).getTime(),
            time: item.time,
            event: item.event,
            country: item.country || 'US',
            impact: item.impact === 3 ? 'high' : item.impact === 2 ? 'medium' : 'low',
            actual: item.actual?.toString(),
            forecast: item.estimate?.toString(),
            previous: item.prev?.toString(),
            category: categorizeEvent(item.event),
          });
        }
      }
    } catch (e: any) {
      logger.debug('Finnhub calendar failed:', e.message);
    }

    // Add known upcoming events if API fails or returns empty
    if (events.length === 0) {
      const upcomingEvents = generateKnownEvents(now, endDate);
      events.push(...upcomingEvents);
    }

    // Sort by date
    events.sort((a, b) => a.date - b.date);

    cache.set(cacheKey, { data: events, timestamp: Date.now() });
    return events;
  } catch (error: any) {
    logger.error('Error fetching economic calendar:', error.message);
    return [];
  }
}

/**
 * Generate known recurring economic events
 */
function generateKnownEvents(start: Date, end: Date): EconomicEvent[] {
  const events: EconomicEvent[] = [];
  const current = new Date(start);
  let eventId = 1;

  // Known recurring events
  const recurringEvents = [
    { event: 'FOMC Meeting', impact: 'high' as const, category: 'central_bank', dayOfWeek: 3 },
    { event: 'Initial Jobless Claims', impact: 'medium' as const, category: 'employment', dayOfWeek: 4 },
    { event: 'CPI Release', impact: 'high' as const, category: 'inflation', dayOfMonth: 12 },
    { event: 'PPI Release', impact: 'medium' as const, category: 'inflation', dayOfMonth: 14 },
    { event: 'Retail Sales', impact: 'high' as const, category: 'consumer', dayOfMonth: 15 },
    { event: 'Housing Starts', impact: 'medium' as const, category: 'housing', dayOfMonth: 17 },
    { event: 'PMI Manufacturing', impact: 'high' as const, category: 'manufacturing', dayOfMonth: 1 },
    { event: 'NFP (Non-Farm Payrolls)', impact: 'high' as const, category: 'employment', dayOfMonth: 5 },
    { event: 'GDP Release', impact: 'high' as const, category: 'growth', dayOfMonth: 28 },
  ];

  while (current <= end) {
    for (const recurring of recurringEvents) {
      if (recurring.dayOfMonth && current.getDate() === recurring.dayOfMonth) {
        events.push({
          id: `event-${eventId++}`,
          date: current.getTime(),
          event: recurring.event,
          country: 'US',
          impact: recurring.impact,
          category: recurring.category,
        });
      }
      if (recurring.dayOfWeek && current.getDay() === recurring.dayOfWeek) {
        // Weekly events like jobless claims
        if (recurring.event === 'Initial Jobless Claims') {
          events.push({
            id: `event-${eventId++}`,
            date: current.getTime(),
            event: recurring.event,
            country: 'US',
            impact: recurring.impact,
            category: recurring.category,
          });
        }
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return events;
}

/**
 * Categorize economic event
 */
function categorizeEvent(event: string): string {
  const lower = event.toLowerCase();
  if (lower.includes('cpi') || lower.includes('ppi') || lower.includes('inflation')) return 'inflation';
  if (lower.includes('employment') || lower.includes('payroll') || lower.includes('jobless')) return 'employment';
  if (lower.includes('fomc') || lower.includes('fed') || lower.includes('rate')) return 'central_bank';
  if (lower.includes('gdp') || lower.includes('growth')) return 'growth';
  if (lower.includes('retail') || lower.includes('consumer')) return 'consumer';
  if (lower.includes('housing') || lower.includes('home')) return 'housing';
  if (lower.includes('pmi') || lower.includes('manufacturing')) return 'manufacturing';
  if (lower.includes('trade') || lower.includes('export') || lower.includes('import')) return 'trade';
  return 'other';
}

/**
 * Get earnings calendar
 */
export async function getEarningsCalendar(days: number = 7): Promise<EarningsEvent[]> {
  const cacheKey = `economic:earnings:${days}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info('Fetching earnings calendar');
    const earnings: EarningsEvent[] = [];
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Try Finnhub earnings calendar (free tier)
    try {
      const fromDate = now.toISOString().split('T')[0];
      const toDate = endDate.toISOString().split('T')[0];
      
      const response = await axios.get(
        `${FINNHUB_API}/calendar/earnings`,
        {
          params: { from: fromDate, to: toDate },
          timeout: 10000,
        }
      );

      if (response.data?.earningsCalendar) {
        for (const item of response.data.earningsCalendar) {
          earnings.push({
            symbol: item.symbol,
            company: item.symbol, // Finnhub doesn't always provide company name
            date: new Date(item.date).getTime(),
            time: item.hour === 'bmo' ? 'bmo' : item.hour === 'amc' ? 'amc' : 'unknown',
            epsEstimate: item.epsEstimate,
            epsActual: item.epsActual,
            revenueEstimate: item.revenueEstimate,
            revenueActual: item.revenueActual,
          });
        }
      }
    } catch (e: any) {
      logger.debug('Finnhub earnings failed:', e.message);
    }

    // Sort by date
    earnings.sort((a, b) => a.date - b.date);

    cache.set(cacheKey, { data: earnings, timestamp: Date.now() });
    return earnings;
  } catch (error: any) {
    logger.error('Error fetching earnings calendar:', error.message);
    return [];
  }
}

/**
 * Get Treasury yields
 */
export async function getTreasuryYields(): Promise<TreasuryYield[]> {
  const cacheKey = 'economic:treasury';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info('Fetching Treasury yields');
    const yields: TreasuryYield[] = [];

    // FRED API series for Treasury yields
    const series = [
      { id: 'DGS1MO', maturity: '1 Month' },
      { id: 'DGS3MO', maturity: '3 Month' },
      { id: 'DGS6MO', maturity: '6 Month' },
      { id: 'DGS1', maturity: '1 Year' },
      { id: 'DGS2', maturity: '2 Year' },
      { id: 'DGS5', maturity: '5 Year' },
      { id: 'DGS10', maturity: '10 Year' },
      { id: 'DGS30', maturity: '30 Year' },
    ];

    // Fetch from FRED (free, no API key required for basic access)
    for (const s of series) {
      try {
        const response = await axios.get(
          `${FRED_API}/series/observations`,
          {
            params: {
              series_id: s.id,
              sort_order: 'desc',
              limit: 2,
              file_type: 'json',
            },
            timeout: 5000,
          }
        );

        if (response.data?.observations?.length > 0) {
          const latest = response.data.observations[0];
          const previous = response.data.observations[1];
          const currentYield = parseFloat(latest.value);
          const prevYield = previous ? parseFloat(previous.value) : currentYield;

          yields.push({
            maturity: s.maturity,
            yield: currentYield,
            change: currentYield - prevYield,
            date: new Date(latest.date).getTime(),
          });
        }
      } catch (e: any) {
        logger.debug(`FRED ${s.id} failed:`, e.message);
      }
    }

    // Fallback with approximate current yields
    if (yields.length === 0) {
      yields.push(
        { maturity: '1 Month', yield: 5.25, change: 0, date: Date.now() },
        { maturity: '3 Month', yield: 5.23, change: 0, date: Date.now() },
        { maturity: '6 Month', yield: 5.10, change: 0, date: Date.now() },
        { maturity: '1 Year', yield: 4.75, change: 0, date: Date.now() },
        { maturity: '2 Year', yield: 4.30, change: 0, date: Date.now() },
        { maturity: '5 Year', yield: 4.05, change: 0, date: Date.now() },
        { maturity: '10 Year', yield: 4.15, change: 0, date: Date.now() },
        { maturity: '30 Year', yield: 4.35, change: 0, date: Date.now() },
      );
    }

    cache.set(cacheKey, { data: yields, timestamp: Date.now() });
    return yields;
  } catch (error: any) {
    logger.error('Error fetching Treasury yields:', error.message);
    return [];
  }
}

/**
 * Get key macro indicators
 */
export async function getMacroIndicators(): Promise<MacroIndicator[]> {
  const cacheKey = 'economic:macro';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 2) {
    return cached.data;
  }

  try {
    logger.info('Fetching macro indicators');
    const indicators: MacroIndicator[] = [];

    // Key FRED series
    const series = [
      { id: 'CPIAUCSL', name: 'CPI (YoY)', unit: '%', frequency: 'monthly' },
      { id: 'UNRATE', name: 'Unemployment Rate', unit: '%', frequency: 'monthly' },
      { id: 'GDPC1', name: 'Real GDP', unit: 'Billions', frequency: 'quarterly' },
      { id: 'FEDFUNDS', name: 'Fed Funds Rate', unit: '%', frequency: 'daily' },
      { id: 'M2SL', name: 'M2 Money Supply', unit: 'Billions', frequency: 'monthly' },
      { id: 'RSXFS', name: 'Retail Sales', unit: 'Millions', frequency: 'monthly' },
      { id: 'INDPRO', name: 'Industrial Production', unit: 'Index', frequency: 'monthly' },
      { id: 'HOUST', name: 'Housing Starts', unit: 'Thousands', frequency: 'monthly' },
    ];

    for (const s of series) {
      try {
        const response = await axios.get(
          `${FRED_API}/series/observations`,
          {
            params: {
              series_id: s.id,
              sort_order: 'desc',
              limit: 2,
              file_type: 'json',
            },
            timeout: 5000,
          }
        );

        if (response.data?.observations?.length > 0) {
          const latest = response.data.observations[0];
          const previous = response.data.observations[1];
          const currentValue = parseFloat(latest.value);
          const prevValue = previous ? parseFloat(previous.value) : undefined;

          indicators.push({
            name: s.name,
            value: currentValue,
            previousValue: prevValue,
            change: prevValue ? ((currentValue - prevValue) / prevValue) * 100 : undefined,
            date: new Date(latest.date).getTime(),
            unit: s.unit,
            frequency: s.frequency,
          });
        }
      } catch (e: any) {
        logger.debug(`FRED ${s.id} failed:`, e.message);
      }
    }

    // Add fallback data if API calls fail
    if (indicators.length === 0) {
      indicators.push(
        { name: 'Fed Funds Rate', value: 5.33, frequency: 'daily', date: Date.now(), unit: '%' },
        { name: 'CPI (YoY)', value: 3.2, frequency: 'monthly', date: Date.now(), unit: '%' },
        { name: 'Unemployment Rate', value: 3.7, frequency: 'monthly', date: Date.now(), unit: '%' },
      );
    }

    cache.set(cacheKey, { data: indicators, timestamp: Date.now() });
    return indicators;
  } catch (error: any) {
    logger.error('Error fetching macro indicators:', error.message);
    return [];
  }
}

/**
 * Get Fed meetings and rate expectations
 */
export async function getFedMeetings(): Promise<FedMeeting[]> {
  const cacheKey = 'economic:fed';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 5) {
    return cached.data;
  }

  try {
    logger.info('Fetching Fed meetings');
    const meetings: FedMeeting[] = [];

    // Known 2024 FOMC meeting dates
    const fomcDates2024 = [
      { date: new Date('2024-01-31'), type: 'FOMC Meeting' },
      { date: new Date('2024-03-20'), type: 'FOMC Meeting + SEP' },
      { date: new Date('2024-05-01'), type: 'FOMC Meeting' },
      { date: new Date('2024-06-12'), type: 'FOMC Meeting + SEP' },
      { date: new Date('2024-07-31'), type: 'FOMC Meeting' },
      { date: new Date('2024-09-18'), type: 'FOMC Meeting + SEP' },
      { date: new Date('2024-11-07'), type: 'FOMC Meeting' },
      { date: new Date('2024-12-18'), type: 'FOMC Meeting + SEP' },
    ];

    // Add 2025 dates
    const fomcDates2025 = [
      { date: new Date('2025-01-29'), type: 'FOMC Meeting' },
      { date: new Date('2025-03-19'), type: 'FOMC Meeting + SEP' },
      { date: new Date('2025-05-07'), type: 'FOMC Meeting' },
      { date: new Date('2025-06-18'), type: 'FOMC Meeting + SEP' },
      { date: new Date('2025-07-30'), type: 'FOMC Meeting' },
      { date: new Date('2025-09-17'), type: 'FOMC Meeting + SEP' },
      { date: new Date('2025-11-05'), type: 'FOMC Meeting' },
      { date: new Date('2025-12-17'), type: 'FOMC Meeting + SEP' },
    ];

    // Add 2026 dates
    const fomcDates2026 = [
      { date: new Date('2026-01-28'), type: 'FOMC Meeting' },
      { date: new Date('2026-03-18'), type: 'FOMC Meeting + SEP' },
      { date: new Date('2026-05-06'), type: 'FOMC Meeting' },
      { date: new Date('2026-06-17'), type: 'FOMC Meeting + SEP' },
      { date: new Date('2026-07-29'), type: 'FOMC Meeting' },
      { date: new Date('2026-09-16'), type: 'FOMC Meeting + SEP' },
      { date: new Date('2026-11-04'), type: 'FOMC Meeting' },
      { date: new Date('2026-12-16'), type: 'FOMC Meeting + SEP' },
    ];

    const allDates = [...fomcDates2024, ...fomcDates2025, ...fomcDates2026];
    const now = new Date();
    const currentRate = 5.33; // Current Fed Funds rate

    for (const fomc of allDates) {
      if (fomc.date >= now) {
        meetings.push({
          date: fomc.date.getTime(),
          type: fomc.type,
          currentRate,
          expectedRate: currentRate, // Would need CME FedWatch data for actual expectations
        });
      }
    }

    // Limit to next 8 meetings
    const result = meetings.slice(0, 8);
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error: any) {
    logger.error('Error fetching Fed meetings:', error.message);
    return [];
  }
}

/**
 * Get Fear & Greed Index (crypto version from Alternative.me)
 */
export async function getFearGreedIndex(): Promise<{
  value: number;
  classification: string;
  timestamp: number;
  history: { value: number; timestamp: number; classification: string }[];
}> {
  const cacheKey = 'economic:feargreed';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info('Fetching Fear & Greed Index');
    
    const response = await axios.get(
      'https://api.alternative.me/fng/?limit=30',
      { timeout: 10000 }
    );

    if (response.data?.data) {
      const current = response.data.data[0];
      const history = response.data.data.map((item: any) => ({
        value: parseInt(item.value),
        timestamp: parseInt(item.timestamp) * 1000,
        classification: item.value_classification,
      }));

      const result = {
        value: parseInt(current.value),
        classification: current.value_classification,
        timestamp: parseInt(current.timestamp) * 1000,
        history,
      };

      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }

    // Fallback
    return {
      value: 50,
      classification: 'Neutral',
      timestamp: Date.now(),
      history: [],
    };
  } catch (error: any) {
    logger.error('Error fetching Fear & Greed Index:', error.message);
    return {
      value: 50,
      classification: 'Neutral',
      timestamp: Date.now(),
      history: [],
    };
  }
}

