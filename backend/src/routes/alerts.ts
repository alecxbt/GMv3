import { Hono } from 'hono';
import { logger } from '../utils/logger.js';
import {
  createAlert,
  getAlerts,
  getAlert,
  updateAlert,
  deleteAlert,
  getTriggeredAlerts,
  getAlertSummary,
  AlertPresets,
} from '../services/alertsService.js';

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  Bindings: Env;
};

const router = new Hono<{ Bindings: Env }>();

// Get all alerts
router.get('/', async (c) => {
  try {
    const { userId } = c.req.query();
    logger.info('GET /alerts');
    
    const alerts = getAlerts(userId as string | undefined);
    return c.json({ alerts });
  } catch (error: any) {
    logger.error('Get alerts error:', error);
    return c.json({
      error: 'Failed to fetch alerts',
      message: error.message,
    }, 500);
  }
});

// Get alert summary
router.get('/summary', async (c) => {
  try {
    const { userId } = c.req.query();
    logger.info('GET /alerts/summary');
    
    const summary = getAlertSummary(userId as string | undefined);
    return c.json(summary);
  } catch (error: any) {
    logger.error('Get alert summary error:', error);
    return c.json({
      error: 'Failed to fetch alert summary',
      message: error.message,
    }, 500);
  }
});

// Get triggered alerts
router.get('/triggered', async (c) => {
  try {
    const { limit } = c.req.query();
    logger.info('GET /alerts/triggered');
    
    const triggered = getTriggeredAlerts(parseInt(limit as string) || 50);
    return c.json({ triggered });
  } catch (error: any) {
    logger.error('Get triggered alerts error:', error);
    return c.json({
      error: 'Failed to fetch triggered alerts',
      message: error.message,
    }, 500);
  }
});

// Get alert presets
router.get('/presets', async (c) => {
  try {
    logger.info('GET /alerts/presets');
    
    // Return preset types and examples
    const presets = {
      priceAbove: {
        description: 'Alert when price goes above a value',
        example: { asset: 'BTC', price: 50000 },
      },
      priceBelow: {
        description: 'Alert when price goes below a value',
        example: { asset: 'BTC', price: 40000 },
      },
      percentChange: {
        description: 'Alert when price changes by a percentage',
        example: { asset: 'ETH', percent: 10, timeframe: '24h' },
      },
      volumeSpike: {
        description: 'Alert when volume exceeds threshold',
        example: { asset: 'SOL', threshold: 1000000000 },
      },
      whaleAlert: {
        description: 'Alert on large transactions',
        example: { asset: 'ETH', minValue: 1000000 },
      },
      sentimentShift: {
        description: 'Alert on sentiment changes',
        example: { asset: 'BTC', threshold: 30 },
      },
    };
    
    return c.json({ presets });
  } catch (error: any) {
    logger.error('Get presets error:', error);
    return c.json({
      error: 'Failed to fetch presets',
      message: error.message,
    }, 500);
  }
});

// Get single alert
router.get('/:alertId', async (c) => {
  try {
    const { alertId } = c.req.param();
    logger.info(`GET /alerts/${alertId}`);
    
    const alert = getAlert(alertId);
    
    if (!alert) {
      return c.json({ error: 'Alert not found' }, 404);
    }
    
    return c.json(alert);
  } catch (error: any) {
    logger.error('Get alert error:', error);
    return c.json({
      error: 'Failed to fetch alert',
      message: error.message,
    }, 500);
  }
});

// Create new alert
router.post('/', async (c) => {
  try {
    const body = await c.req.parseBody();
    const { type, asset, condition, notificationChannels, userId, metadata } = body as {
      type?: string;
      asset?: string;
      condition?: string;
      notificationChannels?: string[];
      userId?: string;
      metadata?: any;
    };
    logger.info('POST /alerts');
    
    if (!type || !asset || !condition) {
      return c.json({
        error: 'Missing required fields: type, asset, condition',
      }, 400);
    }
    
    const alert = createAlert({
      type,
      asset,
      condition,
      notificationChannels: notificationChannels || ['browser'],
      userId,
      metadata,
    });
    
    return c.json(alert, 201);
  } catch (error: any) {
    logger.error('Create alert error:', error);
    return c.json({
      error: 'Failed to create alert',
      message: error.message,
    }, 500);
  }
});

// Create alert from preset
router.post('/preset/:presetType', async (c) => {
  try {
    const { presetType } = c.req.param();
    const body = await c.req.parseBody();
    const { asset, ...params } = body as { asset?: string; [key: string]: any };
    logger.info(`POST /alerts/preset/${presetType}`);
    
    if (!asset) {
      return c.json({ error: 'Asset is required' }, 400);
    }
    
    let alertData;
    switch (presetType) {
      case 'priceAbove':
        if (!params.price) return c.json({ error: 'Price is required' }, 400);
        alertData = AlertPresets.priceAbove(asset, params.price);
        break;
      case 'priceBelow':
        if (!params.price) return c.json({ error: 'Price is required' }, 400);
        alertData = AlertPresets.priceBelow(asset, params.price);
        break;
      case 'percentChange':
        if (!params.percent) return c.json({ error: 'Percent is required' }, 400);
        alertData = AlertPresets.percentChange(asset, params.percent, params.timeframe);
        break;
      case 'volumeSpike':
        if (!params.threshold) return c.json({ error: 'Threshold is required' }, 400);
        alertData = AlertPresets.volumeSpike(asset, params.threshold);
        break;
      case 'whaleAlert':
        alertData = AlertPresets.whaleAlert(asset, params.minValue);
        break;
      case 'sentimentShift':
        alertData = AlertPresets.sentimentShift(asset, params.threshold);
        break;
      default:
        return c.json({ error: 'Invalid preset type' }, 400);
    }
    
    const alert = createAlert(alertData);
    return c.json(alert, 201);
  } catch (error: any) {
    logger.error('Create preset alert error:', error);
    return c.json({
      error: 'Failed to create alert',
      message: error.message,
    }, 500);
  }
});

// Update alert
router.put('/:alertId', async (c) => {
  try {
    const { alertId } = c.req.param();
    const body = await c.req.parseBody();
    const updates = body as { [key: string]: any };
    logger.info(`PUT /alerts/${alertId}`);
    
    const alert = updateAlert(alertId, updates);
    
    if (!alert) {
      return c.json({ error: 'Alert not found' }, 404);
    }
    
    return c.json(alert);
  } catch (error: any) {
    logger.error('Update alert error:', error);
    return c.json({
      error: 'Failed to update alert',
      message: error.message,
    }, 500);
  }
});

// Toggle alert active status
router.patch('/:alertId/toggle', async (c) => {
  try {
    const { alertId } = c.req.param();
    logger.info(`PATCH /alerts/${alertId}/toggle`);
    
    const existing = getAlert(alertId);
    if (!existing) {
      return c.json({ error: 'Alert not found' }, 404);
    }
    
    const alert = updateAlert(alertId, { active: !existing.active });
    return c.json(alert);
  } catch (error: any) {
    logger.error('Toggle alert error:', error);
    return c.json({
      error: 'Failed to toggle alert',
      message: error.message,
    }, 500);
  }
});

// Delete alert
router.delete('/:alertId', async (c) => {
  try {
    const { alertId } = c.req.param();
    logger.info(`DELETE /alerts/${alertId}`);
    
    const deleted = deleteAlert(alertId);
    
    if (!deleted) {
      return c.json({ error: 'Alert not found' }, 404);
    }
    
    return c.json({ success: true, message: 'Alert deleted' });
  } catch (error: any) {
    logger.error('Delete alert error:', error);
    return c.json({
      error: 'Failed to delete alert',
      message: error.message,
    }, 500);
  }
});

export { router as alertsRoutes };