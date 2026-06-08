import { logger } from '../utils/logger.js';
import {
  ExchangeConnectorFactory,
  ExchangeName,
  ExchangeCredentials,
  ExchangeBalance,
} from './exchangeConnector.js';
import { getCryptoQuote } from './cryptoData.js';

export interface MultiExchangePosition {
  ticker: string;
  totalQuantity: number;
  exchanges: {
    exchange: ExchangeName;
    quantity: number;
    value: number;
  }[];
  averageCostBasis: number;
  currentPrice: number;
  totalValue: number;
  totalCost: number;
  pnl: number;
  pnlPercent: number;
}

export interface MultiExchangePortfolio {
  positions: MultiExchangePosition[];
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  exchangeBreakdown: {
    exchange: ExchangeName;
    value: number;
    percentage: number;
  }[];
}

/**
 * Aggregate portfolio across multiple exchanges
 */
export class MultiExchangePortfolioService {
  /**
   * Get portfolio aggregated across all connected exchanges
   */
  async getPortfolio(
    credentials: Map<ExchangeName, ExchangeCredentials>
  ): Promise<MultiExchangePortfolio> {
    const positionsMap = new Map<string, MultiExchangePosition>();
    const exchangeValues = new Map<ExchangeName, number>();

    // Fetch balances from all exchanges
    for (const [exchange, creds] of credentials.entries()) {
      try {
        const connector = ExchangeConnectorFactory.getConnector(exchange);
        const balances = await connector.getBalance(creds);

        for (const balance of balances) {
          if (balance.total <= 0) continue;

          const ticker = balance.asset;
          const position = positionsMap.get(ticker) || {
            ticker,
            totalQuantity: 0,
            exchanges: [],
            averageCostBasis: 0,
            currentPrice: 0,
            totalValue: 0,
            totalCost: 0,
            pnl: 0,
            pnlPercent: 0,
          };

          // Get current price
          try {
            const quote = await getCryptoQuote(`${ticker}USD`);
            const currentPrice = quote.price;
            const value = balance.total * currentPrice;

            position.currentPrice = currentPrice;
            position.totalQuantity += balance.total;
            position.exchanges.push({
              exchange,
              quantity: balance.total,
              value,
            });

            // Update exchange total value
            const exchangeValue = exchangeValues.get(exchange) || 0;
            exchangeValues.set(exchange, exchangeValue + value);

            positionsMap.set(ticker, position);
          } catch (error: any) {
            logger.warn(`Failed to get price for ${ticker}:`, error.message);
          }
        }
      } catch (error: any) {
        logger.warn(`Failed to get balance from ${exchange}:`, error.message);
      }
    }

    // Calculate P&L for each position
    const positions: MultiExchangePosition[] = [];
    let totalValue = 0;
    let totalCost = 0;

    for (const position of positionsMap.values()) {
      // For now, assume cost basis equals current price (would need trade history)
      // In production, this would be calculated from actual trade history
      position.averageCostBasis = position.currentPrice;
      position.totalCost = position.totalQuantity * position.averageCostBasis;
      position.totalValue = position.totalQuantity * position.currentPrice;
      position.pnl = position.totalValue - position.totalCost;
      position.pnlPercent = position.totalCost > 0 
        ? (position.pnl / position.totalCost) * 100 
        : 0;

      totalValue += position.totalValue;
      totalCost += position.totalCost;
      positions.push(position);
    }

    // Calculate exchange breakdown
    const totalPortfolioValue = totalValue;
    const exchangeBreakdown = Array.from(exchangeValues.entries()).map(([exchange, value]) => ({
      exchange,
      value,
      percentage: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
    }));

    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return {
      positions: positions.sort((a, b) => b.totalValue - a.totalValue),
      totalValue,
      totalCost,
      totalPnl,
      totalPnlPercent,
      exchangeBreakdown: exchangeBreakdown.sort((a, b) => b.value - a.value),
    };
  }

  /**
   * Get portfolio for a specific exchange
   */
  async getExchangePortfolio(
    exchange: ExchangeName,
    credentials: ExchangeCredentials
  ): Promise<MultiExchangePosition[]> {
    try {
      const connector = ExchangeConnectorFactory.getConnector(exchange);
      const balances = await connector.getBalance(credentials);

      const positions: MultiExchangePosition[] = [];

      for (const balance of balances) {
        if (balance.total <= 0) continue;

        try {
          const quote = await getCryptoQuote(`${balance.asset}USD`);
          const currentPrice = quote.price;
          const totalValue = balance.total * currentPrice;

          positions.push({
            ticker: balance.asset,
            totalQuantity: balance.total,
            exchanges: [{
              exchange,
              quantity: balance.total,
              value: totalValue,
            }],
            averageCostBasis: currentPrice, // Would need trade history
            currentPrice,
            totalValue,
            totalCost: balance.total * currentPrice,
            pnl: 0,
            pnlPercent: 0,
          });
        } catch (error: any) {
          logger.warn(`Failed to get price for ${balance.asset}:`, error.message);
        }
      }

      return positions;
    } catch (error: any) {
      logger.error(`Failed to get exchange portfolio for ${exchange}:`, error.message);
      throw error;
    }
  }
}

