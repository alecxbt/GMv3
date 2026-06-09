import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { Pane } from '@shared/types';
import api from '../../services/api';

// Custom tick component to ensure white text
const CustomXAxisTick = ({ x, y, payload }: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#f0f0f0"
        fontSize={10}
        transform="rotate(-45)"
        style={{ fill: '#f0f0f0', color: '#f0f0f0' }}
      >
        {payload.value}
      </text>
    </g>
  );
};

const CustomYAxisTick = ({ x, y, payload, formatCurrency }: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dx={-4}
        textAnchor="end"
        fill="#f0f0f0"
        fontSize={10}
        style={{ fill: '#f0f0f0', color: '#f0f0f0' }}
      >
        {formatCurrency ? formatCurrency(payload.value) : payload.value}
      </text>
    </g>
  );
};

interface ChainData {
  chain: string;
  tvl?: number;
  change_1d?: number;
  change_7d?: number;
  revenue24h?: number;
  revenue7d?: number;
  revenue30d?: number;
  fees24h?: number;
  fees7d?: number;
  fees30d?: number;
  activeAddresses?: number;
  transactions24h?: number;
}

type SortKey = 'tvl' | 'revenue24h' | 'revenue30d' | 'change_1d' | 'change_7d' | 'chain' | 'name';

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
  category?: string;
}

interface OnChainOverviewPaneProps {
  pane: Pane;
}

export function OnChainOverviewPane({ pane }: OnChainOverviewPaneProps) {
  const [chains, setChains] = useState<ChainData[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [exchanges, setExchanges] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'activity'>('overview');
  const [viewMode, setViewMode] = useState<'chains' | 'protocols' | 'exchanges'>('chains');
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());
  const [selectedProtocols, setSelectedProtocols] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>('tvl');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [allAvailableChains, setAllAvailableChains] = useState<string[]>([]);
  const [allAvailableProtocols, setAllAvailableProtocols] = useState<string[]>([]);
  const [chainsDropdownOpen, setChainsDropdownOpen] = useState(false);
  const [protocolsDropdownOpen, setProtocolsDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (viewMode === 'chains') {
          // Fetch chain TVL data and revenue data in parallel
          const [tvlResponse, revenueResponse] = await Promise.allSettled([
            api.get('/defi/tvl/chains'),
            api.get('/defi/revenue/chains'),
          ]);

          const chainTVL = tvlResponse.status === 'fulfilled' ? tvlResponse.value.data.chains || {} : {};
          const chainsRevenue = revenueResponse.status === 'fulfilled' ? revenueResponse.value.data.chains || [] : [];

          console.log('Chains Revenue Response:', chainsRevenue);
          console.log('Number of chains with revenue:', chainsRevenue.length);

          // Create a map of revenue data by chain name (case-insensitive matching)
          const revenueMap = new Map<string, ChainData>();
          chainsRevenue.forEach((rev: any) => {
            if (rev && rev.chain) {
              revenueMap.set(rev.chain, rev);
              revenueMap.set(rev.chain.toLowerCase(), rev);
              if (rev.chain === 'BSC') {
                revenueMap.set('Binance', rev);
                revenueMap.set('binance', rev);
              }
              // Log revenue data for debugging
              if (rev.revenue24h || rev.revenue30d) {
                console.log(`Chain ${rev.chain}: 24h=${rev.revenue24h}, 30d=${rev.revenue30d}`);
              }
            }
          });

          // Combine TVL and revenue data
          const majorChains = ['Ethereum', 'Solana', 'BSC', 'Polygon', 'Arbitrum', 'Optimism', 'Avalanche', 'Base', 'Fantom', 'Tron', 'Near', 'Cosmos', 'Osmosis', 'Kava', 'Celo', 'Moonriver', 'Harmony', 'Gnosis', 'Cardano', 'Stacks', 'Bitcoin'];
          const chainData: ChainData[] = majorChains
            .map((chainName) => {
              const tvl = chainTVL[chainName] || 0;
              let revenue = revenueMap.get(chainName) || 
                           revenueMap.get(chainName.toLowerCase()) ||
                           (chainName === 'BSC' ? revenueMap.get('Binance') : null);
              
              if (!revenue) {
                for (const [key, value] of revenueMap.entries()) {
                  if (key.toLowerCase() === chainName.toLowerCase() ||
                      key.toLowerCase().includes(chainName.toLowerCase()) || 
                      chainName.toLowerCase().includes(key.toLowerCase())) {
                    revenue = value;
                    break;
                  }
                }
              }
              
              const revenueData: Partial<Pick<ChainData, 'revenue24h' | 'revenue7d' | 'revenue30d' | 'fees24h' | 'fees7d' | 'fees30d'>> = revenue || {};
              
              return {
                chain: chainName,
                tvl,
                revenue24h: revenueData.revenue24h,
                revenue7d: revenueData.revenue7d,
                revenue30d: revenueData.revenue30d,
                fees24h: revenueData.fees24h,
                fees7d: revenueData.fees7d,
                fees30d: revenueData.fees30d,
              };
            })
            .filter(c => c.tvl > 0)
            .sort((a, b) => (b.tvl || 0) - (a.tvl || 0));

          setChains(chainData);
          setAllAvailableChains(chainData.map(c => c.chain));
        } else {
          // Fetch protocols with revenue data
          // First get all protocols, then fetch revenue for top ones
          const [protocolsResponse, revenueProtocolsResponse] = await Promise.allSettled([
            api.get('/defi/protocols', {
              params: { limit: 500 },
            }),
            api.get('/defi/revenue/protocols', {
              params: { limit: 200 },
            }),
          ]);

          const protocolsData = protocolsResponse.status === 'fulfilled' 
            ? protocolsResponse.value.data.protocols || [] 
            : [];
          
          const revenueProtocols = revenueProtocolsResponse.status === 'fulfilled'
            ? revenueProtocolsResponse.value.data.protocols || []
            : [];

          console.log('Protocols Revenue Response:', revenueProtocols);
          console.log('Number of protocols with revenue:', revenueProtocols.length);

          // Create a map of revenue data by protocol name
          const revenueMap = new Map<string, any>();
          revenueProtocols.forEach((rev: any) => {
            if (rev && rev.protocol) {
              revenueMap.set(rev.protocol.toLowerCase(), rev);
              // Log revenue data for debugging
              if (rev.revenue24h || rev.revenue30d) {
                console.log(`Protocol ${rev.protocol}: 24h=${rev.revenue24h}, 30d=${rev.revenue30d}`);
              }
            }
          });

          // Merge revenue data into protocols
          const protocolsWithRevenue = protocolsData.map((protocol: Protocol) => {
            const revenue = revenueMap.get(protocol.name.toLowerCase());
            if (revenue) {
              return {
                ...protocol,
                revenue24h: revenue.revenue24h,
                revenue7d: revenue.revenue7d,
                revenue30d: revenue.revenue30d,
                fees24h: revenue.fees24h,
                fees7d: revenue.fees7d,
                fees30d: revenue.fees30d,
              };
            }
            return protocol;
          });

          // Separate exchanges from protocols
          // Exchanges are typically categorized as "Dexes", "DEX", "Exchange", "CEX", etc.
          const exchangeCategories = ['dexes', 'dex', 'exchange', 'cex', 'centralized-exchange', 'decentralized-exchange'];
          const isExchange = (protocol: Protocol) => {
            const category = protocol.category?.toLowerCase() || '';
            return exchangeCategories.some(cat => category.includes(cat));
          };

          const regularProtocols = protocolsWithRevenue.filter((p: Protocol) => !isExchange(p));
          const exchangeProtocols = protocolsWithRevenue.filter((p: Protocol) => isExchange(p));

          setProtocols(regularProtocols);
          setExchanges(exchangeProtocols);
          setAllAvailableProtocols(protocolsWithRevenue.map((p: Protocol) => p.name));
        }
      } catch (err: any) {
        console.error('Failed to fetch on-chain overview data:', err);
        setError(err.response?.data?.error || 'Failed to load on-chain overview');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 120000); // Refresh every 2 minutes

    return () => clearInterval(interval);
  }, [viewMode]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.filter-dropdown') && !target.closest('[data-dropdown-trigger]')) {
        setChainsDropdownOpen(false);
        setProtocolsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // Filter and sort data based on current filters
  const getFilteredAndSortedData = () => {
    try {
      if (viewMode === 'chains') {
        if (!chains || chains.length === 0) {
          return [];
        }
        const filtered = chains.filter(chain => {
          if (!chain || !chain.chain) return false;
          // If we have selected chains, only show those
          if (selectedChains.size > 0 && !selectedChains.has(chain.chain)) {
            return false;
          }
          return true;
        });

        // Sort
        filtered.sort((a, b) => {
          if (sortBy === 'chain') {
            const aVal = String(a.chain || '').toLowerCase();
            const bVal = String(b.chain || '').toLowerCase();
            return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
          } else {
            const key = sortBy as keyof ChainData;
            const aVal = Number(a[key]) || 0;
            const bVal = Number(b[key]) || 0;
            return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
          }
        });

        return filtered;
      } else if (viewMode === 'protocols') {
        if (!protocols || protocols.length === 0) {
          return [];
        }
        const filtered = protocols.filter(protocol => {
          if (!protocol || !protocol.name) return false;
          // If we have selected protocols, only show those
          if (selectedProtocols.size > 0 && !selectedProtocols.has(protocol.name)) {
            return false;
          }
          // Filter by chain if selected
          if (selectedChains.size > 0 && protocol.chain && !selectedChains.has(protocol.chain)) {
            return false;
          }
          return true;
        });

        // Sort
        filtered.sort((a, b) => {
          if (sortBy === 'name') {
            const aVal = String(a.name || '').toLowerCase();
            const bVal = String(b.name || '').toLowerCase();
            return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
          } else if (sortBy === 'chain') {
            const aVal = String(a.chain || '').toLowerCase();
            const bVal = String(b.chain || '').toLowerCase();
            return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
          } else {
            const aVal = Number(a[sortBy]) || 0;
            const bVal = Number(b[sortBy]) || 0;
            return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
          }
        });

        return filtered;
      } else { // exchanges
        if (!exchanges || exchanges.length === 0) {
          return [];
        }
        const filtered = exchanges.filter(exchange => {
          if (!exchange || !exchange.name) return false;
          // If we have selected protocols, only show those
          if (selectedProtocols.size > 0 && !selectedProtocols.has(exchange.name)) {
            return false;
          }
          // Filter by chain if selected
          if (selectedChains.size > 0 && exchange.chain && !selectedChains.has(exchange.chain)) {
            return false;
          }
          return true;
        });

        // Sort
        filtered.sort((a, b) => {
          if (sortBy === 'name') {
            const aVal = String(a.name || '').toLowerCase();
            const bVal = String(b.name || '').toLowerCase();
            return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
          } else if (sortBy === 'chain') {
            const aVal = String(a.chain || '').toLowerCase();
            const bVal = String(b.chain || '').toLowerCase();
            return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
          } else {
            const aVal = Number(a[sortBy]) || 0;
            const bVal = Number(b[sortBy]) || 0;
            return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
          }
        });

        return filtered;
      }
    } catch (err) {
      console.error('Error filtering/sorting data:', err);
      return [];
    }
  };

  const filteredData = getFilteredAndSortedData();

  if (loading && chains.length === 0) {
    return <div className="pane-loading">Loading on-chain overview...</div>;
  }

  if (error) {
    return (
      <div className="pane-loading" style={{ color: 'var(--terminal-error)' }}>
        {error}
      </div>
    );
  }

  return (
    <div className="onchain-overview-pane" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--terminal-text)',
    }}>
      <div className="onchain-overview-header" style={{
        padding: '12px',
        borderBottom: '1px solid var(--terminal-border)',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {/* View Mode Toggle */}
        <div style={{
          display: 'flex',
          gap: '4px',
          border: '1px solid var(--terminal-border)',
          borderRadius: '4px',
          padding: '2px',
        }}>
          <button
            onClick={() => setViewMode('chains')}
            style={{
              padding: '6px 12px',
              background: viewMode === 'chains' ? 'var(--terminal-accent)' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: viewMode === 'chains' ? 'var(--terminal-bg)' : 'var(--terminal-text)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: viewMode === 'chains' ? 'bold' : 'normal',
            }}
          >
            Chains
          </button>
          <button
            onClick={() => setViewMode('protocols')}
            style={{
              padding: '6px 12px',
              background: viewMode === 'protocols' ? 'var(--terminal-accent)' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: viewMode === 'protocols' ? 'var(--terminal-bg)' : 'var(--terminal-text)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: viewMode === 'protocols' ? 'bold' : 'normal',
            }}
          >
            Protocols
          </button>
          <button
            onClick={() => setViewMode('exchanges')}
            style={{
              padding: '6px 12px',
              background: viewMode === 'exchanges' ? 'var(--terminal-accent)' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: viewMode === 'exchanges' ? 'var(--terminal-bg)' : 'var(--terminal-text)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: viewMode === 'exchanges' ? 'bold' : 'normal',
            }}
          >
            Exchanges
          </button>
        </div>

        {/* Chain Filter with Checkboxes */}
        <div style={{ position: 'relative' }}>
          <div
            data-dropdown-trigger
            style={{
              padding: '6px 12px',
              background: 'var(--terminal-bg-secondary)',
              border: '1px solid var(--terminal-border)',
              borderRadius: '4px',
              color: 'var(--terminal-text)',
              fontSize: '11px',
              minWidth: '150px',
              cursor: 'pointer',
              position: 'relative',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setChainsDropdownOpen(!chainsDropdownOpen);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Include Chains</span>
              {selectedChains.size > 0 && (
                <span style={{ 
                  background: 'var(--terminal-accent)', 
                  color: 'var(--terminal-bg)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '9px',
                }}>
                  {selectedChains.size}
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: '10px' }}>
                {chainsDropdownOpen ? '▲' : '▼'}
              </span>
            </div>
            {chainsDropdownOpen && (
              <div
                className="filter-dropdown"
                style={{
                  display: 'block',
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  background: 'var(--terminal-bg)',
                  border: '1px solid var(--terminal-border)',
                  borderRadius: '4px',
                  padding: '8px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  minWidth: '200px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
              {allAvailableChains.map(chain => (
                <label
                  key={chain}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 0',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedChains.has(chain)}
                    onChange={(e) => {
                      const newSet = new Set(selectedChains);
                      if (e.target.checked) {
                        newSet.add(chain);
                      } else {
                        newSet.delete(chain);
                      }
                      setSelectedChains(newSet);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{chain}</span>
                </label>
              ))}
              </div>
            )}
          </div>
        </div>

        {/* Protocol Filter (only in protocol and exchange views) */}
        {(viewMode === 'protocols' || viewMode === 'exchanges') && (
          <div style={{ position: 'relative' }}>
            <div
              data-dropdown-trigger
              style={{
                padding: '6px 12px',
                background: 'var(--terminal-bg-secondary)',
                border: '1px solid var(--terminal-border)',
                borderRadius: '4px',
                color: 'var(--terminal-text)',
                fontSize: '11px',
                minWidth: '150px',
                cursor: 'pointer',
                position: 'relative',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setProtocolsDropdownOpen(!protocolsDropdownOpen);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Include Protocols</span>
                {selectedProtocols.size > 0 && (
                  <span style={{ 
                    background: 'var(--terminal-accent)', 
                    color: 'var(--terminal-bg)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '9px',
                  }}>
                    {selectedProtocols.size}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '10px' }}>
                  {protocolsDropdownOpen ? '▲' : '▼'}
                </span>
              </div>
              {protocolsDropdownOpen && (
                <div
                  className="filter-dropdown"
                  style={{
                    display: 'block',
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    background: 'var(--terminal-bg)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    padding: '8px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    minWidth: '250px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                {(viewMode === 'protocols' 
                  ? protocols.map(p => p.name)
                  : viewMode === 'exchanges'
                  ? exchanges.map(e => e.name)
                  : allAvailableProtocols
                ).slice(0, 200).map(protocol => (
                  <label
                    key={protocol}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 0',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProtocols.has(protocol)}
                      onChange={(e) => {
                        const newSet = new Set(selectedProtocols);
                        if (e.target.checked) {
                          newSet.add(protocol);
                        } else {
                          newSet.delete(protocol);
                        }
                        setSelectedProtocols(newSet);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{protocol}</span>
                  </label>
                ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          style={{
            padding: '6px 12px',
            background: 'var(--terminal-bg-secondary)',
            border: '1px solid var(--terminal-border)',
            borderRadius: '4px',
            color: 'var(--terminal-text)',
            fontSize: '11px',
          }}
        >
          <option value="tvl">Sort by TVL</option>
          {(viewMode === 'protocols' || viewMode === 'exchanges') && <option value="name">Sort by Name</option>}
          {viewMode === 'chains' && <option value="chain">Sort by Chain</option>}
          <option value="revenue24h">Sort by Revenue (24h)</option>
          <option value="revenue30d">Sort by Revenue (30d)</option>
          {(viewMode === 'protocols' || viewMode === 'exchanges') && (
            <>
              <option value="change_1d">Sort by Change (1d)</option>
              <option value="change_7d">Sort by Change (7d)</option>
            </>
          )}
        </select>

        <button
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          style={{
            padding: '6px 12px',
            background: 'var(--terminal-bg-secondary)',
            border: '1px solid var(--terminal-border)',
            borderRadius: '4px',
            color: 'var(--terminal-text)',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          {sortOrder === 'desc' ? '↓' : '↑'}
        </button>

        {/* Clear Filters */}
        {(selectedChains.size > 0 || selectedProtocols.size > 0) && (
          <button
            onClick={() => {
              setSelectedChains(new Set());
              setSelectedProtocols(new Set());
            }}
            style={{
              padding: '6px 12px',
              background: 'var(--terminal-error)',
              border: '1px solid var(--terminal-border)',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="onchain-overview-content" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
      }}>
        {viewMode === 'chains' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Chain TVL Comparison</h3>
              <div style={{ color: '#f0f0f0' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={filteredData.slice(0, 15).map((c: any) => ({ chain: c.chain, tvl: c.tvl || 0 }))}
                    margin={{ bottom: 60, left: 10, right: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" />
                    <XAxis
                      dataKey="chain"
                      stroke="#f0f0f0"
                      tick={<CustomXAxisTick />}
                      height={80}
                      axisLine={{ stroke: '#f0f0f0' }}
                      tickLine={{ stroke: '#f0f0f0' }}
                    />
                    <YAxis
                      stroke="#f0f0f0"
                      tick={(props) => <CustomYAxisTick {...props} formatCurrency={formatCurrency} />}
                      axisLine={{ stroke: '#f0f0f0' }}
                      tickLine={{ stroke: '#f0f0f0' }}
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
            </div>

            <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Chain Details ({filteredData.length} chains)</h3>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                  <th style={{ padding: '8px', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setSortBy('chain'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>Chain</th>
                  <th style={{ padding: '8px', textAlign: 'right', cursor: 'pointer' }} onClick={() => { setSortBy('tvl'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>TVL</th>
                  <th style={{ padding: '8px', textAlign: 'right', cursor: 'pointer' }} onClick={() => { setSortBy('revenue24h'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>Revenue (24h)</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Revenue (7d)</th>
                  <th style={{ padding: '8px', textAlign: 'right', cursor: 'pointer' }} onClick={() => { setSortBy('revenue30d'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>Revenue (30d)</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((chain: any) => (
                  <tr key={chain.chain} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{chain.chain}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {formatCurrency(chain.tvl || 0)}
                    </td>
                    <td style={{ 
                      padding: '8px', 
                      textAlign: 'right',
                      color: (chain.revenue24h && chain.revenue24h > 0) ? 'var(--terminal-text)' : 'var(--terminal-dim)',
                      fontWeight: (chain.revenue24h && chain.revenue24h > 0) ? 'bold' : 'normal',
                    }}>
                      {(chain.revenue24h && chain.revenue24h > 0) ? formatCurrency(chain.revenue24h) : '-'}
                    </td>
                    <td style={{ 
                      padding: '8px', 
                      textAlign: 'right',
                      color: (chain.revenue7d && chain.revenue7d > 0) ? 'var(--terminal-text)' : 'var(--terminal-dim)',
                      fontWeight: (chain.revenue7d && chain.revenue7d > 0) ? 'bold' : 'normal',
                    }}>
                      {(chain.revenue7d && chain.revenue7d > 0) ? formatCurrency(chain.revenue7d) : '-'}
                    </td>
                    <td style={{ 
                      padding: '8px', 
                      textAlign: 'right',
                      color: (chain.revenue30d && chain.revenue30d > 0) ? 'var(--terminal-text)' : 'var(--terminal-dim)',
                      fontWeight: (chain.revenue30d && chain.revenue30d > 0) ? 'bold' : 'normal',
                    }}>
                      {(chain.revenue30d && chain.revenue30d > 0) ? formatCurrency(chain.revenue30d) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(viewMode === 'protocols' || viewMode === 'exchanges') && (
          <div>
            {loading && (viewMode === 'protocols' ? protocols.length === 0 : exchanges.length === 0) ? (
              <div className="pane-loading">Loading {viewMode}...</div>
            ) : error ? (
              <div style={{ color: 'var(--terminal-error)', padding: '12px' }}>
                {error}
              </div>
            ) : (
              <>
                <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>
                  {viewMode === 'protocols' ? 'Protocols' : 'Exchanges'} ({filteredData.length} {viewMode === 'protocols' ? 'protocols' : 'exchanges'})
                </h3>
                {filteredData.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--terminal-dim)' }}>
                    No {viewMode} found. Try adjusting your filters.
                  </div>
                ) : (
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                        <th style={{ padding: '8px', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>{viewMode === 'protocols' ? 'Protocol' : 'Exchange'}</th>
                        <th style={{ padding: '8px', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setSortBy('chain'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>Chain</th>
                        <th style={{ padding: '8px', textAlign: 'right', cursor: 'pointer' }} onClick={() => { setSortBy('tvl'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>TVL</th>
                        <th style={{ padding: '8px', textAlign: 'right', cursor: 'pointer' }} onClick={() => { setSortBy('change_1d'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>Change (1d)</th>
                        <th style={{ padding: '8px', textAlign: 'right', cursor: 'pointer' }} onClick={() => { setSortBy('change_7d'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>Change (7d)</th>
                        <th style={{ padding: '8px', textAlign: 'right', cursor: 'pointer' }} onClick={() => { setSortBy('revenue24h'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>Revenue (24h)</th>
                        <th style={{ padding: '8px', textAlign: 'right', cursor: 'pointer' }} onClick={() => { setSortBy('revenue30d'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>Revenue (30d)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((protocol: any) => {
                        if (!protocol || !protocol.name) return null;
                        return (
                          <tr key={protocol.id || protocol.name} style={{ borderBottom: '1px solid var(--terminal-border)', cursor: 'pointer' }} onClick={() => {
                            // Navigate to protocol detail - you might want to add navigation logic here
                            if (protocol.id) {
                              window.location.hash = `defi-protocol-${protocol.id}`;
                            }
                          }}>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>{protocol.name || '-'}</td>
                            <td style={{ padding: '8px' }}>{protocol.chain || '-'}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>
                              {formatCurrency(protocol.tvl || 0)}
                            </td>
                            <td style={{ 
                              padding: '8px', 
                              textAlign: 'right',
                              color: protocol.change_1d !== undefined && protocol.change_1d !== null ? (protocol.change_1d >= 0 ? 'var(--terminal-success)' : 'var(--terminal-error)') : 'var(--terminal-dim)',
                            }}>
                              {protocol.change_1d !== undefined && protocol.change_1d !== null ? formatPercent(protocol.change_1d) : '-'}
                            </td>
                            <td style={{ 
                              padding: '8px', 
                              textAlign: 'right',
                              color: protocol.change_7d !== undefined && protocol.change_7d !== null ? (protocol.change_7d >= 0 ? 'var(--terminal-success)' : 'var(--terminal-error)') : 'var(--terminal-dim)',
                            }}>
                              {protocol.change_7d !== undefined && protocol.change_7d !== null ? formatPercent(protocol.change_7d) : '-'}
                            </td>
                            <td style={{ 
                              padding: '8px', 
                              textAlign: 'right',
                              color: (protocol.revenue24h && protocol.revenue24h > 0) ? 'var(--terminal-text)' : 'var(--terminal-dim)',
                            }}>
                              {(protocol.revenue24h && protocol.revenue24h > 0) ? formatCurrency(protocol.revenue24h) : '-'}
                            </td>
                            <td style={{ 
                              padding: '8px', 
                              textAlign: 'right',
                              color: (protocol.revenue30d && protocol.revenue30d > 0) ? 'var(--terminal-text)' : 'var(--terminal-dim)',
                            }}>
                              {(protocol.revenue30d && protocol.revenue30d > 0) ? formatCurrency(protocol.revenue30d) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'overview' && viewMode === 'chains' && (
          <div>
            {/* This is now handled by viewMode === 'chains' above */}
          </div>
        )}

      </div>
    </div>
  );
}

