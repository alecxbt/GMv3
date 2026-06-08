// Shared types between frontend and backend

export type AssetType = 'equity' | 'crypto' | 'etf' | 'fund' | 'prediction';

export type PaneType = 
  | 'chart'
  | 'news'
  | 'quote'
  | 'options'
  | 'portfolio'
  | 'watchlist'
  | 'crypto'
  | 'prediction'
  | 'rss'
  | 'exposure'
  | 'most-active'
  | 'notes'
  | 'sector-monitor'
  | 'filings'
  | 'form13f'
  | 'predictive-analytics'
  | 'financials'
  | 'fundamental-analysis'
  | 'historical-comparison'
  | 'ratio-analysis'
  | 'help'
  | 'manager-selector'
  | 'onchain'
  | 'onchain-overview'
  | 'trading'
  | 'defi'
  | 'defi-protocol'
  | 'defi-yields'
  | 'prediction-overview'
  | 'quote-monitor'
  | 'economic'
  | 'calendar'
  | 'earnings'
  | 'treasury'
  | 'fed'
  | 'feargreed'
  | 'governance'
  | 'dao'
  | 'proposals'
  | 'alerts';

export interface Pane {
  id: string;
  type: PaneType;
  title: string;
  ticker?: string;
  countryCode?: string;
  assetType?: AssetType;
  data?: any;
  linkedTickers?: string[];
  config?: Record<string, any>;
  // Grid layout properties for draggable/resizable panes
  gridLayout?: {
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    // Pixel-based positioning for free-form overlapping panes
    pixelX?: number;
    pixelY?: number;
    pixelWidth?: number;
    pixelHeight?: number;
  };
}

export interface Command {
  raw: string;
  parts: string[];
  ticker?: string;
  countryCode?: string;
  assetType?: AssetType;
  action?: string;
  filters?: Record<string, string>;
}

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  ticker?: string;
}

export interface PortfolioPosition {
  ticker: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  type: AssetType;
  pnl: number;
  pnlPercent: number;
}

export interface Portfolio {
  positions: PortfolioPosition[];
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
}

export interface Exposure {
  sector: string;
  weight: number;
  topHoldings: Array<{
    ticker: string;
    weight: number;
  }>;
}

export interface RSSFeed {
  id: string;
  url: string;
  label: string;
  userId: string;
  filters?: Record<string, string>;
}

export interface Layout {
  id: string;
  name: string;
  panes: Pane[];
  grid: {
    rows: number;
    cols: number;
  };
}

