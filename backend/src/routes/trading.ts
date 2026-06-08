import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { OrderManager, OrderManagerConfig } from '../services/orderManager.js';
import { SmartOrderRouter, RoutingConfig } from '../services/smartOrderRouter.js';
import { ExchangeConnectorFactory, ExchangeName, ExchangeCredentials } from '../services/exchangeConnector.js';

const router = Router();

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
router.post('/order', async (req, res) => {
  try {
    const { symbol, side, type, quantity, price, stopPrice, strategy, userId } = req.body;

    if (!symbol || !side || !type || !quantity || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const credentials = getUserCredentials(userId);
    if (credentials.size === 0) {
      return res.status(400).json({ error: 'No exchange credentials configured' });
    }

    const manager = getOrderManager();
    const orders = await manager.placeOrder(
      symbol,
      side,
      type,
      quantity,
      price,
      stopPrice,
      credentials,
      strategy
    );

    logger.info(`Order placed: ${orders.length} order(s) for ${symbol}`);
    res.json({ success: true, orders });
  } catch (error: any) {
    logger.error('Place order error:', error);
    res.status(500).json({
      error: 'Failed to place order',
      message: error.message,
    });
  }
});

// Cancel order
router.post('/order/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const credentials = getUserCredentials(userId);
    const manager = getOrderManager();
    const cancelled = await manager.cancelOrder(orderId, credentials);

    res.json({ success: cancelled });
  } catch (error: any) {
    logger.error('Cancel order error:', error);
    res.status(500).json({
      error: 'Failed to cancel order',
      message: error.message,
    });
  }
});

// Get order status
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const credentials = getUserCredentials(userId as string);
    const manager = getOrderManager();
    const order = await manager.getOrderStatus(orderId, credentials);

    res.json(order);
  } catch (error: any) {
    logger.error('Get order status error:', error);
    res.status(500).json({
      error: 'Failed to get order status',
      message: error.message,
    });
  }
});

// Get all orders
router.get('/orders', async (req, res) => {
  try {
    const { userId, exchange, status, symbol } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const manager = getOrderManager();
    const orders = manager.getOrders({
      exchange: exchange as ExchangeName | undefined,
      status: status as any,
      symbol: symbol as string | undefined,
    });

    res.json({ orders });
  } catch (error: any) {
    logger.error('Get orders error:', error);
    res.status(500).json({
      error: 'Failed to get orders',
      message: error.message,
    });
  }
});

// Get order executions
router.get('/order/:orderId/executions', async (req, res) => {
  try {
    const { orderId } = req.params;
    const manager = getOrderManager();
    const executions = manager.getExecutions(orderId);

    res.json({ executions });
  } catch (error: any) {
    logger.error('Get executions error:', error);
    res.status(500).json({
      error: 'Failed to get executions',
      message: error.message,
    });
  }
});

// Get best execution price
router.get('/best-price', async (req, res) => {
  try {
    const { symbol, side, quantity, userId } = req.query;

    if (!symbol || !side || !quantity || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const credentials = getUserCredentials(userId as string);
    if (credentials.size === 0) {
      return res.status(400).json({ error: 'No exchange credentials configured' });
    }

    const router = new SmartOrderRouter({
      enabledExchanges: ['binance', 'coinbase', 'kraken'],
      defaultStrategy: 'best_price',
    });

    const bestPrice = await router.getBestExecutionPrice(
      symbol as string,
      side as 'buy' | 'sell',
      parseFloat(quantity as string),
      credentials
    );

    if (!bestPrice) {
      return res.status(404).json({ error: 'No price data available' });
    }

    res.json(bestPrice);
  } catch (error: any) {
    logger.error('Get best price error:', error);
    res.status(500).json({
      error: 'Failed to get best price',
      message: error.message,
    });
  }
});

// Get order statistics
router.get('/statistics', async (req, res) => {
  try {
    const manager = getOrderManager();
    const stats = manager.getStatistics();

    res.json(stats);
  } catch (error: any) {
    logger.error('Get statistics error:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message,
    });
  }
});

export { router as tradingRoutes };

