import { useEffect, useState } from 'react';
import type { Pane } from '../../../shared/src/types';
import api from '../../services/api';

interface Order {
  id: string;
  exchange: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: string;
  filledQuantity: number;
  averageFillPrice?: number;
  createdAt: number;
  updatedAt: number;
}

interface Execution {
  id: string;
  orderId: string;
  exchange: string;
  quantity: number;
  price: number;
  timestamp: number;
  fee?: number;
}

interface TradingPaneProps {
  pane: Pane;
}

export function TradingPane({ pane }: TradingPaneProps) {
  const [activeTab, setActiveTab] = useState<'order' | 'orders' | 'executions'>('order');
  const [orders, setOrders] = useState<Order[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Order form state
  const [symbol, setSymbol] = useState(pane.ticker || 'BTC/USD');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [type, setType] = useState<'market' | 'limit' | 'stop' | 'stop_limit'>('market');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [strategy, setStrategy] = useState('best_price');

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'executions') {
      fetchExecutions();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/trading/orders', {
        params: { userId: 'demo' }, // Would use actual user ID
      });
      setOrders(response.data.orders || []);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    try {
      setLoading(true);
      // Would fetch all executions
      setExecutions([]);
    } catch (err: any) {
      console.error('Failed to fetch executions:', err);
      setError(err.response?.data?.error || 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Invalid quantity');
      return;
    }

    if (type === 'limit' && (!price || parseFloat(price) <= 0)) {
      setError('Price required for limit orders');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/trading/order', {
        symbol,
        side,
        type,
        quantity: parseFloat(quantity),
        price: price ? parseFloat(price) : undefined,
        stopPrice: stopPrice ? parseFloat(stopPrice) : undefined,
        strategy,
        userId: 'demo', // Would use actual user ID
      });

      if (response.data.success) {
        setQuantity('');
        setPrice('');
        setStopPrice('');
        setActiveTab('orders');
        fetchOrders();
      }
    } catch (err: any) {
      console.error('Failed to place order:', err);
      setError(err.response?.data?.error || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await api.post(`/trading/order/${orderId}/cancel`, {
        userId: 'demo',
      });
      fetchOrders();
    } catch (err: any) {
      console.error('Failed to cancel order:', err);
      setError(err.response?.data?.error || 'Failed to cancel order');
    }
  };

  return (
    <div className="trading-pane" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--terminal-text)',
    }}>
      <div className="trading-header" style={{
        padding: '12px',
        borderBottom: '1px solid var(--terminal-border)',
        display: 'flex',
        gap: '8px',
      }}>
        <button
          onClick={() => setActiveTab('order')}
          style={{
            padding: '6px 12px',
            background: activeTab === 'order' ? 'var(--terminal-accent)' : 'transparent',
            border: '1px solid var(--terminal-border)',
            borderRadius: '4px',
            color: 'var(--terminal-text)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Place Order
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '6px 12px',
            background: activeTab === 'orders' ? 'var(--terminal-accent)' : 'transparent',
            border: '1px solid var(--terminal-border)',
            borderRadius: '4px',
            color: 'var(--terminal-text)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Orders
        </button>
        <button
          onClick={() => setActiveTab('executions')}
          style={{
            padding: '6px 12px',
            background: activeTab === 'executions' ? 'var(--terminal-accent)' : 'transparent',
            border: '1px solid var(--terminal-border)',
            borderRadius: '4px',
            color: 'var(--terminal-text)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Executions
        </button>
      </div>

      <div className="trading-content" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
      }}>
        {error && (
          <div style={{
            padding: '12px',
            background: 'var(--terminal-error)',
            color: 'white',
            borderRadius: '4px',
            marginBottom: '12px',
          }}>
            {error}
          </div>
        )}

        {activeTab === 'order' && (
          <div>
            <h3 style={{ marginBottom: '16px', fontSize: '14px' }}>Place Order</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                  Symbol
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--terminal-bg-secondary)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    color: 'var(--terminal-text)',
                    fontSize: '12px',
                  }}
                  placeholder="BTC/USD"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSide('buy')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: side === 'buy' ? 'var(--terminal-success)' : 'var(--terminal-bg-secondary)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    color: 'var(--terminal-text)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  BUY
                </button>
                <button
                  onClick={() => setSide('sell')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: side === 'sell' ? 'var(--terminal-error)' : 'var(--terminal-bg-secondary)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    color: 'var(--terminal-text)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  SELL
                </button>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                  Order Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--terminal-bg-secondary)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    color: 'var(--terminal-text)',
                    fontSize: '12px',
                  }}
                >
                  <option value="market">Market</option>
                  <option value="limit">Limit</option>
                  <option value="stop">Stop</option>
                  <option value="stop_limit">Stop Limit</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                  Quantity
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--terminal-bg-secondary)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    color: 'var(--terminal-text)',
                    fontSize: '12px',
                  }}
                  placeholder="0.00"
                  step="0.0001"
                />
              </div>

              {(type === 'limit' || type === 'stop_limit') && (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                    Price
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'var(--terminal-bg-secondary)',
                      border: '1px solid var(--terminal-border)',
                      borderRadius: '4px',
                      color: 'var(--terminal-text)',
                      fontSize: '12px',
                    }}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              )}

              {(type === 'stop' || type === 'stop_limit') && (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                    Stop Price
                  </label>
                  <input
                    type="number"
                    value={stopPrice}
                    onChange={(e) => setStopPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'var(--terminal-bg-secondary)',
                      border: '1px solid var(--terminal-border)',
                      borderRadius: '4px',
                      color: 'var(--terminal-text)',
                      fontSize: '12px',
                    }}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                  Routing Strategy
                </label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--terminal-bg-secondary)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    color: 'var(--terminal-text)',
                    fontSize: '12px',
                  }}
                >
                  <option value="best_price">Best Price</option>
                  <option value="liquidity">Liquidity</option>
                  <option value="split">Split Order</option>
                </select>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: side === 'buy' ? 'var(--terminal-success)' : 'var(--terminal-error)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Placing...' : `${side.toUpperCase()} ${symbol}`}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Open Orders</h3>
            {loading ? (
              <div className="pane-loading">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div style={{ color: 'var(--terminal-dim)', textAlign: 'center', padding: '20px' }}>
                No orders found
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Time</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Symbol</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Side</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Quantity</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Exchange</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                      <td style={{ padding: '8px' }}>
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '8px' }}>{order.symbol}</td>
                      <td style={{
                        padding: '8px',
                        color: order.side === 'buy' ? 'var(--terminal-success)' : 'var(--terminal-error)',
                      }}>
                        {order.side.toUpperCase()}
                      </td>
                      <td style={{ padding: '8px' }}>{order.type}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {order.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {order.price ? `$${order.price.toFixed(2)}` : 'Market'}
                      </td>
                      <td style={{ padding: '8px' }}>{order.status}</td>
                      <td style={{ padding: '8px' }}>{order.exchange}</td>
                      <td style={{ padding: '8px' }}>
                        {order.status === 'open' && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
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
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'executions' && (
          <div>
            <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Executions</h3>
            {loading ? (
              <div className="pane-loading">Loading executions...</div>
            ) : executions.length === 0 ? (
              <div style={{ color: 'var(--terminal-dim)', textAlign: 'center', padding: '20px' }}>
                No executions found
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Time</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Exchange</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Quantity</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((exec) => (
                    <tr key={exec.id} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                      <td style={{ padding: '8px' }}>
                        {new Date(exec.timestamp).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '8px' }}>{exec.exchange}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {exec.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        ${exec.price.toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {exec.fee ? `$${exec.fee.toFixed(4)}` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

