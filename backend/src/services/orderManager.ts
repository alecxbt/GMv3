import { logger } from '../utils/logger.js';
import {
  Order,
  OrderStatus,
  ExchangeName,
  ExchangeConnectorFactory,
  ExchangeCredentials,
} from './exchangeConnector.js';
import { SmartOrderRouter, RoutingConfig } from './smartOrderRouter.js';

export interface Execution {
  id: string;
  orderId: string;
  exchange: ExchangeName;
  quantity: number;
  price: number;
  timestamp: number;
  fee?: number;
  feeAsset?: string;
}

export interface OrderManagerConfig {
  routingConfig: RoutingConfig;
  autoRefreshInterval?: number; // milliseconds
  maxRetries?: number;
}

/**
 * Order Manager
 * Tracks and manages orders across multiple exchanges
 */
export class OrderManager {
  private orders: Map<string, Order> = new Map();
  private executions: Map<string, Execution[]> = new Map();
  private router: SmartOrderRouter;
  private config: OrderManagerConfig;
  private refreshInterval?: NodeJS.Timeout;

  constructor(config: OrderManagerConfig) {
    this.config = config;
    this.router = new SmartOrderRouter(config.routingConfig);
    
    if (config.autoRefreshInterval) {
      this.startAutoRefresh();
    }
  }

  /**
   * Place order through smart router
   */
  async placeOrder(
    symbol: string,
    side: 'buy' | 'sell',
    type: 'market' | 'limit' | 'stop' | 'stop_limit',
    quantity: number,
    price: number | undefined,
    stopPrice: number | undefined,
    credentials: Map<ExchangeName, ExchangeCredentials>,
    strategy?: string
  ): Promise<Order[]> {
    try {
      const orders = await this.router.routeOrder(
        symbol,
        side,
        type,
        quantity,
        price,
        stopPrice,
        credentials,
        strategy
      );

      // Store orders
      for (const order of orders) {
        this.orders.set(order.id, order);
        this.executions.set(order.id, []);
      }

      logger.info(`Placed ${orders.length} order(s) for ${symbol} ${side} ${quantity}`);
      return orders;
    } catch (error: any) {
      logger.error(`Failed to place order:`, error.message);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: string,
    credentials: Map<ExchangeName, ExchangeCredentials>
  ): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    try {
      const connector = ExchangeConnectorFactory.getConnector(order.exchange);
      const creds = credentials.get(order.exchange);
      
      if (!creds) {
        throw new Error(`No credentials for ${order.exchange}`);
      }

      const cancelled = await connector.cancelOrder(creds, orderId, order.symbol);
      
      if (cancelled) {
        order.status = 'cancelled';
        order.updatedAt = Date.now();
        this.orders.set(orderId, order);
      }

      return cancelled;
    } catch (error: any) {
      logger.error(`Failed to cancel order ${orderId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(
    orderId: string,
    credentials: Map<ExchangeName, ExchangeCredentials>
  ): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    try {
      const connector = ExchangeConnectorFactory.getConnector(order.exchange);
      const creds = credentials.get(order.exchange);
      
      if (!creds) {
        throw new Error(`No credentials for ${order.exchange}`);
      }

      const updatedOrder = await connector.getOrderStatus(creds, orderId, order.symbol);
      
      // Update stored order
      this.orders.set(orderId, updatedOrder);
      
      // Check for new executions
      if (updatedOrder.filledQuantity > order.filledQuantity) {
        await this.syncExecutions(orderId, credentials);
      }

      return updatedOrder;
    } catch (error: any) {
      logger.error(`Failed to get order status ${orderId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all orders
   */
  getOrders(filter?: {
    exchange?: ExchangeName;
    status?: OrderStatus;
    symbol?: string;
  }): Order[] {
    let orders = Array.from(this.orders.values());

    if (filter) {
      if (filter.exchange) {
        orders = orders.filter(o => o.exchange === filter.exchange);
      }
      if (filter.status) {
        orders = orders.filter(o => o.status === filter.status);
      }
      if (filter.symbol) {
        orders = orders.filter(o => o.symbol === filter.symbol);
      }
    }

    return orders.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get executions for an order
   */
  getExecutions(orderId: string): Execution[] {
    return this.executions.get(orderId) || [];
  }

  /**
   * Get all executions
   */
  getAllExecutions(): Execution[] {
    const allExecutions: Execution[] = [];
    for (const executions of this.executions.values()) {
      allExecutions.push(...executions);
    }
    return allExecutions.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Sync executions from exchange
   */
  private async syncExecutions(
    orderId: string,
    credentials: Map<ExchangeName, ExchangeCredentials>
  ): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) return;

    try {
      const connector = ExchangeConnectorFactory.getConnector(order.exchange);
      const creds = credentials.get(order.exchange);
      
      if (!creds) return;

      // Get order status to check fills
      const updatedOrder = await connector.getOrderStatus(creds, orderId, order.symbol);
      
      // Create execution records for new fills
      // Note: This is simplified - real implementation would fetch actual trade history
      if (updatedOrder.filledQuantity > order.filledQuantity) {
        const newFillQuantity = updatedOrder.filledQuantity - order.filledQuantity;
        const executions = this.executions.get(orderId) || [];
        
        executions.push({
          id: `${orderId}-${executions.length + 1}`,
          orderId,
          exchange: order.exchange,
          quantity: newFillQuantity,
          price: updatedOrder.averageFillPrice || order.price || 0,
          timestamp: Date.now(),
        });

        this.executions.set(orderId, executions);
      }
    } catch (error: any) {
      logger.warn(`Failed to sync executions for ${orderId}:`, error.message);
    }
  }

  /**
   * Start auto-refresh of order statuses
   */
  private startAutoRefresh(): void {
    if (!this.config.autoRefreshInterval) return;

    this.refreshInterval = setInterval(async () => {
      const openOrders = this.getOrders({ status: 'open' });
      
      for (const order of openOrders) {
        try {
          // Would need credentials passed in - simplified for now
          // await this.getOrderStatus(order.id, credentials);
        } catch (error: any) {
          logger.warn(`Auto-refresh failed for order ${order.id}:`, error.message);
        }
      }
    }, this.config.autoRefreshInterval);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  /**
   * Get order statistics
   */
  getStatistics(): {
    totalOrders: number;
    openOrders: number;
    filledOrders: number;
    cancelledOrders: number;
    totalVolume: number;
    totalFees: number;
  } {
    const orders = Array.from(this.orders.values());
    const allExecutions = this.getAllExecutions();

    return {
      totalOrders: orders.length,
      openOrders: orders.filter(o => o.status === 'open').length,
      filledOrders: orders.filter(o => o.status === 'filled').length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      totalVolume: allExecutions.reduce((sum, e) => sum + e.quantity * e.price, 0),
      totalFees: allExecutions.reduce((sum, e) => sum + (e.fee || 0), 0),
    };
  }
}

