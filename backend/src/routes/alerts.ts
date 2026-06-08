import { Router } from 'express';
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

const router = Router();

// Get all alerts
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    logger.info('GET /alerts');
    
    const alerts = getAlerts(userId as string | undefined);
    res.json({ alerts });
  } catch (error: any) {
    logger.error('Get alerts error:', error);
    res.status(500).json({
      error: 'Failed to fetch alerts',
      message: error.message,
    });
  }
});

// Get alert summary
router.get('/summary', async (req, res) => {
  try {
    const { userId } = req.query;
    logger.info('GET /alerts/summary');
    
    const summary = getAlertSummary(userId as string | undefined);
    res.json(summary);
  } catch (error: any) {
    logger.error('Get alert summary error:', error);
    res.status(500).json({
      error: 'Failed to fetch alert summary',
      message: error.message,
    });
  }
});

// Get triggered alerts
router.get('/triggered', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    logger.info('GET /alerts/triggered');
    
    const triggered = getTriggeredAlerts(parseInt(limit as string));
    res.json({ triggered });
  } catch (error: any) {
    logger.error('Get triggered alerts error:', error);
    res.status(500).json({
      error: 'Failed to fetch triggered alerts',
      message: error.message,
    });
  }
});

// Get alert presets
router.get('/presets', async (req, res) => {
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
    
    res.json({ presets });
  } catch (error: any) {
    logger.error('Get presets error:', error);
    res.status(500).json({
      error: 'Failed to fetch presets',
      message: error.message,
    });
  }
});

// Get single alert
router.get('/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    logger.info(`GET /alerts/${alertId}`);
    
    const alert = getAlert(alertId);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(alert);
  } catch (error: any) {
    logger.error('Get alert error:', error);
    res.status(500).json({
      error: 'Failed to fetch alert',
      message: error.message,
    });
  }
});

// Create new alert
router.post('/', async (req, res) => {
  try {
    const { type, asset, condition, notificationChannels, userId, metadata } = req.body;
    logger.info('POST /alerts');
    
    if (!type || !asset || !condition) {
      return res.status(400).json({
        error: 'Missing required fields: type, asset, condition',
      });
    }
    
    const alert = createAlert({
      type,
      asset,
      condition,
      notificationChannels: notificationChannels || ['browser'],
      userId,
      metadata,
    });
    
    res.status(201).json(alert);
  } catch (error: any) {
    logger.error('Create alert error:', error);
    res.status(500).json({
      error: 'Failed to create alert',
      message: error.message,
    });
  }
});

// Create alert from preset
router.post('/preset/:presetType', async (req, res) => {
  try {
    const { presetType } = req.params;
    const { asset, ...params } = req.body;
    logger.info(`POST /alerts/preset/${presetType}`);
    
    if (!asset) {
      return res.status(400).json({ error: 'Asset is required' });
    }
    
    let alertData;
    switch (presetType) {
      case 'priceAbove':
        if (!params.price) return res.status(400).json({ error: 'Price is required' });
        alertData = AlertPresets.priceAbove(asset, params.price);
        break;
      case 'priceBelow':
        if (!params.price) return res.status(400).json({ error: 'Price is required' });
        alertData = AlertPresets.priceBelow(asset, params.price);
        break;
      case 'percentChange':
        if (!params.percent) return res.status(400).json({ error: 'Percent is required' });
        alertData = AlertPresets.percentChange(asset, params.percent, params.timeframe);
        break;
      case 'volumeSpike':
        if (!params.threshold) return res.status(400).json({ error: 'Threshold is required' });
        alertData = AlertPresets.volumeSpike(asset, params.threshold);
        break;
      case 'whaleAlert':
        alertData = AlertPresets.whaleAlert(asset, params.minValue);
        break;
      case 'sentimentShift':
        alertData = AlertPresets.sentimentShift(asset, params.threshold);
        break;
      default:
        return res.status(400).json({ error: 'Invalid preset type' });
    }
    
    const alert = createAlert(alertData);
    res.status(201).json(alert);
  } catch (error: any) {
    logger.error('Create preset alert error:', error);
    res.status(500).json({
      error: 'Failed to create alert',
      message: error.message,
    });
  }
});

// Update alert
router.put('/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    const updates = req.body;
    logger.info(`PUT /alerts/${alertId}`);
    
    const alert = updateAlert(alertId, updates);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(alert);
  } catch (error: any) {
    logger.error('Update alert error:', error);
    res.status(500).json({
      error: 'Failed to update alert',
      message: error.message,
    });
  }
});

// Toggle alert active status
router.patch('/:alertId/toggle', async (req, res) => {
  try {
    const { alertId } = req.params;
    logger.info(`PATCH /alerts/${alertId}/toggle`);
    
    const existing = getAlert(alertId);
    if (!existing) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    const alert = updateAlert(alertId, { active: !existing.active });
    res.json(alert);
  } catch (error: any) {
    logger.error('Toggle alert error:', error);
    res.status(500).json({
      error: 'Failed to toggle alert',
      message: error.message,
    });
  }
});

// Delete alert
router.delete('/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    logger.info(`DELETE /alerts/${alertId}`);
    
    const deleted = deleteAlert(alertId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json({ success: true, message: 'Alert deleted' });
  } catch (error: any) {
    logger.error('Delete alert error:', error);
    res.status(500).json({
      error: 'Failed to delete alert',
      message: error.message,
    });
  }
});

export { router as alertsRoutes };

