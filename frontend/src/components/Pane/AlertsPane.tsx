import { useEffect, useState } from 'react';
import type { Pane } from '@shared/types';
import api from '../../services/api';

interface Alert {
  id: string;
  type: string;
  asset: string;
  condition: {
    operator: string;
    value: number;
    timeframe?: string;
  };
  active: boolean;
  createdAt: number;
  triggeredAt?: number;
}

interface TriggeredAlert {
  alertId: string;
  triggeredAt: number;
  triggerValue: number;
  conditionValue: number;
  message: string;
}

interface AlertSummary {
  total: number;
  active: number;
  triggeredToday: number;
  byType: Record<string, number>;
}

interface AlertsPaneProps {
  pane: Pane;
}

export function AlertsPane({ pane }: AlertsPaneProps) {
  const [activeTab, setActiveTab] = useState<'alerts' | 'triggered' | 'create'>('alerts');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [triggered, setTriggered] = useState<TriggeredAlert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create alert form state
  const [newAlert, setNewAlert] = useState({
    type: 'price',
    asset: 'BTC',
    operator: 'above',
    value: '',
    timeframe: '24h',
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [alertsRes, triggeredRes, summaryRes] = await Promise.all([
          api.get('/alerts'),
          api.get('/alerts/triggered', { params: { limit: 50 } }),
          api.get('/alerts/summary'),
        ]);
        setAlerts(alertsRes.data.alerts || []);
        setTriggered(triggeredRes.data.triggered || []);
        setSummary(summaryRes.data);
      } catch (err: any) {
        console.error('Failed to fetch alerts:', err);
        setError(err.response?.data?.error || 'Failed to load alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/alerts', {
        type: newAlert.type,
        asset: newAlert.asset.toUpperCase(),
        condition: {
          operator: newAlert.operator,
          value: parseFloat(newAlert.value),
          timeframe: newAlert.type === 'price' && newAlert.operator === 'percent_change' ? newAlert.timeframe : undefined,
        },
        notificationChannels: ['browser'],
      });
      
      // Refresh alerts
      const response = await api.get('/alerts');
      setAlerts(response.data.alerts || []);
      setActiveTab('alerts');
      setNewAlert({ ...newAlert, value: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create alert');
    }
  };

  const handleToggleAlert = async (alertId: string) => {
    try {
      await api.patch(`/alerts/${alertId}/toggle`);
      const response = await api.get('/alerts');
      setAlerts(response.data.alerts || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle alert');
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await api.delete(`/alerts/${alertId}`);
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete alert');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'price': return '💰';
      case 'volume': return '📊';
      case 'whale': return '🐋';
      case 'sentiment': return '😀';
      case 'news': return '📰';
      case 'governance': return '🗳️';
      default: return '🔔';
    }
  };

  const getOperatorLabel = (operator: string) => {
    switch (operator) {
      case 'above': return '>';
      case 'below': return '<';
      case 'crosses_above': return '↗️';
      case 'crosses_below': return '↘️';
      case 'percent_change': return '±%';
      default: return operator;
    }
  };

  const formatValue = (value: number, type: string, operator: string) => {
    if (operator === 'percent_change') return `${value}%`;
    if (type === 'price' || type === 'whale') return `$${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '8px 16px',
    background: isActive ? 'var(--terminal-accent)' : 'transparent',
    border: '1px solid var(--terminal-border)',
    borderRadius: '4px',
    color: 'var(--terminal-text)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: isActive ? 'bold' : 'normal',
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--terminal-text)' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid var(--terminal-border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('alerts')} style={tabStyle(activeTab === 'alerts')}>🔔 My Alerts</button>
        <button onClick={() => setActiveTab('triggered')} style={tabStyle(activeTab === 'triggered')}>⚡ Triggered</button>
        <button onClick={() => setActiveTab('create')} style={tabStyle(activeTab === 'create')}>➕ Create</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--terminal-dim)' }}>Loading...</div>}
        {error && <div style={{ padding: '12px', background: 'var(--terminal-error)', color: 'white', borderRadius: '4px', marginBottom: '12px' }}>{error}</div>}

        {/* Summary Cards */}
        {summary && activeTab === 'alerts' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', background: 'var(--terminal-bg-secondary)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{summary.total}</div>
              <div style={{ fontSize: '10px', color: 'var(--terminal-dim)' }}>Total Alerts</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--terminal-bg-secondary)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--terminal-success)' }}>{summary.active}</div>
              <div style={{ fontSize: '10px', color: 'var(--terminal-dim)' }}>Active</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--terminal-bg-secondary)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--terminal-warning)' }}>{summary.triggeredToday}</div>
              <div style={{ fontSize: '10px', color: 'var(--terminal-dim)' }}>Triggered Today</div>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && !loading && (
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>🔔 Your Alerts</h3>
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--terminal-dim)', padding: '40px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</div>
                <div>No alerts configured</div>
                <button
                  onClick={() => setActiveTab('create')}
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    background: 'var(--terminal-accent)',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Create Your First Alert
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      padding: '12px',
                      background: 'var(--terminal-bg-secondary)',
                      borderRadius: '8px',
                      border: `1px solid ${alert.active ? 'var(--terminal-accent)' : 'var(--terminal-border)'}`,
                      opacity: alert.active ? 1 : 0.6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>{getTypeIcon(alert.type)}</span>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                            {alert.asset} {getOperatorLabel(alert.condition.operator)} {formatValue(alert.condition.value, alert.type, alert.condition.operator)}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--terminal-dim)' }}>
                            {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert
                            {alert.condition.timeframe && ` (${alert.condition.timeframe})`}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleToggleAlert(alert.id)}
                          style={{
                            padding: '4px 8px',
                            background: alert.active ? 'var(--terminal-success)' : 'var(--terminal-border)',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '10px',
                          }}
                        >
                          {alert.active ? 'ON' : 'OFF'}
                        </button>
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          style={{
                            padding: '4px 8px',
                            background: 'var(--terminal-error)',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '10px',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {alert.triggeredAt && (
                      <div style={{ fontSize: '10px', color: 'var(--terminal-warning)', marginTop: '8px' }}>
                        Last triggered: {new Date(alert.triggeredAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'triggered' && !loading && (
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>⚡ Recently Triggered Alerts</h3>
            {triggered.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--terminal-dim)', padding: '40px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
                <div>No alerts triggered yet</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {triggered.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px',
                      background: 'var(--terminal-bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--terminal-warning)',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{t.message}</div>
                    <div style={{ fontSize: '10px', color: 'var(--terminal-dim)' }}>
                      {new Date(t.triggeredAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '16px' }}>➕ Create New Alert</h3>
            <form onSubmit={handleCreateAlert} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--terminal-dim)', display: 'block', marginBottom: '4px' }}>Alert Type</label>
                <select
                  value={newAlert.type}
                  onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--terminal-bg-secondary)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    color: 'var(--terminal-text)',
                    fontSize: '12px',
                  }}
                >
                  <option value="price">💰 Price Alert</option>
                  <option value="volume">📊 Volume Alert</option>
                  <option value="whale">🐋 Whale Alert</option>
                  <option value="sentiment">😀 Sentiment Alert</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--terminal-dim)', display: 'block', marginBottom: '4px' }}>Asset</label>
                <input
                  type="text"
                  value={newAlert.asset}
                  onChange={(e) => setNewAlert({ ...newAlert, asset: e.target.value.toUpperCase() })}
                  placeholder="BTC, ETH, SOL..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--terminal-bg-secondary)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    color: 'var(--terminal-text)',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--terminal-dim)', display: 'block', marginBottom: '4px' }}>Condition</label>
                <select
                  value={newAlert.operator}
                  onChange={(e) => setNewAlert({ ...newAlert, operator: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--terminal-bg-secondary)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    color: 'var(--terminal-text)',
                    fontSize: '12px',
                  }}
                >
                  <option value="above">Price Above</option>
                  <option value="below">Price Below</option>
                  <option value="crosses_above">Crosses Above</option>
                  <option value="crosses_below">Crosses Below</option>
                  <option value="percent_change">Percent Change</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--terminal-dim)', display: 'block', marginBottom: '4px' }}>
                  {newAlert.operator === 'percent_change' ? 'Percentage' : 'Value'}
                </label>
                <input
                  type="number"
                  value={newAlert.value}
                  onChange={(e) => setNewAlert({ ...newAlert, value: e.target.value })}
                  placeholder={newAlert.operator === 'percent_change' ? '10' : '50000'}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--terminal-bg-secondary)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    color: 'var(--terminal-text)',
                    fontSize: '12px',
                  }}
                />
              </div>

              {newAlert.operator === 'percent_change' && (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--terminal-dim)', display: 'block', marginBottom: '4px' }}>Timeframe</label>
                  <select
                    value={newAlert.timeframe}
                    onChange={(e) => setNewAlert({ ...newAlert, timeframe: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'var(--terminal-bg-secondary)',
                      border: '1px solid var(--terminal-border)',
                      borderRadius: '4px',
                      color: 'var(--terminal-text)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="1h">1 Hour</option>
                    <option value="4h">4 Hours</option>
                    <option value="24h">24 Hours</option>
                    <option value="7d">7 Days</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                style={{
                  padding: '12px',
                  background: 'var(--terminal-accent)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  marginTop: '8px',
                }}
              >
                Create Alert
              </button>
            </form>

            {/* Quick Presets */}
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ fontSize: '12px', color: 'var(--terminal-dim)', marginBottom: '12px' }}>Quick Presets</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { label: 'BTC > $100K', asset: 'BTC', type: 'price', operator: 'above', value: '100000' },
                  { label: 'ETH < $2000', asset: 'ETH', type: 'price', operator: 'below', value: '2000' },
                  { label: 'SOL ±10%', asset: 'SOL', type: 'price', operator: 'percent_change', value: '10' },
                  { label: 'BTC Whale >$5M', asset: 'BTC', type: 'whale', operator: 'above', value: '5000000' },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setNewAlert({ ...newAlert, ...preset })}
                    style={{
                      padding: '8px',
                      background: 'var(--terminal-bg-secondary)',
                      border: '1px solid var(--terminal-border)',
                      borderRadius: '4px',
                      color: 'var(--terminal-text)',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

