import { logger } from '../utils/logger.js';
import {
  ExchangeConnectorFactory,
  ExchangeName,
  OrderSide,
  OrderType,
  Order,
  ExchangeTicker,
  ExchangeCredentials,
} from './exchangeConnector.js';

export interface RoutingStrategy {
  name: string;
  selectExchange(
    symbol: string,
    side: OrderSide,
    quantity: number,
    exchanges: ExchangeName[],
    tickers: Map<ExchangeName, ExchangeTicker>
  ): ExchangeName | null;
}

export interface RoutingConfig {
  enabledExchanges: ExchangeName[];
  defaultStrategy: string;
  minOrderSize?: number;
  maxOrderSize?: number;
  slippageTolerance?: number; // Percentage
}

/**
 * Best Price Routing Strategy
 * Routes to exchange with best bid (for sells) or best ask (for buys)
 */
class BestPriceStrategy implements RoutingStrategy {
  name = 'best_price';

  selectExchange(
    symbol: string,
    side: OrderSide,
    quantity: number,
    exchanges: ExchangeName[],
    tickers: Map<ExchangeName, ExchangeTicker>
  ): ExchangeName | null {
    if (tickers.size === 0) return null;

    let bestExchange: ExchangeName | null = null;
    let bestPrice = side === 'buy' ? Infinity : -Infinity;

    for (const exchange of exchanges) {
      const ticker = tickers.get(exchange);
      if (!ticker) continue;

      const price = side === 'buy' ? ticker.ask : ticker.bid;
      
      if (side === 'buy' && price < bestPrice) {
        bestPrice = price;
        bestExchange = exchange;
      } else if (side === 'sell' && price > bestPrice) {
        bestPrice = price;
        bestExchange = exchange;
      }
    }

    return bestExchange;
  }
}

/**
 * Liquidity-Based Routing Strategy
 * Routes to exchange with highest volume (best liquidity)
 */
class LiquidityStrategy implements RoutingStrategy {
  name = 'liquidity';

  selectExchange(
    symbol: string,
    side: OrderSide,
    quantity: number,
    exchanges: ExchangeName[],
    tickers: Map<ExchangeName, ExchangeTicker>
  ): ExchangeName | null {
    if (tickers.size === 0) return null;

    let bestExchange: ExchangeName | null = null;
    let maxVolume = -1;

    for (const exchange of exchanges) {
      const ticker = tickers.get(exchange);
      if (!ticker) continue;

      if (ticker.volume24h > maxVolume) {
        maxVolume = ticker.volume24h;
        bestExchange = exchange;
      }
    }

    return bestExchange;
  }
}

/**
 * Split Order Strategy
 * Splits large orders across multiple exchanges
 */
class SplitOrderStrategy implements RoutingStrategy {
  name = 'split';

  selectExchange(
    symbol: string,
    side: OrderSide,
    quantity: number,
    exchanges: ExchangeName[],
    tickers: Map<ExchangeName, ExchangeTicker>
  ): ExchangeName | null {
    // This strategy would return multiple exchanges
    // For now, return the first available exchange
    // Full implementation would split across multiple exchanges
    for (const exchange of exchanges) {
      if (tickers.has(exchange)) {
        return exchange;
      }
    }
    return null;
  }

  /**
   * Calculate split allocation across exchanges
   */
  calculateSplit(
    symbol: string,
    side: OrderSide,
    totalQuantity: number,
    exchanges: ExchangeName[],
    tickers: Map<ExchangeName, ExchangeTicker>
  ): Map<ExchangeName, number> {
    const allocations = new Map<ExchangeName, number>();
    
    // Simple equal split - could be enhanced with liquidity weighting
    const availableExchanges = exchanges.filter(ex => tickers.has(ex));
    if (availableExchanges.length === 0) return allocations;

    const quantityPerExchange = totalQuantity / availableExchanges.length;
    
    for (const exchange of availableExchanges) {
      allocations.set(exchange, quantityPerExchange);
    }

    return allocations;
  }
}

/**
 * Smart Order Router
 * Routes orders to optimal exchanges based on strategy
 */
export class SmartOrderRouter {
  private strategies: Map<string, RoutingStrategy> = new Map();
  private config: RoutingConfig;

  constructor(config: RoutingConfig) {
    this.config = config;
    
    // Register strategies
    this.strategies.set('best_price', new BestPriceStrategy());
    this.strategies.set('liquidity', new LiquidityStrategy());
    this.strategies.set('split', new SplitOrderStrategy());
  }

  /**
   * Get current tickers from all enabled exchanges
   */
  async getTickers(
    symbol: string,
    credentials: Map<ExchangeName, ExchangeCredentials>
  ): Promise<Map<ExchangeName, ExchangeTicker>> {
    const tickers = new Map<ExchangeName, ExchangeTicker>();

    for (const exchange of this.config.enabledExchanges) {
      try {
        const connector = ExchangeConnectorFactory.getConnector(exchange);
        const ticker = await connector.getTicker(symbol);
        tickers.set(exchange, ticker);
      } catch (error: any) {
        logger.warn(`Failed to get ticker from ${exchange}:`, error.message);
      }
    }

    return tickers;
  }

  /**
   * Route and execute order
   */
  async routeOrder(
    symbol: string,
    side: OrderSide,
    type: OrderType,
    quantity: number,
    price: number | undefined,
    stopPrice: number | undefined,
    credentials: Map<ExchangeName, ExchangeCredentials>,
    strategy?: string
  ): Promise<Order[]> {
    const selectedStrategy = strategy || this.config.defaultStrategy;
    const strategyImpl = this.strategies.get(selectedStrategy);
    
    if (!strategyImpl) {
      throw new Error(`Unknown routing strategy: ${selectedStrategy}`);
    }

    // Validate order size
    if (this.config.minOrderSize && quantity < this.config.minOrderSize) {
      throw new Error(`Order size ${quantity} below minimum ${this.config.minOrderSize}`);
    }
    if (this.config.maxOrderSize && quantity > this.config.maxOrderSize) {
      throw new Error(`Order size ${quantity} above maximum ${this.config.maxOrderSize}`);
    }

    // Get current market prices from all exchanges
    const tickers = await this.getTickers(symbol, credentials);

    if (tickers.size === 0) {
      throw new Error('No exchange data available for routing');
    }

    // Handle split orders
    if (selectedStrategy === 'split') {
      const splitStrategy = strategyImpl as SplitOrderStrategy;
      const allocations = splitStrategy.calculateSplit(
        symbol,
        side,
        quantity,
        this.config.enabledExchanges,
        tickers
      );

      const orders: Order[] = [];
      for (const [exchange, allocQuantity] of allocations.entries()) {
        try {
          const connector = ExchangeConnectorFactory.getConnector(exchange);
          const creds = credentials.get(exchange);
          if (!creds) {
            logger.warn(`No credentials for ${exchange}, skipping`);
            continue;
          }

          const order = await connector.placeOrder(
            creds,
            symbol,
            side,
            type,
            allocQuantity,
            price,
            stopPrice
          );
          orders.push(order);
        } catch (error: any) {
          logger.error(`Failed to place order on ${exchange}:`, error.message);
        }
      }

      return orders;
    }

    // Single exchange routing
    const selectedExchange = strategyImpl.selectExchange(
      symbol,
      side,
      quantity,
      this.config.enabledExchanges,
      tickers
    );

    if (!selectedExchange) {
      throw new Error('No suitable exchange found for routing');
    }

    const connector = ExchangeConnectorFactory.getConnector(selectedExchange);
    const creds = credentials.get(selectedExchange);
    
    if (!creds) {
      throw new Error(`No credentials configured for ${selectedExchange}`);
    }

    // Check slippage tolerance
    if (this.config.slippageTolerance && type === 'market') {
      const ticker = tickers.get(selectedExchange);
      if (ticker && price) {
        const expectedPrice = side === 'buy' ? ticker.ask : ticker.bid;
        const slippage = Math.abs((expectedPrice - price) / price) * 100;
        
        if (slippage > this.config.slippageTolerance) {
          throw new Error(
            `Slippage ${slippage.toFixed(2)}% exceeds tolerance ${this.config.slippageTolerance}%`
          );
        }
      }
    }

    const order = await connector.placeOrder(
      creds,
      symbol,
      side,
      type,
      quantity,
      price,
      stopPrice
    );

    return [order];
  }

  /**
   * Get best execution price across exchanges
   */
  async getBestExecutionPrice(
    symbol: string,
    side: OrderSide,
    quantity: number,
    credentials: Map<ExchangeName, ExchangeCredentials>
  ): Promise<{ exchange: ExchangeName; price: number } | null> {
    const tickers = await this.getTickers(symbol, credentials);
    
    if (tickers.size === 0) return null;

    const bestPriceStrategy = this.strategies.get('best_price') as BestPriceStrategy;
    const exchange = bestPriceStrategy.selectExchange(
      symbol,
      side,
      quantity,
      this.config.enabledExchanges,
      tickers
    );

    if (!exchange) return null;

    const ticker = tickers.get(exchange);
    if (!ticker) return null;

    const price = side === 'buy' ? ticker.ask : ticker.bid;
    return { exchange, price };
  }
}

