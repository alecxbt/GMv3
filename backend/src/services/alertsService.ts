import { logger } from '../utils/logger.js';
import { EventEmitter } from 'events';

// In-memory alert storage (would use Redis/DB in production)
const alerts = new Map<string, Alert>();
const triggeredAlerts: TriggeredAlert[] = [];

export const alertEmitter = new EventEmitter();

export interface Alert {
  id: string;
  userId?: string;
  type: 'price' | 'volume' | 'whale' | 'sentiment' | 'technical' | 'news' | 'governance';
  asset: string;
  condition: AlertCondition;
  active: boolean;
  createdAt: number;
  triggeredAt?: number;
  notificationChannels: ('browser' | 'email' | 'webhook')[];
  metadata?: Record<string, any>;
}

export interface AlertCondition {
  operator: 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'percent_change' | 'equals';
  value: number;
  timeframe?: string; // e.g., '1h', '24h' for percent change
}

export interface TriggeredAlert {
  alertId: string;
  triggeredAt: number;
  triggerValue: number;
  conditionValue: number;
  message: string;
}

export interface AlertSummary {
  total: number;
  active: number;
  triggeredToday: number;
  byType: Record<string, number>;
}

/**
 * Create a new alert
 */
export function createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'active'>): Alert {
  const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const newAlert: Alert = {
    ...alert,
    id,
    createdAt: Date.now(),
    active: true,
  };

  alerts.set(id, newAlert);
  logger.info(`Created alert ${id} for ${alert.asset} (${alert.type})`);
  
  return newAlert;
}

/**
 * Get all alerts for a user
 */
export function getAlerts(userId?: string): Alert[] {
  const allAlerts = Array.from(alerts.values());
  
  if (userId) {
    return allAlerts.filter(a => a.userId === userId);
  }
  
  return allAlerts;
}

/**
 * Get alert by ID
 */
export function getAlert(alertId: string): Alert | undefined {
  return alerts.get(alertId);
}

/**
 * Update an alert
 */
export function updateAlert(alertId: string, updates: Partial<Alert>): Alert | null {
  const alert = alerts.get(alertId);
  
  if (!alert) {
    return null;
  }

  const updated = { ...alert, ...updates };
  alerts.set(alertId, updated);
  logger.info(`Updated alert ${alertId}`);
  
  return updated;
}

/**
 * Delete an alert
 */
export function deleteAlert(alertId: string): boolean {
  const deleted = alerts.delete(alertId);
  
  if (deleted) {
    logger.info(`Deleted alert ${alertId}`);
  }
  
  return deleted;
}

/**
 * Check if an alert condition is met
 */
export function checkAlertCondition(
  alert: Alert,
  currentValue: number,
  previousValue?: number
): boolean {
  const { condition } = alert;

  switch (condition.operator) {
    case 'above':
      return currentValue > condition.value;
    
    case 'below':
      return currentValue < condition.value;
    
    case 'crosses_above':
      if (previousValue === undefined) return false;
      return previousValue <= condition.value && currentValue > condition.value;
    
    case 'crosses_below':
      if (previousValue === undefined) return false;
      return previousValue >= condition.value && currentValue < condition.value;
    
    case 'percent_change':
      if (previousValue === undefined || previousValue === 0) return false;
      const percentChange = ((currentValue - previousValue) / previousValue) * 100;
      return Math.abs(percentChange) >= Math.abs(condition.value);
    
    case 'equals':
      return Math.abs(currentValue - condition.value) < 0.0001;
    
    default:
      return false;
  }
}

/**
 * Trigger an alert
 */
export function triggerAlert(
  alert: Alert,
  triggerValue: number,
  message?: string
): TriggeredAlert {
  const triggered: TriggeredAlert = {
    alertId: alert.id,
    triggeredAt: Date.now(),
    triggerValue,
    conditionValue: alert.condition.value,
    message: message || generateAlertMessage(alert, triggerValue),
  };

  triggeredAlerts.unshift(triggered);
  
  // Keep only last 1000 triggered alerts
  if (triggeredAlerts.length > 1000) {
    triggeredAlerts.pop();
  }

  // Update alert
  const updated = updateAlert(alert.id, { triggeredAt: Date.now() });
  
  // Emit event for real-time notifications
  alertEmitter.emit('alert:triggered', { alert: updated, triggered });
  
  logger.info(`Alert ${alert.id} triggered: ${triggered.message}`);
  
  return triggered;
}

/**
 * Generate alert message
 */
function generateAlertMessage(alert: Alert, currentValue: number): string {
  const { type, asset, condition } = alert;
  
  switch (type) {
    case 'price':
      return `${asset} price ${condition.operator.replace('_', ' ')} $${condition.value.toLocaleString()} (current: $${currentValue.toLocaleString()})`;
    
    case 'volume':
      return `${asset} volume ${condition.operator.replace('_', ' ')} ${condition.value.toLocaleString()} (current: ${currentValue.toLocaleString()})`;
    
    case 'whale':
      return `Whale movement detected for ${asset}: ${currentValue.toLocaleString()} transferred`;
    
    case 'sentiment':
      return `${asset} sentiment ${condition.operator.replace('_', ' ')} ${condition.value} (current: ${currentValue})`;
    
    case 'technical':
      return `${asset} technical indicator triggered: ${condition.operator} ${condition.value}`;
    
    case 'news':
      return `Breaking news alert for ${asset}`;
    
    case 'governance':
      return `Governance alert for ${asset}: proposal activity`;
    
    default:
      return `Alert triggered for ${asset}`;
  }
}

/**
 * Get triggered alerts
 */
export function getTriggeredAlerts(limit: number = 50): TriggeredAlert[] {
  return triggeredAlerts.slice(0, limit);
}

/**
 * Get alert summary
 */
export function getAlertSummary(userId?: string): AlertSummary {
  const userAlerts = getAlerts(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  const byType: Record<string, number> = {};
  let active = 0;

  for (const alert of userAlerts) {
    if (alert.active) active++;
    byType[alert.type] = (byType[alert.type] || 0) + 1;
  }

  const triggeredToday = triggeredAlerts.filter(
    t => t.triggeredAt >= todayTimestamp
  ).length;

  return {
    total: userAlerts.length,
    active,
    triggeredToday,
    byType,
  };
}

/**
 * Create common alert presets
 */
export const AlertPresets = {
  priceAbove: (asset: string, price: number): Omit<Alert, 'id' | 'createdAt' | 'active'> => ({
    type: 'price',
    asset,
    condition: { operator: 'above', value: price },
    notificationChannels: ['browser'],
  }),

  priceBelow: (asset: string, price: number): Omit<Alert, 'id' | 'createdAt' | 'active'> => ({
    type: 'price',
    asset,
    condition: { operator: 'below', value: price },
    notificationChannels: ['browser'],
  }),

  percentChange: (asset: string, percent: number, timeframe: string = '24h'): Omit<Alert, 'id' | 'createdAt' | 'active'> => ({
    type: 'price',
    asset,
    condition: { operator: 'percent_change', value: percent, timeframe },
    notificationChannels: ['browser'],
  }),

  volumeSpike: (asset: string, threshold: number): Omit<Alert, 'id' | 'createdAt' | 'active'> => ({
    type: 'volume',
    asset,
    condition: { operator: 'above', value: threshold },
    notificationChannels: ['browser'],
  }),

  whaleAlert: (asset: string, minValue: number = 1000000): Omit<Alert, 'id' | 'createdAt' | 'active'> => ({
    type: 'whale',
    asset,
    condition: { operator: 'above', value: minValue },
    notificationChannels: ['browser'],
    metadata: { minValueUsd: minValue },
  }),

  sentimentShift: (asset: string, threshold: number = 30): Omit<Alert, 'id' | 'createdAt' | 'active'> => ({
    type: 'sentiment',
    asset,
    condition: { operator: 'crosses_above', value: threshold },
    notificationChannels: ['browser'],
  }),
};

/**
 * Check price alerts against current prices
 * This would be called periodically by a background job
 */
export async function checkPriceAlerts(prices: Map<string, { current: number; previous?: number }>): Promise<TriggeredAlert[]> {
  const triggered: TriggeredAlert[] = [];
  
  for (const alert of alerts.values()) {
    if (!alert.active || alert.type !== 'price') continue;
    
    const priceData = prices.get(alert.asset.toUpperCase());
    if (!priceData) continue;
    
    const shouldTrigger = checkAlertCondition(alert, priceData.current, priceData.previous);
    
    if (shouldTrigger) {
      const triggeredAlert = triggerAlert(alert, priceData.current);
      triggered.push(triggeredAlert);
      
      // Optionally disable one-time alerts
      if (!alert.metadata?.recurring) {
        updateAlert(alert.id, { active: false });
      }
    }
  }
  
  return triggered;
}

// Initialize some sample alerts for demo
export function initializeSampleAlerts(): void {
  const samples = [
    AlertPresets.priceAbove('BTC', 100000),
    AlertPresets.priceBelow('BTC', 35000),
    AlertPresets.percentChange('ETH', 10, '24h'),
    AlertPresets.whaleAlert('ETH', 5000000),
    AlertPresets.volumeSpike('SOL', 1000000000),
  ];

  for (const sample of samples) {
    createAlert(sample);
  }
  
  logger.info('Initialized sample alerts');
}

