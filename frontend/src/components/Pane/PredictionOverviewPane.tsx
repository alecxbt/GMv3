import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

interface Market {
  id: string;
  question: string;
  slug: string;
  volume24h?: number;
  volume7d?: number;
  volume30d?: number;
  liquidity?: number;
  yesPrice?: number;
  noPrice?: number;
  endDate?: string;
  category?: string;
  subcategory?: string;
  active?: boolean;
  outcomePrices?: {
    YES?: number;
    NO?: number;
  };
}

interface PredictionOverviewPaneProps {
  pane: Pane;
}

export function PredictionOverviewPane({ pane }: PredictionOverviewPaneProps) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'markets' | 'categories'>('markets');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'volume24h' | 'volume7d' | 'volume30d' | 'liquidity' | 'yesPrice' | 'noPrice' | 'question'>('volume24h');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get('/prediction/markets', {
          params: { limit: 1000 },
        });
        const marketsData = response.data.markets || [];
        setMarkets(marketsData);
        
        // Extract unique categories
        const categories = Array.from(new Set(
          marketsData
            .map((m: Market) => m.category)
            .filter(Boolean)
        )) as string[];
        setAllCategories(categories.sort());
      } catch (err: any) {
        console.error('Failed to fetch prediction markets data:', err);
        setError(err.response?.data?.error || 'Failed to load prediction markets');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 120000); // Refresh every 2 minutes

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Filter and sort data based on current filters
  const getFilteredAndSortedData = () => {
    try {
      if (!markets || markets.length === 0) {
        return [];
      }

      const filtered = markets.filter((market: Market) => {
        if (!market || !market.question) return false;

        // Search filter
        if (searchQuery && !market.question.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }

        // Category filters
        if (selectedCategories.size > 0 && market.category && !selectedCategories.has(market.category)) {
          return false;
        }

        // Only show active markets in default view
        if (viewMode === 'markets' && market.active === false) {
          return false;
        }

        return true;
      });

      // Sort
      filtered.sort((a, b) => {
        if (sortBy === 'question') {
          const aVal = String(a.question || '').toLowerCase();
          const bVal = String(b.question || '').toLowerCase();
          return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        } else if (sortBy === 'noPrice') {
          // Calculate noPrice if not directly available
          const aYesPrice = a.yesPrice || a.outcomePrices?.YES || 0;
          const bYesPrice = b.yesPrice || b.outcomePrices?.YES || 0;
          const aVal = a.noPrice || a.outcomePrices?.NO || (aYesPrice > 0 ? 1 - aYesPrice : 0);
          const bVal = b.noPrice || b.outcomePrices?.NO || (bYesPrice > 0 ? 1 - bYesPrice : 0);
          return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        } else {
          const aVal = Number(a[sortBy]) || 0;
          const bVal = Number(b[sortBy]) || 0;
          return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        }
      });

      return filtered;
    } catch (err) {
      console.error('Error filtering/sorting data:', err);
      return [];
    }
  };

  const filteredData = getFilteredAndSortedData();

  // Calculate category totals
  const categoryTotals = allCategories.reduce((acc, category) => {
    const categoryMarkets = markets.filter(m => m.category === category);
    acc[category] = {
      count: categoryMarkets.length,
      volume24h: categoryMarkets.reduce((sum, m) => sum + (m.volume24h || 0), 0),
      volume30d: categoryMarkets.reduce((sum, m) => sum + (m.volume30d || 0), 0),
    };
    return acc;
  }, {} as Record<string, { count: number; volume24h: number; volume30d: number }>);

  if (loading && markets.length === 0) {
    return <div className="pane-loading">Loading prediction markets...</div>;
  }

  if (error) {
    return (
      <div className="pane-loading" style={{ color: 'var(--terminal-error)' }}>
        {error}
      </div>
    );
  }

  return (
    <div className="prediction-overview-pane" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--terminal-text)',
    }}>
      <div className="prediction-overview-header" style={{
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
            onClick={() => setViewMode('markets')}
            style={{
              padding: '6px 12px',
              background: viewMode === 'markets' ? 'var(--terminal-accent)' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: viewMode === 'markets' ? 'var(--terminal-bg)' : 'var(--terminal-text)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: viewMode === 'markets' ? 'bold' : 'normal',
            }}
          >
            Markets
          </button>
          <button
            onClick={() => setViewMode('categories')}
            style={{
              padding: '6px 12px',
              background: viewMode === 'categories' ? 'var(--terminal-accent)' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: viewMode === 'categories' ? 'var(--terminal-bg)' : 'var(--terminal-text)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: viewMode === 'categories' ? 'bold' : 'normal',
            }}
          >
            Categories
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search markets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '6px 12px',
            background: 'var(--terminal-bg-secondary)',
            border: '1px solid var(--terminal-border)',
            borderRadius: '4px',
            color: 'var(--terminal-text)',
            fontSize: '11px',
            minWidth: '200px',
          }}
        />

        {/* Category Filter with Checkboxes */}
        <div style={{ position: 'relative' }}>
          <div
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
            onMouseEnter={(e) => {
              const dropdown = e.currentTarget.querySelector('.filter-dropdown') as HTMLElement;
              if (dropdown) dropdown.style.display = 'block';
            }}
            onMouseLeave={(e) => {
              const dropdown = e.currentTarget.querySelector('.filter-dropdown') as HTMLElement;
              if (dropdown) dropdown.style.display = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Include Categories</span>
              {selectedCategories.size > 0 && (
                <span style={{ 
                  background: 'var(--terminal-accent)', 
                  color: 'var(--terminal-bg)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '9px',
                }}>
                  {selectedCategories.size}
                </span>
              )}
            </div>
            <div
              className="filter-dropdown"
              style={{
                display: 'none',
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
            >
              {allCategories.map(category => (
                <label
                  key={category}
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
                    checked={selectedCategories.has(category)}
                    onChange={(e) => {
                      const newSet = new Set(selectedCategories);
                      if (e.target.checked) {
                        newSet.add(category);
                      } else {
                        newSet.delete(category);
                      }
                      setSelectedCategories(newSet);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

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
          <option value="volume24h">Sort by Volume (24h)</option>
          <option value="volume7d">Sort by Volume (7d)</option>
          <option value="volume30d">Sort by Volume (30d)</option>
          <option value="liquidity">Sort by Liquidity</option>
          <option value="yesPrice">Sort by Yes Price</option>
          <option value="noPrice">Sort by No Price</option>
          <option value="question">Sort by Question</option>
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
        {(selectedCategories.size > 0 || searchQuery) && (
          <button
            onClick={() => {
              setSelectedCategories(new Set());
              setSearchQuery('');
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

      <div className="prediction-overview-content" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
      }}>
        {viewMode === 'markets' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Top 50 Markets by Volume (24h)</h3>
              <div style={{ color: '#f0f0f0' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={filteredData.slice(0, 50).map((m: any) => ({ 
                      question: m.question?.substring(0, 30) + '...' || 'Unknown',
                      volume: m.volume24h || 0 
                    }))}
                    margin={{ bottom: 60, left: 10, right: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" />
                    <XAxis
                      dataKey="question"
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
                    <Bar dataKey="volume" fill="var(--terminal-accent)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Top 50 Markets by Volume ({Math.min(filteredData.length, 50)} markets)</h3>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                  <th style={{ padding: '8px', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setSortBy('question'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>Question</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '8px', textAlign: 'right', cursor: 'pointer' }} onClick={() => { setSortBy('volume24h'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>Volume (24h)</th>
                  <th style={{ padding: '8px', textAlign: 'right', cursor: 'pointer' }} onClick={() => { setSortBy('volume30d'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>Volume (30d)</th>
                  <th style={{ padding: '8px', textAlign: 'right', cursor: 'pointer' }} onClick={() => { setSortBy('liquidity'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>Liquidity</th>
                  <th style={{ padding: '8px', textAlign: 'right', cursor: 'pointer' }} onClick={() => { setSortBy('yesPrice'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>Yes Price</th>
                  <th style={{ padding: '8px', textAlign: 'right', cursor: 'pointer' }} onClick={() => { setSortBy('noPrice'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}>No Price</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 50).map((market: any) => {
                  if (!market || !market.question) return null;
                  const yesPrice = market.yesPrice || market.outcomePrices?.YES || 0;
                  const noPrice = market.noPrice || market.outcomePrices?.NO || (yesPrice > 0 ? (1 - yesPrice) : 0);
                  return (
                    <tr key={market.id || market.slug} style={{ borderBottom: '1px solid var(--terminal-border)', cursor: 'pointer' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{market.question}</td>
                      <td style={{ padding: '8px' }}>{market.category || '-'}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {market.volume24h ? formatCurrency(market.volume24h) : '-'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {market.volume30d ? formatCurrency(market.volume30d) : '-'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {market.liquidity ? formatCurrency(market.liquidity) : '-'}
                      </td>
                      <td style={{ 
                        padding: '8px', 
                        textAlign: 'right',
                        color: yesPrice > 0.5 ? 'var(--terminal-success)' : 'var(--terminal-error)',
                        fontWeight: 'bold',
                      }}>
                        {yesPrice > 0 ? formatPercent(yesPrice) : '-'}
                      </td>
                      <td style={{ 
                        padding: '8px', 
                        textAlign: 'right',
                        color: noPrice > 0.5 ? 'var(--terminal-success)' : 'var(--terminal-error)',
                        fontWeight: 'bold',
                      }}>
                        {noPrice > 0 ? formatPercent(noPrice) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'categories' && (
          <div>
            <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>Categories ({allCategories.length} categories)</h3>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Markets</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Volume (24h)</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Volume (30d)</th>
                </tr>
              </thead>
              <tbody>
                {allCategories
                  .filter(cat => {
                    if (selectedCategories.size > 0 && !selectedCategories.has(cat)) return false;
                    return true;
                  })
                  .map((category) => {
                    const totals = categoryTotals[category];
                    return (
                      <tr key={category} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{category}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{totals.count}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          {formatCurrency(totals.volume24h)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          {formatCurrency(totals.volume30d)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

