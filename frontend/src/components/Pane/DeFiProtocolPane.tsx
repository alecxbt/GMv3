import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Pane } from '@shared/types';
import api from '../../services/api';

interface Protocol {
  id: string;
  name: string;
  chain: string;
  tvl?: number;
  change_1d?: number;
  change_7d?: number;
  change_30d?: number;
  logo?: string;
  url?: string;
  description?: string;
  mcap?: number;
  fdv?: number;
  tokenPrice?: number;
  fees24h?: number;
  fees7d?: number;
  fees30d?: number;
  revenue24h?: number;
  revenue7d?: number;
  revenue30d?: number;
}

interface TVLData {
  date: number;
  totalLiquidityUSD: number;
}

interface RevenueData {
  revenue24h?: number;
  revenue7d?: number;
  revenue30d?: number;
  revenue1y?: number;
  fees24h?: number;
  fees7d?: number;
  fees30d?: number;
  fees1y?: number;
  mcap?: number;
  fdv?: number;
  mcapToRevenue?: number;
  fdvToRevenue?: number;
}

interface RevenueHistoryData {
  date: number;
  feesUsd?: number;
  revenueUsd?: number;
}

interface DeFiProtocolPaneProps {
  pane: Pane;
}

export function DeFiProtocolPane({ pane }: DeFiProtocolPaneProps) {
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [tvlData, setTvlData] = useState<TVLData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [revenueHistory, setRevenueHistory] = useState<RevenueHistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const protocolId = pane.ticker || pane.config?.protocolId;

  useEffect(() => {
    if (!protocolId) {
      setError('Protocol ID required');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [protocolResponse, tvlResponse, revenueResponse, revenueHistoryResponse] = await Promise.allSettled([
          api.get(`/defi/protocol/${protocolId}`),
          api.get(`/defi/protocol/${protocolId}/tvl`),
          api.get(`/defi/protocol/${protocolId}/revenue`),
          api.get(`/defi/protocol/${protocolId}/revenue/history`),
        ]);

        if (protocolResponse.status === 'fulfilled') {
          setProtocol(protocolResponse.value.data);
        }
        if (tvlResponse.status === 'fulfilled') {
          setTvlData(tvlResponse.value.data.tvl || []);
        }
        if (revenueResponse.status === 'fulfilled') {
          setRevenueData(revenueResponse.value.data);
        }
        if (revenueHistoryResponse.status === 'fulfilled') {
          setRevenueHistory(revenueHistoryResponse.value.data.revenue || []);
        }
      } catch (err: any) {
        console.error('Failed to fetch protocol data:', err);
        setError(err.response?.data?.error || 'Failed to load protocol data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 120000); // Refresh every 2 minutes

    return () => clearInterval(interval);
  }, [protocolId]);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  if (loading) {
    return <div className="pane-loading">Loading protocol data...</div>;
  }

  if (error || !protocol) {
    return (
      <div className="pane-loading" style={{ color: 'var(--terminal-error)' }}>
        {error || 'Protocol not found'}
      </div>
    );
  }

  return (
    <div className="defi-protocol-pane" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--terminal-text)',
      padding: '12px',
      overflowY: 'auto',
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>{protocol.name}</h2>
        {protocol.description && (
          <p style={{ fontSize: '12px', color: 'var(--terminal-dim)', marginBottom: '12px' }}>
            {protocol.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--terminal-dim)' }}>Chain: </span>
            <span style={{ fontSize: '12px' }}>{protocol.chain}</span>
          </div>
          {protocol.url && (
            <a
              href={protocol.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '12px',
                color: 'var(--terminal-accent)',
                textDecoration: 'none',
              }}
            >
              Visit Protocol →
            </a>
          )}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div style={{
          padding: '12px',
          background: 'var(--terminal-bg-secondary)',
          borderRadius: '4px',
          border: '1px solid var(--terminal-border)',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
            TVL
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            {formatCurrency(protocol.tvl || 0)}
          </div>
        </div>

        {protocol.change_1d !== undefined && (
          <div style={{
            padding: '12px',
            background: 'var(--terminal-bg-secondary)',
            borderRadius: '4px',
            border: '1px solid var(--terminal-border)',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
              24h Change
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: (protocol.change_1d || 0) >= 0 ? 'var(--terminal-success)' : 'var(--terminal-error)',
            }}>
              {(protocol.change_1d || 0) >= 0 ? '+' : ''}{(protocol.change_1d || 0).toFixed(2)}%
            </div>
          </div>
        )}

        {protocol.change_7d !== undefined && (
          <div style={{
            padding: '12px',
            background: 'var(--terminal-bg-secondary)',
            borderRadius: '4px',
            border: '1px solid var(--terminal-border)',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
              7d Change
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: (protocol.change_7d || 0) >= 0 ? 'var(--terminal-success)' : 'var(--terminal-error)',
            }}>
              {(protocol.change_7d || 0) >= 0 ? '+' : ''}{(protocol.change_7d || 0).toFixed(2)}%
            </div>
          </div>
        )}

        {protocol.change_30d !== undefined && (
          <div style={{
            padding: '12px',
            background: 'var(--terminal-bg-secondary)',
            borderRadius: '4px',
            border: '1px solid var(--terminal-border)',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
              30d Change
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: (protocol.change_30d || 0) >= 0 ? 'var(--terminal-success)' : 'var(--terminal-error)',
            }}>
              {(protocol.change_30d || 0) >= 0 ? '+' : ''}{(protocol.change_30d || 0).toFixed(2)}%
            </div>
          </div>
        )}

        {protocol.mcap && (
          <div style={{
            padding: '12px',
            background: 'var(--terminal-bg-secondary)',
            borderRadius: '4px',
            border: '1px solid var(--terminal-border)',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
              Market Cap
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {formatCurrency(protocol.mcap)}
            </div>
          </div>
        )}

        {protocol.tokenPrice && (
          <div style={{
            padding: '12px',
            background: 'var(--terminal-bg-secondary)',
            borderRadius: '4px',
            border: '1px solid var(--terminal-border)',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
              Token Price
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              ${protocol.tokenPrice.toFixed(4)}
            </div>
          </div>
        )}

        {protocol.fdv && (
          <div style={{
            padding: '12px',
            background: 'var(--terminal-bg-secondary)',
            borderRadius: '4px',
            border: '1px solid var(--terminal-border)',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
              FDV
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {formatCurrency(protocol.fdv)}
            </div>
          </div>
        )}
      </div>

      {revenueData && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Revenue & Fees</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: '12px',
          }}>
            {revenueData.revenue24h !== undefined && (
              <div style={{
                padding: '12px',
                background: 'var(--terminal-bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--terminal-border)',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
                  Revenue (24h)
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {formatCurrency(revenueData.revenue24h)}
                </div>
              </div>
            )}

            {revenueData.revenue7d !== undefined && (
              <div style={{
                padding: '12px',
                background: 'var(--terminal-bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--terminal-border)',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
                  Revenue (7d)
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {formatCurrency(revenueData.revenue7d)}
                </div>
              </div>
            )}

            {revenueData.revenue30d !== undefined && (
              <div style={{
                padding: '12px',
                background: 'var(--terminal-bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--terminal-border)',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
                  Revenue (30d)
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {formatCurrency(revenueData.revenue30d)}
                </div>
              </div>
            )}

            {revenueData.revenue1y !== undefined && (
              <div style={{
                padding: '12px',
                background: 'var(--terminal-bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--terminal-border)',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
                  Revenue (Annualized)
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {formatCurrency(revenueData.revenue1y)}
                </div>
              </div>
            )}

            {revenueData.mcapToRevenue !== undefined && (
              <div style={{
                padding: '12px',
                background: 'var(--terminal-bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--terminal-border)',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
                  MCap/Revenue
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {revenueData.mcapToRevenue.toFixed(2)}x
                </div>
              </div>
            )}

            {revenueData.fdvToRevenue !== undefined && (
              <div style={{
                padding: '12px',
                background: 'var(--terminal-bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--terminal-border)',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
                  FDV/Revenue
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {revenueData.fdvToRevenue.toFixed(2)}x
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {revenueHistory.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Revenue History</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueHistory.slice(-90)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                stroke="var(--terminal-text)"
                tick={{ fill: 'var(--terminal-text)', fontSize: 10 }}
                style={{ fontSize: '10px', color: 'var(--terminal-text)' }}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value)}
                stroke="var(--terminal-text)"
                tick={{ fill: 'var(--terminal-text)', fontSize: 10 }}
                style={{ fontSize: '10px', color: 'var(--terminal-text)' }}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                contentStyle={{
                  background: 'var(--terminal-bg)',
                  border: '1px solid var(--terminal-border)',
                  borderRadius: '4px',
                }}
              />
              <Line
                type="monotone"
                dataKey="revenueUsd"
                stroke="var(--terminal-success)"
                strokeWidth={2}
                dot={false}
                name="Revenue"
              />
              <Line
                type="monotone"
                dataKey="feesUsd"
                stroke="var(--terminal-accent)"
                strokeWidth={2}
                dot={false}
                name="Fees"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {tvlData.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>TVL History</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={tvlData.slice(-90)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                stroke="var(--terminal-text)"
                tick={{ fill: 'var(--terminal-text)', fontSize: 10 }}
                style={{ fontSize: '10px', color: 'var(--terminal-text)' }}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value)}
                stroke="var(--terminal-text)"
                tick={{ fill: 'var(--terminal-text)', fontSize: 10 }}
                style={{ fontSize: '10px', color: 'var(--terminal-text)' }}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                contentStyle={{
                  background: 'var(--terminal-bg)',
                  border: '1px solid var(--terminal-border)',
                  borderRadius: '4px',
                }}
              />
              <Line
                type="monotone"
                dataKey="totalLiquidityUSD"
                stroke="var(--terminal-accent)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

