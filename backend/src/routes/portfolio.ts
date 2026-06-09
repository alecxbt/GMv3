import { Hono } from 'hono';
import type { PortfolioPosition, Portfolio } from '../../../shared/src/types';
import { MultiExchangePortfolioService } from '../services/multiExchangePortfolio.js';
import { ExchangeConnectorFactory, ExchangeName, ExchangeCredentials } from '../services/exchangeConnector.js';
import { logger } from '../utils/logger.js';

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  Bindings: Env;
};

const router = new Hono<{ Bindings: Env }>();

// Helper to get user credentials (simplified - would use actual auth)
function getUserCredentials(userId: string): Map<ExchangeName, ExchangeCredentials> {
  // In production, fetch from database and decrypt
  const credentials = new Map<ExchangeName, ExchangeCredentials>();
  
  // Placeholder - would fetch from ExchangeConnection model
  // For now, return empty map (user needs to configure exchanges)
  
  return credentials;
}

// Mock portfolio storage (replace with database)
const mockPortfolio: Portfolio = {
  positions: [],
  totalValue: 0,
  totalCost: 0,
  totalPnl: 0,
  totalPnlPercent: 0,
};

// Get portfolio (supports multi-exchange aggregation)
router.get('/', async (c) => {
  try {
    const { userId, exchange } = c.req.query();

    // If exchange is specified, get portfolio from that exchange only
    if (exchange && userId) {
      const credentials = getUserCredentials(userId as string);
      const exchangeName = exchange as ExchangeName;
      const creds = credentials.get(exchangeName);
      
      if (!creds) {
        return c.json({ error: `No credentials for ${exchange}` }, 400);
      }

      const service = new MultiExchangePortfolioService();
      const positions = await service.getExchangePortfolio(exchangeName, creds);
      
      const totalValue = positions.reduce((sum, pos) => sum + pos.totalValue, 0);
      const totalCost = positions.reduce((sum, pos) => sum + pos.totalCost, 0);
      const totalPnl = totalValue - totalCost;
      const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

      return c.json({
        positions: positions.map(pos => ({
          ticker: pos.ticker,
          shares: pos.totalQuantity,
          costBasis: pos.averageCostBasis,
          currentPrice: pos.currentPrice,
          type: 'crypto',
          pnl: pos.pnl,
          pnlPercent: pos.pnlPercent,
        })),
        totalValue,
        totalCost,
        totalPnl,
        totalPnlPercent,
      });
    }

    // Multi-exchange aggregation
    if (userId) {
      const credentials = getUserCredentials(userId as string);
      
      if (credentials.size > 0) {
        const service = new MultiExchangePortfolioService();
        const multiExchangePortfolio = await service.getPortfolio(credentials);
        
        // Convert to standard portfolio format
        const portfolio: Portfolio = {
          positions: multiExchangePortfolio.positions.map(pos => ({
            ticker: pos.ticker,
            shares: pos.totalQuantity,
            costBasis: pos.averageCostBasis,
            currentPrice: pos.currentPrice,
            type: 'crypto',
            pnl: pos.pnl,
            pnlPercent: pos.pnlPercent,
          })),
          totalValue: multiExchangePortfolio.totalValue,
          totalCost: multiExchangePortfolio.totalCost,
          totalPnl: multiExchangePortfolio.totalPnl,
          totalPnlPercent: multiExchangePortfolio.totalPnlPercent,
        };

        return c.json({
          ...portfolio,
          exchangeBreakdown: multiExchangePortfolio.exchangeBreakdown,
        });
      }
    }

    // Fallback to manual portfolio (for non-crypto or manual tracking)
    // Calculate current values
    const updatedPositions = await Promise.all(
      mockPortfolio.positions.map(async (pos) => {
        // Fetch current price (mock for now)
        const currentPrice = await getCurrentPrice(pos.ticker, pos.type);
        const currentValue = currentPrice * pos.shares;
        const costBasis = pos.costBasis * pos.shares;
        const pnl = currentValue - costBasis;
        const pnlPercent = (pnl / costBasis) * 100;

        return {
          ...pos,
          currentPrice,
          pnl,
          pnlPercent,
        };
      })
    );

    const totalValue = updatedPositions.reduce((sum, pos) => sum + pos.currentPrice * pos.shares, 0);
    const totalCost = updatedPositions.reduce((sum, pos) => sum + pos.costBasis * pos.shares, 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = (totalPnl / totalCost) * 100;

    const portfolio: Portfolio = {
      positions: updatedPositions,
      totalValue,
      totalCost,
      totalPnl,
      totalPnlPercent,
    };

    return c.json(portfolio);
  } catch (error: any) {
    logger.error('Get portfolio error:', error);
    return c.json({ 
      error: 'Failed to fetch portfolio',
      message: error.message,
    }, 500);
  }
});

// Add position
router.post('/add', async (c) => {
  try {
    const body = await c.req.parseBody();
    const { ticker, shares, type } = body as { ticker?: string; shares?: string; type?: string };

    if (!ticker || !shares || !type) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const currentPrice = await getCurrentPrice(ticker, type);
    const costBasis = currentPrice; // Assume buying at current price

    const position: PortfolioPosition = {
      ticker,
      shares: parseFloat(shares),
      costBasis,
      currentPrice,
      type,
      pnl: 0,
      pnlPercent: 0,
    };

    // Check if position already exists
    const existingIndex = mockPortfolio.positions.findIndex(
      (p) => p.ticker === ticker && p.type === type
    );

    if (existingIndex >= 0) {
      // Update existing position
      const existing = mockPortfolio.positions[existingIndex];
      const totalShares = existing.shares + position.shares;
      const avgCost = (existing.costBasis * existing.shares + costBasis * position.shares) / totalShares;
      mockPortfolio.positions[existingIndex] = {
        ...existing,
        shares: totalShares,
        costBasis: avgCost,
      };
    } else {
      mockPortfolio.positions.push(position);
    }

    return c.json({ success: true, position });
  } catch (error) {
    return c.json({ error: 'Failed to add position' }, 500);
  }
});

// Remove position
router.delete('/:ticker', async (c) => {
  try {
    const { ticker } = c.req.param();
    mockPortfolio.positions = mockPortfolio.positions.filter((p) => p.ticker !== ticker);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to remove position' }, 500);
  }
});

async function getCurrentPrice(ticker: string, type: string): Promise<number> {
  // Mock price fetching - replace with actual API calls
  // For equities: Nasdaq API
  // For crypto: CoinGecko API
  // For predictions: Polymarket/Kalshi API
  
  if (type === 'crypto') {
    // Mock crypto prices
    const cryptoPrices: Record<string, number> = {
      BTC: 42000,
      ETH: 2500,
      SOL: 100,
    };
    return cryptoPrices[ticker.toUpperCase()] || 100;
  }

  // Mock equity prices
  const equityPrices: Record<string, number> = {
    AAPL: 150.25,
    TSLA: 210.50,
    MSFT: 380.75,
    GOOGL: 140.00,
  };
  return equityPrices[ticker.toUpperCase()] || 100;
}

export { router as portfolioRoutes };