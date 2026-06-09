import { useEffect, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
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
  mcap?: number;
  fdv?: number;
  revenue24h?: number;
  revenue30d?: number;
  fees24h?: number;
  fees30d?: number;
}

interface TVLData {
  date: number;
  totalLiquidityUSD: number;
}

interface YieldOpportunity {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase?: number;
  apyReward?: number;
  apyMean30d?: number;
  ilRisk?: string;
}

interface YieldSearchResult {
  query: string;
  results: YieldOpportunity[];
  groupedByChain: Record<string, YieldOpportunity[]>;
  bestOverall: YieldOpportunity | null;
  bestByChain: Record<string, YieldOpportunity>;
}

interface ProtocolRevenue {
  protocol: string;
  revenue24h?: number;
  revenue7d?: number;
  revenue30d?: number;
  revenue1y?: number;
  fees24h?: number;
  fees30d?: number;
  mcap?: number;
  fdv?: number;
  mcapToRevenue?: number;
  fdvToRevenue?: number;
}

interface DeFiPaneProps {
  pane: Pane;
}

export function DeFiPane({ pane }: DeFiPaneProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'protocols' | 'yields' | 'chains' | 'revenue'>('overview');
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [globalTVL, setGlobalTVL] = useState<TVLData[]>([]);
  const [yields, setYields] = useState<YieldOpportunity[]>([]);
  const [chainTVL, setChainTVL] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Get chain filter from pane config if provided (e.g., "Solana DEFI")
  const defaultChain = pane.config?.chain || 'all';
  const [selectedChain, setSelectedChain] = useState<string>(defaultChain);
  const [minAPY, setMinAPY] = useState(0);
  const [minTVL, setMinTVL] = useState(100000);
  
  // Token search for yields
  const [tokenSearch, setTokenSearch] = useState('');
  const [tokenSearchInput, setTokenSearchInput] = useState('');
  const [yieldSearchResults, setYieldSearchResults] = useState<YieldSearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [yieldViewMode, setYieldViewMode] = useState<'all' | 'search' | 'compare'>('all');
  
  // Revenue data
  const [protocolRevenues, setProtocolRevenues] = useState<ProtocolRevenue[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(false);

  useEffect(() => {
    // Update selectedChain when pane config changes
    if (pane.config?.chain && pane.config.chain !== selectedChain) {
      setSelectedChain(pane.config.chain);
      // If chain is specified, switch to protocols tab
      if (pane.config.chain !== 'all') {
        setActiveTab('protocols');
      }
    }
  }, [pane.config?.chain]);

  // Search yields by token
  const searchYields = useCallback(async (token: string) => {
    if (!token.trim()) {
      setYieldSearchResults(null);
      setYieldViewMode('all');
      return;
    }
    
    setSearchLoading(true);
    try {
      const response = await api.get('/defi/yields/search', {
        params: { token: token.trim(), minTVL: 10000, minAPY: 0 },
      });
      setYieldSearchResults(response.data);
      setYieldViewMode('search');
    } catch (err: any) {
      console.error('Failed to search yields:', err);
      setError(err.response?.data?.error || 'Failed to search yields');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTokenSearch(tokenSearchInput);
    searchYields(tokenSearchInput);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (activeTab === 'overview') {
          const [tvlResponse, chainsResponse] = await Promise.all([
            api.get('/defi/tvl/global'),
            api.get('/defi/tvl/chains'),
          ]);
          setGlobalTVL(tvlResponse.data.tvl || []);
          setChainTVL(chainsResponse.data.chains || {});
        } else if (activeTab === 'protocols') {
          const response = await api.get('/defi/protocols', {
            params: { chain: selectedChain !== 'all' ? selectedChain : undefined, limit: 100 },
          });
          setProtocols(response.data.protocols || []);
        } else if (activeTab === 'yields') {
          // Only fetch regular yields if not in search mode
          if (yieldViewMode === 'all' || !tokenSearch) {
            const response = await api.get('/defi/yields', {
              params: { minTVL, minAPY, chain: selectedChain !== 'all' ? selectedChain : undefined },
            });
            setYields(response.data.opportunities || []);
          }
        } else if (activeTab === 'chains') {
          const response = await api.get('/defi/tvl/chains');
          setChainTVL(response.data.chains || {});
        } else if (activeTab === 'revenue') {
          // Fetch protocol revenue data
          setRevenueLoading(true);
          const response = await api.get('/defi/revenue/protocols', {
            params: { limit: 100 },
          });
          setProtocolRevenues(response.data.protocols || []);
          setRevenueLoading(false);
        }
      } catch (err: any) {
        console.error('Failed to fetch DeFi data:', err);
        setError(err.response?.data?.error || 'Failed to load DeFi data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 120000); // Refresh every 2 minutes

    return () => clearInterval(interval);
  }, [activeTab, selectedChain, minAPY, minTVL, yieldViewMode, tokenSearch]);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatAPY = (apy: number) => {
    return `${apy.toFixed(2)}%`;
  };

  if (loading && !globalTVL.length && !protocols.length && !yields.length) {
    return <div className="pane-loading">Loading DeFi data...</div>;
  }

  const totalTVL = globalTVL.length > 0 
    ? globalTVL[globalTVL.length - 1].totalLiquidityUSD 
    : Object.values(chainTVL).reduce((sum, tvl) => sum + tvl, 0);

  return (
    <div className="defi-pane" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--terminal-text)',
    }}>
      <div className="defi-header" style={{
        padding: '12px',
        borderBottom: '1px solid var(--terminal-border)',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '6px 12px',
            background: activeTab === 'overview' ? 'var(--terminal-accent)' : 'transparent',
            border: '1px solid var(--terminal-border)',
            borderRadius: '4px',
            color: 'var(--terminal-text)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('protocols')}
          style={{
            padding: '6px 12px',
            background: activeTab === 'protocols' ? 'var(--terminal-accent)' : 'transparent',
            border: '1px solid var(--terminal-border)',
            borderRadius: '4px',
            color: 'var(--terminal-text)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Protocols
        </button>
        <button
          onClick={() => setActiveTab('yields')}
          style={{
            padding: '6px 12px',
            background: activeTab === 'yields' ? 'var(--terminal-accent)' : 'transparent',
            border: '1px solid var(--terminal-border)',
            borderRadius: '4px',
            color: 'var(--terminal-text)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Yields
        </button>
        <button
          onClick={() => setActiveTab('chains')}
          style={{
            padding: '6px 12px',
            background: activeTab === 'chains' ? 'var(--terminal-accent)' : 'transparent',
            border: '1px solid var(--terminal-border)',
            borderRadius: '4px',
            color: 'var(--terminal-text)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Chains
        </button>
        <button
          onClick={() => setActiveTab('revenue')}
          style={{
            padding: '6px 12px',
            background: activeTab === 'revenue' ? 'var(--terminal-accent)' : 'transparent',
            border: '1px solid var(--terminal-border)',
            borderRadius: '4px',
            color: 'var(--terminal-text)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Revenue
        </button>
      </div>

      <div className="defi-content" style={{
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

        {activeTab === 'overview' && (
          <div>
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              background: 'var(--terminal-bg-secondary)',
              borderRadius: '4px',
              border: '1px solid var(--terminal-border)',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
                Total Value Locked (All Chains)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {formatCurrency(totalTVL)}
              </div>
            </div>

            {globalTVL.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Global TVL Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={globalTVL.slice(-30)}>
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

            {Object.keys(chainTVL).length > 0 && (
              <div>
                <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Chain TVL Breakdown</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '8px',
                }}>
                  {Object.entries(chainTVL)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([chain, tvl]) => (
                      <div
                        key={chain}
                        style={{
                          padding: '8px',
                          background: 'var(--terminal-bg-secondary)',
                          borderRadius: '4px',
                          border: '1px solid var(--terminal-border)',
                        }}
                      >
                        <div style={{ fontSize: '10px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
                          {chain}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                          {formatCurrency(tvl)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'protocols' && (
          <div>
            <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '11px' }}>Chain:</label>
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                style={{
                  padding: '4px 8px',
                  background: 'var(--terminal-bg-secondary)',
                  border: '1px solid var(--terminal-border)',
                  borderRadius: '4px',
                  color: 'var(--terminal-text)',
                  fontSize: '11px',
                }}
              >
                <option value="all">All Chains</option>
                <option value="Ethereum">Ethereum</option>
                <option value="BSC">BSC</option>
                <option value="Polygon">Polygon</option>
                <option value="Arbitrum">Arbitrum</option>
                <option value="Optimism">Optimism</option>
                <option value="Avalanche">Avalanche</option>
                <option value="Solana">Solana</option>
              </select>
            </div>

            <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Top Protocols by TVL</h3>
            {protocols.length === 0 ? (
              <div style={{ color: 'var(--terminal-dim)', textAlign: 'center', padding: '20px' }}>
                No protocols found
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Protocol</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Chain</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>TVL</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Revenue (30d)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>MCap</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>MCap/Rev</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>1d</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>7d</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>30d</th>
                  </tr>
                </thead>
                <tbody>
                  {protocols.slice(0, 50).map((protocol) => {
                    const revenue30d = protocol.revenue30d || 0;
                    const revenue1y = revenue30d * 12;
                    const mcapToRevenue = revenue1y && protocol.mcap ? protocol.mcap / revenue1y : undefined;
                    
                    return (
                      <tr key={protocol.id} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{protocol.name}</td>
                        <td style={{ padding: '8px' }}>{protocol.chain}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          {formatCurrency(protocol.tvl || 0)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          {revenue30d > 0 ? formatCurrency(revenue30d) : '-'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          {protocol.mcap ? formatCurrency(protocol.mcap) : '-'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          {mcapToRevenue ? `${mcapToRevenue.toFixed(2)}x` : '-'}
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          color: (protocol.change_1d || 0) >= 0 ? 'var(--terminal-success)' : 'var(--terminal-error)',
                        }}>
                          {(protocol.change_1d || 0) >= 0 ? '+' : ''}{(protocol.change_1d || 0).toFixed(2)}%
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          color: (protocol.change_7d || 0) >= 0 ? 'var(--terminal-success)' : 'var(--terminal-error)',
                        }}>
                          {(protocol.change_7d || 0) >= 0 ? '+' : ''}{(protocol.change_7d || 0).toFixed(2)}%
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          color: (protocol.change_30d || 0) >= 0 ? 'var(--terminal-success)' : 'var(--terminal-error)',
                        }}>
                          {(protocol.change_30d || 0) >= 0 ? '+' : ''}{(protocol.change_30d || 0).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'yields' && (
          <div>
            {/* Token Search Section */}
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              background: 'var(--terminal-bg-secondary)',
              borderRadius: '4px',
              border: '1px solid var(--terminal-border)',
            }}>
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>🔍 Search Token/Pair:</label>
                <input
                  type="text"
                  value={tokenSearchInput}
                  onChange={(e) => setTokenSearchInput(e.target.value)}
                  placeholder="e.g., USDC, ETH-USDC, wBTC..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'var(--terminal-bg)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    color: 'var(--terminal-text)',
                    fontSize: '12px',
                  }}
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--terminal-accent)',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {searchLoading ? 'Searching...' : 'Compare Yields'}
                </button>
                {tokenSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setTokenSearch('');
                      setTokenSearchInput('');
                      setYieldSearchResults(null);
                      setYieldViewMode('all');
                    }}
                    style={{
                      padding: '8px 12px',
                      background: 'transparent',
                      border: '1px solid var(--terminal-border)',
                      borderRadius: '4px',
                      color: 'var(--terminal-text)',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Clear
                  </button>
                )}
              </form>
              <div style={{ fontSize: '10px', color: 'var(--terminal-dim)' }}>
                Search for a token to compare yields across all chains and protocols. Examples: USDC, ETH, wBTC, SOL, ETH-USDC
              </div>
            </div>

            {/* Search Results View */}
            {yieldViewMode === 'search' && yieldSearchResults && (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}>
                  <h3 style={{ fontSize: '14px', margin: 0 }}>
                    Results for "{yieldSearchResults.query}" ({yieldSearchResults.results.length} pools found)
                  </h3>
                </div>

                {/* Best Overall Yield */}
                {yieldSearchResults.bestOverall && (
                  <div style={{
                    marginBottom: '16px',
                    padding: '12px',
                    background: 'linear-gradient(135deg, rgba(0, 200, 83, 0.15), rgba(0, 200, 83, 0.05))',
                    borderRadius: '4px',
                    border: '1px solid var(--terminal-success)',
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--terminal-success)', marginBottom: '4px', fontWeight: 'bold' }}>
                      🏆 BEST YIELD OVERALL
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                          {yieldSearchResults.bestOverall.project} - {yieldSearchResults.bestOverall.symbol}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--terminal-dim)' }}>
                          {yieldSearchResults.bestOverall.chain} • TVL: {formatCurrency(yieldSearchResults.bestOverall.tvlUsd)}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: 'var(--terminal-success)',
                      }}>
                        {formatAPY(yieldSearchResults.bestOverall.apy)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Best by Chain Comparison */}
                {Object.keys(yieldSearchResults.bestByChain).length > 1 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--terminal-dim)' }}>
                      Best Yield by Chain
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '8px',
                    }}>
                      {Object.entries(yieldSearchResults.bestByChain)
                        .sort(([, a], [, b]) => b.apy - a.apy)
                        .map(([chain, pool]) => (
                          <div
                            key={chain}
                            style={{
                              padding: '10px',
                              background: 'var(--terminal-bg-secondary)',
                              borderRadius: '4px',
                              border: '1px solid var(--terminal-border)',
                            }}
                          >
                            <div style={{ fontSize: '10px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
                              {chain}
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-success)' }}>
                              {formatAPY(pool.apy)}
                            </div>
                            <div style={{ fontSize: '10px', marginTop: '4px' }}>
                              {pool.project}
                            </div>
                            <div style={{ fontSize: '9px', color: 'var(--terminal-dim)' }}>
                              TVL: {formatCurrency(pool.tvlUsd)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Full Results Table */}
                <h4 style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--terminal-dim)' }}>
                  All Matching Pools
                </h4>
                {yieldSearchResults.results.length === 0 ? (
                  <div style={{ color: 'var(--terminal-dim)', textAlign: 'center', padding: '20px' }}>
                    No matching yield opportunities found
                  </div>
                ) : (
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Protocol</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Pool</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Chain</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>APY</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Base APY</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Reward APY</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>TVL</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>IL Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yieldSearchResults.results.slice(0, 50).map((pool, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold' }}>{pool.project}</td>
                          <td style={{ padding: '8px' }}>{pool.symbol}</td>
                          <td style={{ padding: '8px' }}>{pool.chain}</td>
                          <td style={{
                            padding: '8px',
                            textAlign: 'right',
                            color: 'var(--terminal-success)',
                            fontWeight: 'bold',
                          }}>
                            {formatAPY(pool.apy)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: 'var(--terminal-dim)' }}>
                            {pool.apyBase ? formatAPY(pool.apyBase) : '-'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: 'var(--terminal-accent)' }}>
                            {pool.apyReward ? formatAPY(pool.apyReward) : '-'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            {formatCurrency(pool.tvlUsd)}
                          </td>
                          <td style={{
                            padding: '8px',
                            color: pool.ilRisk === 'no' ? 'var(--terminal-success)' :
                                   pool.ilRisk === 'yes' ? 'var(--terminal-warning)' : 'var(--terminal-dim)',
                          }}>
                            {pool.ilRisk || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Default Yields View */}
            {yieldViewMode === 'all' && (
              <div>
                <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '11px' }}>Chain:</label>
                  <select
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      background: 'var(--terminal-bg-secondary)',
                      border: '1px solid var(--terminal-border)',
                      borderRadius: '4px',
                      color: 'var(--terminal-text)',
                      fontSize: '11px',
                    }}
                  >
                    <option value="all">All Chains</option>
                    <option value="Ethereum">Ethereum</option>
                    <option value="BSC">BSC</option>
                    <option value="Polygon">Polygon</option>
                    <option value="Arbitrum">Arbitrum</option>
                    <option value="Optimism">Optimism</option>
                    <option value="Avalanche">Avalanche</option>
                    <option value="Solana">Solana</option>
                    <option value="Base">Base</option>
                  </select>
                  <label style={{ fontSize: '11px' }}>Min APY:</label>
                  <input
                    type="number"
                    value={minAPY}
                    onChange={(e) => setMinAPY(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '80px',
                      padding: '4px 8px',
                      background: 'var(--terminal-bg-secondary)',
                      border: '1px solid var(--terminal-border)',
                      borderRadius: '4px',
                      color: 'var(--terminal-text)',
                      fontSize: '11px',
                    }}
                  />
                  <label style={{ fontSize: '11px' }}>Min TVL:</label>
                  <input
                    type="number"
                    value={minTVL}
                    onChange={(e) => setMinTVL(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100px',
                      padding: '4px 8px',
                      background: 'var(--terminal-bg-secondary)',
                      border: '1px solid var(--terminal-border)',
                      borderRadius: '4px',
                      color: 'var(--terminal-text)',
                      fontSize: '11px',
                    }}
                  />
                </div>

                <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Top Yield Opportunities</h3>
                {yields.length === 0 ? (
                  <div style={{ color: 'var(--terminal-dim)', textAlign: 'center', padding: '20px' }}>
                    No yield opportunities found
                  </div>
                ) : (
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Project</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Pool</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Chain</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>APY</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>TVL</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yields.slice(0, 50).map((yieldOpp, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold' }}>{yieldOpp.project}</td>
                          <td style={{ padding: '8px' }}>{yieldOpp.symbol}</td>
                          <td style={{ padding: '8px' }}>{yieldOpp.chain}</td>
                          <td style={{
                            padding: '8px',
                            textAlign: 'right',
                            color: 'var(--terminal-success)',
                            fontWeight: 'bold',
                          }}>
                            {formatAPY(yieldOpp.apy)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            {formatCurrency(yieldOpp.tvlUsd)}
                          </td>
                          <td style={{ padding: '8px' }}>
                            {yieldOpp.ilRisk || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chains' && (
          <div>
            <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Chain TVL Comparison</h3>
            {Object.keys(chainTVL).length === 0 ? (
              <div style={{ color: 'var(--terminal-dim)', textAlign: 'center', padding: '20px' }}>
                No chain data available
              </div>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(chainTVL)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 15)
                    .map(([chain, tvl]) => ({ chain, tvl }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" />
                    <XAxis
                      dataKey="chain"
                      stroke="var(--terminal-text)"
                      tick={{ fill: 'var(--terminal-text)', fontSize: 10 }}
                      style={{ fontSize: '10px', color: 'var(--terminal-text)' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      stroke="var(--terminal-text)"
                      tick={{ fill: 'var(--terminal-text)', fontSize: 10 }}
                      style={{ fontSize: '10px', color: 'var(--terminal-text)' }}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        background: 'var(--terminal-bg)',
                        border: '1px solid var(--terminal-border)',
                        borderRadius: '4px',
                      }}
                    />
                    <Bar dataKey="tvl" fill="var(--terminal-accent)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {activeTab === 'revenue' && (
          <div>
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              background: 'var(--terminal-bg-secondary)',
              borderRadius: '4px',
              border: '1px solid var(--terminal-border)',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                💰 Protocol Revenue Analysis
              </div>
              <div style={{ fontSize: '10px', color: 'var(--terminal-dim)' }}>
                Compare DeFi protocol revenues, fees, and valuation multiples. Green MCap/Rev indicates potentially undervalued protocols.
                Revenue data sourced from DeFiLlama fees/revenue API.
              </div>
            </div>

            <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>
              Top Protocols by Revenue
              {revenueLoading && <span style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginLeft: '8px' }}>(loading...)</span>}
            </h3>
            
            {protocolRevenues.length === 0 && !revenueLoading ? (
              <div style={{ color: 'var(--terminal-dim)', textAlign: 'center', padding: '20px' }}>
                Loading revenue data...
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Protocol</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Revenue (24h)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Revenue (7d)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Revenue (30d)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Rev (Annualized)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Fees (30d)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>MCap</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>FDV</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>MCap/Rev</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>FDV/Rev</th>
                  </tr>
                </thead>
                <tbody>
                  {protocolRevenues
                    .filter(p => (p.revenue30d && p.revenue30d > 0) || (p.revenue24h && p.revenue24h > 0))
                    .sort((a, b) => (b.revenue30d || b.revenue24h || 0) - (a.revenue30d || a.revenue24h || 0))
                    .slice(0, 75)
                    .map((protocol, idx) => {
                      const revenue30d = protocol.revenue30d || 0;
                      const revenue1y = protocol.revenue1y || revenue30d * 12;
                      const mcapToRevenue = protocol.mcapToRevenue || (revenue1y && protocol.mcap ? protocol.mcap / revenue1y : undefined);
                      const fdvToRevenue = protocol.fdvToRevenue || (revenue1y && protocol.fdv ? protocol.fdv / revenue1y : undefined);
                      
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold' }}>{protocol.protocol}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            {protocol.revenue24h ? formatCurrency(protocol.revenue24h) : '-'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            {protocol.revenue7d ? formatCurrency(protocol.revenue7d) : '-'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            {revenue30d > 0 ? formatCurrency(revenue30d) : '-'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                            {revenue1y > 0 ? formatCurrency(revenue1y) : '-'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: 'var(--terminal-dim)' }}>
                            {protocol.fees30d ? formatCurrency(protocol.fees30d) : '-'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            {protocol.mcap ? formatCurrency(protocol.mcap) : '-'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            {protocol.fdv ? formatCurrency(protocol.fdv) : '-'}
                          </td>
                          <td style={{ 
                            padding: '8px', 
                            textAlign: 'right',
                            fontWeight: 'bold',
                            color: mcapToRevenue && mcapToRevenue < 10 ? 'var(--terminal-success)' : 
                                   mcapToRevenue && mcapToRevenue < 30 ? 'var(--terminal-warning)' : 
                                   mcapToRevenue && mcapToRevenue < 100 ? 'var(--terminal-text)' : 
                                   'var(--terminal-dim)',
                          }}>
                            {mcapToRevenue ? `${mcapToRevenue.toFixed(1)}x` : '-'}
                          </td>
                          <td style={{ 
                            padding: '8px', 
                            textAlign: 'right',
                            color: fdvToRevenue && fdvToRevenue < 10 ? 'var(--terminal-success)' : 
                                   fdvToRevenue && fdvToRevenue < 30 ? 'var(--terminal-warning)' : 
                                   fdvToRevenue && fdvToRevenue < 100 ? 'var(--terminal-text)' : 
                                   'var(--terminal-dim)',
                          }}>
                            {fdvToRevenue ? `${fdvToRevenue.toFixed(1)}x` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
            
            {/* Legend */}
            <div style={{
              marginTop: '16px',
              padding: '8px',
              background: 'var(--terminal-bg-secondary)',
              borderRadius: '4px',
              fontSize: '10px',
              color: 'var(--terminal-dim)',
            }}>
              <strong>MCap/Rev Legend:</strong>{' '}
              <span style={{ color: 'var(--terminal-success)' }}>●</span> &lt;10x (Undervalued){' '}
              <span style={{ color: 'var(--terminal-warning)' }}>●</span> 10-30x (Fair){' '}
              <span style={{ color: 'var(--terminal-text)' }}>●</span> 30-100x (Growth){' '}
              <span style={{ color: 'var(--terminal-dim)' }}>●</span> &gt;100x (Expensive)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

