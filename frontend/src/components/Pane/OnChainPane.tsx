import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import type { Pane } from '../../../shared/src/types';
import api from '../../services/api';

interface WhaleTransaction {
  hash: string;
  timestamp: number;
  from: string;
  fromLabel?: string;
  to: string;
  toLabel?: string;
  value: number;
  valueUsd?: number;
  tokenSymbol: string;
  type: 'transfer' | 'exchange_inflow' | 'exchange_outflow';
  chain: string;
}

interface FundingRate {
  symbol: string;
  exchange: string;
  rate: number;
  markPrice?: number;
}

interface TokenUnlock {
  token: string;
  symbol: string;
  unlockDate: number;
  amount: number;
  percentOfSupply: number;
  type: string;
  description?: string;
}

interface ExchangeFlow {
  exchange: string;
  inflow24h: number;
  outflow24h: number;
  netflow24h: number;
}

interface OnChainPaneProps {
  pane: Pane;
}

export function OnChainPane({ pane }: OnChainPaneProps) {
  const [activeTab, setActiveTab] = useState<'whales' | 'funding' | 'unlocks' | 'flows'>('whales');
  const [whales, setWhales] = useState<WhaleTransaction[]>([]);
  const [fundingRates, setFundingRates] = useState<FundingRate[]>([]);
  const [unlocks, setUnlocks] = useState<TokenUnlock[]>([]);
  const [exchangeFlows, setExchangeFlows] = useState<ExchangeFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (activeTab === 'whales') {
          const response = await api.get('/onchain/whales', { params: { minValue: 500000, limit: 50 } });
          setWhales(response.data.transactions || []);
        } else if (activeTab === 'funding') {
          const response = await api.get('/onchain/funding-rates');
          setFundingRates(response.data.rates || []);
        } else if (activeTab === 'unlocks') {
          const response = await api.get('/onchain/token-unlocks');
          setUnlocks(response.data.unlocks || []);
        } else if (activeTab === 'flows') {
          const response = await api.get('/onchain/exchange-flows');
          setExchangeFlows(response.data.flows || []);
        }
      } catch (err: any) {
        console.error('Failed to fetch on-chain data:', err);
        setError(err.response?.data?.error || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'exchange_inflow': return 'var(--terminal-error)';
      case 'exchange_outflow': return 'var(--terminal-success)';
      default: return 'var(--terminal-text)';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'exchange_inflow': return '📥 CEX Inflow';
      case 'exchange_outflow': return '📤 CEX Outflow';
      default: return '↔️ Transfer';
    }
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
        <button onClick={() => setActiveTab('whales')} style={tabStyle(activeTab === 'whales')}>🐋 Whale Txs</button>
        <button onClick={() => setActiveTab('funding')} style={tabStyle(activeTab === 'funding')}>📊 Funding Rates</button>
        <button onClick={() => setActiveTab('unlocks')} style={tabStyle(activeTab === 'unlocks')}>🔓 Token Unlocks</button>
        <button onClick={() => setActiveTab('flows')} style={tabStyle(activeTab === 'flows')}>💹 Exchange Flows</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--terminal-dim)' }}>Loading...</div>}
        {error && <div style={{ padding: '12px', background: 'var(--terminal-error)', color: 'white', borderRadius: '4px' }}>{error}</div>}

        {activeTab === 'whales' && !loading && (
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>🐋 Recent Whale Transactions</h3>
            {whales.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--terminal-dim)', padding: '20px' }}>No whale transactions found</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {whales.map((tx, idx) => (
                  <div key={idx} style={{
                    padding: '12px',
                    background: 'var(--terminal-bg-secondary)',
                    borderRadius: '4px',
                    border: '1px solid var(--terminal-border)',
                    borderLeft: `3px solid ${getTypeColor(tx.type)}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: getTypeColor(tx.type), fontWeight: 'bold' }}>
                        {getTypeLabel(tx.type)}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--terminal-dim)' }}>
                        {new Date(tx.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {tx.value.toLocaleString()} {tx.tokenSymbol}
                      {tx.valueUsd && <span style={{ color: 'var(--terminal-dim)', marginLeft: '8px' }}>({formatCurrency(tx.valueUsd)})</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--terminal-dim)' }}>
                      <span>{tx.fromLabel || formatAddress(tx.from)}</span>
                      <span style={{ margin: '0 8px' }}>→</span>
                      <span>{tx.toLabel || formatAddress(tx.to)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'funding' && !loading && (
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>📊 Perpetual Funding Rates</h3>
            <div style={{ marginBottom: '12px', padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px', fontSize: '10px', color: 'var(--terminal-dim)' }}>
              Positive rates = longs pay shorts (bullish). Negative rates = shorts pay longs (bearish).
            </div>
            {fundingRates.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--terminal-dim)', padding: '20px' }}>No funding rates available</div>
            ) : (
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Symbol</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Exchange</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Funding Rate</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Mark Price</th>
                  </tr>
                </thead>
                <tbody>
                  {fundingRates.map((rate, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{rate.symbol}</td>
                      <td style={{ padding: '8px' }}>{rate.exchange}</td>
                      <td style={{
                        padding: '8px',
                        textAlign: 'right',
                        fontWeight: 'bold',
                        color: rate.rate >= 0 ? 'var(--terminal-success)' : 'var(--terminal-error)',
                      }}>
                        {rate.rate >= 0 ? '+' : ''}{rate.rate.toFixed(4)}%
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {rate.markPrice ? formatCurrency(rate.markPrice) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'unlocks' && !loading && (
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>🔓 Upcoming Token Unlocks</h3>
            {unlocks.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--terminal-dim)', padding: '20px' }}>No upcoming unlocks</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {unlocks.map((unlock, idx) => {
                  const daysUntil = Math.ceil((unlock.unlockDate - Date.now()) / (24 * 60 * 60 * 1000));
                  const urgency = daysUntil <= 3 ? 'high' : daysUntil <= 7 ? 'medium' : 'low';
                  const urgencyColor = urgency === 'high' ? 'var(--terminal-error)' : urgency === 'medium' ? 'var(--terminal-warning)' : 'var(--terminal-dim)';

                  return (
                    <div key={idx} style={{
                      padding: '12px',
                      background: 'var(--terminal-bg-secondary)',
                      borderRadius: '4px',
                      border: '1px solid var(--terminal-border)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          {unlock.token} ({unlock.symbol})
                        </div>
                        <div style={{ fontSize: '12px', color: urgencyColor, fontWeight: 'bold' }}>
                          {daysUntil <= 0 ? 'TODAY' : `${daysUntil} days`}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11px' }}>
                        <div>
                          <div style={{ color: 'var(--terminal-dim)' }}>Amount</div>
                          <div style={{ fontWeight: 'bold' }}>{unlock.amount.toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--terminal-dim)' }}>% of Supply</div>
                          <div style={{ fontWeight: 'bold', color: unlock.percentOfSupply > 5 ? 'var(--terminal-error)' : 'var(--terminal-text)' }}>
                            {unlock.percentOfSupply.toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--terminal-dim)' }}>Type</div>
                          <div>{unlock.type}</div>
                        </div>
                      </div>
                      {unlock.description && (
                        <div style={{ fontSize: '10px', color: 'var(--terminal-dim)', marginTop: '8px' }}>{unlock.description}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'flows' && !loading && (
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>💹 Exchange Flows (24h)</h3>
            <div style={{ marginBottom: '12px', padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px', fontSize: '10px', color: 'var(--terminal-dim)' }}>
              Positive netflow = more inflows than outflows (potential sell pressure). Negative netflow = more outflows (accumulation).
            </div>
            {exchangeFlows.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--terminal-dim)', padding: '20px' }}>No exchange flow data available</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={exchangeFlows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" />
                    <XAxis dataKey="exchange" stroke="var(--terminal-text)" tick={{ fill: 'var(--terminal-text)', fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => formatCurrency(Math.abs(v))} stroke="var(--terminal-text)" tick={{ fill: 'var(--terminal-text)', fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'var(--terminal-bg)', border: '1px solid var(--terminal-border)' }} />
                    <Bar dataKey="netflow24h" name="Net Flow">
                      {exchangeFlows.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.netflow24h >= 0 ? 'var(--terminal-error)' : 'var(--terminal-success)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginTop: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Exchange</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Inflow</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Outflow</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Net Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exchangeFlows.map((flow, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{flow.exchange}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: 'var(--terminal-error)' }}>{formatCurrency(flow.inflow24h)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: 'var(--terminal-success)' }}>{formatCurrency(flow.outflow24h)}</td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: flow.netflow24h >= 0 ? 'var(--terminal-error)' : 'var(--terminal-success)',
                        }}>
                          {flow.netflow24h >= 0 ? '+' : ''}{formatCurrency(flow.netflow24h)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
