import { Hono } from 'hono';
import { logger } from '../utils/logger.js';
import { OrderManager, OrderManagerConfig } from '../services/orderManager.js';
import { SmartOrderRouter, RoutingConfig } from '../services/smartOrderRouter.js';
import { ExchangeConnectorFactory, ExchangeName, ExchangeCredentials } from '../services/exchangeConnector.js';

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  Bindings: Env;
};

const router = new Hono<{ Bindings: Env }>();

// Initialize order manager (in production, this would be a singleton)
let orderManager: OrderManager | null = null;

function getOrderManager(): OrderManager {
  if (!orderManager) {
    const routingConfig: RoutingConfig = {
      enabledExchanges: ['binance', 'coinbase', 'kraken'],
      defaultStrategy: 'best_price',
      slippageTolerance: 1.0, // 1%
    };

    const config: OrderManagerConfig = {
      routingConfig,
      autoRefreshInterval: 30000, // 30 seconds
    };

    orderManager = new OrderManager(config);
  }
  return orderManager;
}

// Helper to get user credentials (simplified - would use actual auth)
function getUserCredentials(userId: string): Map<ExchangeName, ExchangeCredentials> {
  // In production, fetch from database and decrypt
  const credentials = new Map<ExchangeName, ExchangeCredentials>();
  
  // Placeholder - would fetch from ExchangeConnection model
  // For now, return empty map (user needs to configure exchanges)
  
  return credentials;
}

// Place order
router.post('/order', async (c) => {
  try {
    const body = await c.req.parseBody();
    const { symbol, side, type, quantity, price, stopPrice, strategy, userId } = body as {
      symbol?: string;
      side?: string;
      type?: string;
      quantity?: string;
      price?: string;
      stopPrice?: string;
      strategy?: string;
      userId?: string;
    };

    if (!symbol || !side || !type || !quantity || !userId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const credentials = getUserCredentials(userId);
    if (credentials.size === 0) {
      return c.json({ error: 'No exchange credentials configured' }, 400);
    }

    const manager = getOrderManager();
    const orders = await manager.placeOrder(
      symbol,
      side,
      type,
      quantity,
      price ? parseFloat(price) : undefined,
      stopPrice ? parseFloat(stopPrice) : undefined,
      credentials,
      strategy
    );

    logger.info(`Order placed: ${orders.length} order(s) for ${symbol}`);
    return c.json({ success: true, orders });
  } catch (error: any) {
    logger.error('Place order error:', error);
    return c.json({
      error: 'Failed to place order',
      message: error.message,
    }, 500);
  }
});

// Cancel order
router.post('/order/:orderId/cancel', async (c) => {
  try {
    const { orderId } = c.req.param();
    const body = await c.req.parseBody();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return c.json({ error: 'userId required' }, 400);
    }

    const credentials = getUserCredentials(userId);
    const manager = getOrderManager();
    const cancelled = await manager.cancelOrder(orderId, credentials);

    return c.json({ success: cancelled });
  } catch (error: any) {
    logger.error('Cancel order error:', error);
    return c.json({
      error: 'Failed to cancel order',
      message: error.message,
    }, 500);
  }
});

// Get order status
router.get('/order/:orderId', async (c) => {
  try {
    const { orderId } = c.req.param();
    const { userId } = c.req.query();

    if (!userId) {
      return c.json({ error: 'userId required' }, 400);
    }

    const credentials = getUserCredentials(userId as string);
    const manager = getOrderManager();
    const order = await manager.getOrderStatus(orderId, credentials);

    return c.json(order);
  } catch (error: any) {
    logger.error('Get order status error:', error);
    return c.json({
      error: 'Failed to get order status',
      message: error.message,
    }, 500);
  }
});

// Get all orders
router.get('/orders', async (c) => {
  try {
    const { userId, exchange, status, symbol } = c.req.query();

    if (!userId) {
      return c.json({ error: 'userId required' }, 400);
    }

    const manager = getOrderManager();
    const orders = manager.getOrders({
      exchange: exchange as ExchangeName | undefined,
      status: status as any,
      symbol: symbol as string | undefined,
    });

    return c.json({ orders });
  } catch (error: any) {
    logger.error('Get orders error:', error);
    return c.json({
      error: 'Failed to get orders',
      message: error.message,
    }, 500);
  }
});

// Get order executions
router.get('/order/:orderId/executions', async (c) => {
  try {
    const { orderId } = c.req.param();
    const manager = getOrderManager();
    const executions = manager.getExecutions(orderId);

    return c.json({ executions });
  } catch (error: any) {
    logger.error('Get executions error:', error);
    return c.json({
      error: 'Failed to get executions',
      message: error.message,
    }, 500);
  }
});

// Get best execution price
router.get('/best-price', async (c) => {
  try {
    const { symbol, side, quantity, userId } = c.req.query();

    if (!symbol || !side || !quantity || !userId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const credentials = getUserCredentials(userId as string);
    if (credentials.size === 0) {
      return c.json({ error: 'No exchange credentials configured' }, 400);
    }

    const smartRouter = new SmartOrderRouter({
      enabledExchanges: ['binance', 'coinbase', 'kraken'],
      defaultStrategy: 'best_price',
    });

    const bestPrice = await smartRouter.getBestExecutionPrice(
      symbol as string,
      side as 'buy' | 'sell',
      parseFloat(quantity as string),
      credentials
    );

    if (!bestPrice) {
      return c.json({ error: 'No price data available' }, 404);
    }

    return c.json(bestPrice);
  } catch (error: any) {
    logger.error('Get best price error:', error);
    return c.json({
      error: 'Failed to get best price',
      message: error.message,
    }, 500);
  }
});

// Get order statistics
router.get('/statistics', async (c) => {
  try {
    const manager = getOrderManager();
    const stats = manager.getStatistics();

    return c.json(stats);
  } catch (error: any) {
    logger.error('Get statistics error:', error);
    return c.json({
      error: 'Failed to get statistics',
      message: error.message,
    }, 500);
  }
});

export { router as tradingRoutes };