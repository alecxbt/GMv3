import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
    }
    return response;
  },
  (error) => {
    // Enhanced error logging
    if (error.response) {
      console.error(`❌ API Error [${error.response.status}]:`, error.response.data || error.message);
    } else if (error.request) {
      console.error('❌ API Network Error: No response from server. Is the backend running?');
    } else {
      console.error('❌ API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export interface Quote {
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

export interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  ticker?: string;
  description?: string;
  imageUrl?: string;
}

export interface Filing {
  id: string;
  form: string;
  date: string;
  description: string;
  url: string;
  ticker: string;
}

// Market Data API
export const marketDataApi = {
  // Get quote for a ticker
  getQuote: async (ticker: string, countryCode?: string): Promise<Quote> => {
    const response = await api.get(`/data/quote/${ticker}`, {
      params: { countryCode },
    });
    return response.data;
  },

  // Get chart data
  getChart: async (
    ticker: string,
    period: string = '1d',
    countryCode?: string
  ): Promise<{ ticker: string; period: string; data: ChartDataPoint[] }> => {
    const response = await api.get(`/data/chart/${ticker}`, {
      params: { period, countryCode },
    });
    return response.data;
  },

  // Get news
  getNews: async (ticker: string, limit: number = 20): Promise<{ ticker: string; news: NewsItem[] }> => {
    const response = await api.get(`/data/news/${ticker}`, {
      params: { limit },
    });
    return response.data;
  },

  // Get options chain
  getOptions: async (ticker: string): Promise<any> => {
    const response = await api.get(`/data/options/${ticker}`);
    return response.data;
  },

  // Get most active stocks
  getMostActive: async (): Promise<{ stocks: any[] }> => {
    const response = await api.get('/data/most-active');
    return response.data;
  },

  // Get EDGAR filings
  getFilings: async (ticker: string, limit: number = 20): Promise<{ ticker: string; filings: Filing[] }> => {
    const response = await api.get(`/data/filings/${ticker}`, {
      params: { limit },
    });
    return response.data;
  },

  // Get 13-F filings for a manager
  getForm13F: async (managerName: string, limit: number = 10): Promise<any> => {
    const response = await api.get(`/data/form13f/${encodeURIComponent(managerName)}`, {
      params: { limit },
    });
    return response.data;
  },

  // Get all tracked managers
  getAllManagers: async (): Promise<{ managers: any[] }> => {
    const response = await api.get('/data/managers');
    return response.data;
  },

  // Search for managers
  searchManagers: async (query: string): Promise<{ managers: any[] }> => {
    const response = await api.get('/data/managers/search', {
      params: { q: query },
    });
    return response.data;
  },

  // Get private market quote (Nasdaq Private Markets)
  getPrivateMarketQuote: async (companyName: string, ticker?: string): Promise<any> => {
    const response = await api.get(`/data/private-market/${encodeURIComponent(companyName)}`, {
      params: { ticker },
    });
    return response.data;
  },

  // Get private market chart
  getPrivateMarketChart: async (
    companyName: string,
    ticker?: string,
    period: string = '1y'
  ): Promise<{ companyName: string; ticker?: string; period: string; data: any[] }> => {
    const response = await api.get(`/data/private-market/${encodeURIComponent(companyName)}/chart`, {
      params: { ticker, period },
    });
    return response.data;
  },

  // Search private companies
  searchPrivateCompanies: async (query: string): Promise<{ companies: any[] }> => {
    const response = await api.get('/data/private-market/search', {
      params: { q: query },
    });
    return response.data;
  },

  // Get fundamental analysis
  getFundamentalAnalysis: async (
    ticker: string,
    countryCode?: string
  ): Promise<any> => {
    const response = await api.get(`/data/fundamental-analysis/${ticker}`, {
      params: { countryCode },
    });
    return response.data;
  },

  // Get financial statements
  getFinancialStatements: async (
    ticker: string,
    countryCode?: string,
    periodType: 'quarterly' | 'annual' = 'quarterly'
  ): Promise<{ ticker: string; periodType: string; statements: any[] }> => {
    const response = await api.get(`/data/financials/${ticker}`, {
      params: { countryCode, periodType },
    });
    return response.data;
  },

  // Get historical performance comparison
  getHistoricalComparison: async (
    tickers: string[],
    period: string = '1y'
  ): Promise<any> => {
    const response = await api.get('/data/historical-comparison', {
      params: { tickers: tickers.join(','), period },
    });
    return response.data;
  },

  // Get ratio analysis
  getRatioAnalysis: async (
    ticker1: string,
    ticker2: string,
    period: string = '1y'
  ): Promise<any> => {
    const response = await api.get('/data/ratio-analysis', {
      params: { ticker1, ticker2, period },
    });
    return response.data;
  },
};

// Crypto API
export const cryptoApi = {
  // Get crypto quote
  getQuote: async (pair: string): Promise<any> => {
    const response = await api.get(`/data/crypto/${pair}`);
    return response.data;
  },

  // Get crypto chart
  getChart: async (pair: string, period: string = '1d'): Promise<{ pair: string; period: string; data: ChartDataPoint[] }> => {
    const response = await api.get(`/data/crypto/${pair}/chart`, {
      params: { period },
    });
    return response.data;
  },

  // Get crypto news
  getNews: async (pair: string, limit: number = 20): Promise<{ pair: string; news: NewsItem[] }> => {
    const response = await api.get(`/data/crypto/${pair}/news`, {
      params: { limit },
    });
    return response.data;
  },
};

export default api;

