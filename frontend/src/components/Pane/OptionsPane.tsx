import { useEffect, useState, useMemo } from 'react';
import type { Pane } from '@shared/types';
import { marketDataApi } from '../../services/api';

interface OptionsPaneProps {
  pane: Pane;
}

interface OptionContract {
  contract_type: 'call' | 'put';
  strike_price: number;
  expiration_date: string;
  ticker: string;
  bid?: number;
  ask?: number;
  last?: number;
  volume?: number;
  open_interest?: number;
  implied_volatility?: number;
  change?: number;
  percentChange?: number;
  inTheMoney?: boolean;
}

interface OptionsData {
  symbol: string;
  underlyingPrice?: number;
  expirationDates: string[];
  strikes: number[];
  calls: OptionContract[];
  puts: OptionContract[];
}

export function OptionsPane({ pane }: OptionsPaneProps) {
  const [optionsData, setOptionsData] = useState<OptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [strikeFilter, setStrikeFilter] = useState<'all' | 'itm' | 'otm' | 'near'>('near');

  useEffect(() => {
    if (!pane.ticker) return;

    const fetchOptions = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await marketDataApi.getOptions(pane.ticker!);
        
        // Normalize expiration dates to YYYY-MM-DD format
        const normalizedData = {
          ...data,
          expirationDates: (data.expirationDates || []).map((date: any) => {
            if (typeof date === 'number') {
              return new Date(date * 1000).toISOString().split('T')[0];
            }
            if (typeof date === 'string') {
              const parsed = new Date(date);
              if (!isNaN(parsed.getTime())) {
                return parsed.toISOString().split('T')[0];
              }
            }
            return date;
          }).filter(Boolean).sort(),
        };
        
        setOptionsData(normalizedData);
        
        if (normalizedData.expirationDates && normalizedData.expirationDates.length > 0) {
          setSelectedExpiration(normalizedData.expirationDates[0]);
        }
      } catch (err: any) {
        console.error('Error fetching options:', err);
        setError(err.message || 'Failed to load options data');
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [pane.ticker]);

  // Memoized filtered data
  const { filteredCalls, filteredPuts, strikesInRange, strikeMap } = useMemo(() => {
    if (!optionsData) {
      return { filteredCalls: [], filteredPuts: [], strikesInRange: [], strikeMap: new Map() };
    }

    const normalizeDate = (dateStr: any): string => {
      if (typeof dateStr === 'number') {
        return new Date(dateStr * 1000).toISOString().split('T')[0];
      }
      if (typeof dateStr === 'string') {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
        return dateStr;
      }
      return String(dateStr);
    };

    const calls = optionsData.calls.filter(
      (call) => normalizeDate(call.expiration_date) === selectedExpiration
    );
    const puts = optionsData.puts.filter(
      (put) => normalizeDate(put.expiration_date) === selectedExpiration
    );

    // Get unique strikes for the selected expiration
    let availableStrikes = Array.from(
      new Set([
        ...calls.map((c) => c.strike_price),
        ...puts.map((p) => p.strike_price),
      ])
    ).sort((a, b) => a - b);

    // Apply strike filter
    const underlyingPrice = optionsData.underlyingPrice || 0;
    if (strikeFilter === 'near' && underlyingPrice > 0) {
      // Show strikes within 20% of current price
      const minStrike = underlyingPrice * 0.8;
      const maxStrike = underlyingPrice * 1.2;
      availableStrikes = availableStrikes.filter(s => s >= minStrike && s <= maxStrike);
    } else if (strikeFilter === 'itm' && underlyingPrice > 0) {
      // ITM: calls below price, puts above price
      availableStrikes = availableStrikes.filter(s => {
        const hasItmCall = calls.some(c => c.strike_price === s && s < underlyingPrice);
        const hasItmPut = puts.some(p => p.strike_price === s && s > underlyingPrice);
        return hasItmCall || hasItmPut;
      });
    } else if (strikeFilter === 'otm' && underlyingPrice > 0) {
      // OTM: calls above price, puts below price
      availableStrikes = availableStrikes.filter(s => {
        const hasOtmCall = calls.some(c => c.strike_price === s && s > underlyingPrice);
        const hasOtmPut = puts.some(p => p.strike_price === s && s < underlyingPrice);
        return hasOtmCall || hasOtmPut;
      });
    }

    // Create strike map
    const map = new Map<number, { call?: OptionContract; put?: OptionContract }>();
    availableStrikes.forEach((strike) => {
      const call = calls.find((c) => c.strike_price === strike);
      const put = puts.find((p) => p.strike_price === strike);
      map.set(strike, { call, put });
    });

    return {
      filteredCalls: calls,
      filteredPuts: puts,
      strikesInRange: availableStrikes,
      strikeMap: map,
    };
  }, [optionsData, selectedExpiration, strikeFilter]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: 'var(--terminal-dim)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>Loading options chain...</div>
          <div style={{ fontSize: '11px' }}>This may take a few seconds</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--terminal-error)', marginBottom: '8px' }}>{error}</p>
        <p style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginTop: '8px' }}>
          Options data may not be available for all symbols.
        </p>
      </div>
    );
  }

  if (!optionsData || optionsData.expirationDates.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>No options data available for {pane.ticker}</p>
      </div>
    );
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  const formatPrice = (price?: number): string => {
    if (price === undefined || price === null || price === 0) return '-';
    return price.toFixed(2);
  };

  const formatPercent = (value?: number): string => {
    if (value === undefined || value === null) return '-';
    return (value * 100).toFixed(1) + '%';
  };

  const formatVolume = (vol?: number): string => {
    if (!vol) return '-';
    if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
    return vol.toString();
  };

  const underlyingPrice = optionsData.underlyingPrice || 0;

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      fontSize: '12px',
      color: 'var(--terminal-text)',
    }}>
      {/* Header with underlying price */}
      <div style={{ 
        padding: '12px 16px',
        borderBottom: '1px solid var(--terminal-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--terminal-bg-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <span style={{ color: 'var(--terminal-dim)', marginRight: '8px' }}>Underlying:</span>
            <span style={{ 
              fontWeight: 'bold', 
              fontSize: '14px',
              color: 'var(--terminal-accent)',
            }}>
              ${underlyingPrice.toFixed(2)}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--terminal-dim)', marginRight: '8px' }}>Contracts:</span>
            <span>{filteredCalls.length + filteredPuts.length}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ 
        padding: '12px 16px',
        borderBottom: '1px solid var(--terminal-border)',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: 'var(--terminal-dim)' }}>Expiration:</label>
          <select
            value={selectedExpiration}
            onChange={(e) => setSelectedExpiration(e.target.value)}
            style={{
              background: 'var(--terminal-bg)',
              border: '1px solid var(--terminal-border)',
              borderRadius: '4px',
              padding: '4px 8px',
              color: 'var(--terminal-text)',
              fontSize: '12px',
            }}
          >
            {optionsData.expirationDates.map((date) => (
              <option key={date} value={date}>
                {formatDate(date)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: 'var(--terminal-dim)' }}>Strikes:</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['near', 'all', 'itm', 'otm'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStrikeFilter(filter)}
                style={{
                  background: strikeFilter === filter ? 'var(--terminal-accent)' : 'var(--terminal-bg)',
                  border: '1px solid var(--terminal-border)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: strikeFilter === filter ? '#000' : 'var(--terminal-text)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Options Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '11px',
        }}>
          <thead style={{ 
            position: 'sticky', 
            top: 0, 
            background: 'var(--terminal-bg)',
            zIndex: 1,
          }}>
            <tr>
              <th colSpan={6} style={{ 
                padding: '8px', 
                textAlign: 'center',
                background: 'rgba(0, 255, 136, 0.1)',
                color: 'var(--terminal-green, #00ff88)',
                borderBottom: '1px solid var(--terminal-border)',
              }}>
                CALLS
              </th>
              <th style={{ 
                padding: '8px',
                background: 'var(--terminal-bg-secondary)',
                borderBottom: '1px solid var(--terminal-border)',
              }}>
                STRIKE
              </th>
              <th colSpan={6} style={{ 
                padding: '8px', 
                textAlign: 'center',
                background: 'rgba(255, 68, 68, 0.1)',
                color: 'var(--terminal-error, #ff4444)',
                borderBottom: '1px solid var(--terminal-border)',
              }}>
                PUTS
              </th>
            </tr>
            <tr style={{ color: 'var(--terminal-dim)' }}>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'normal' }}>Last</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'normal' }}>Bid</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'normal' }}>Ask</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'normal' }}>Vol</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'normal' }}>OI</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'normal' }}>IV</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}></th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'normal' }}>Last</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'normal' }}>Bid</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'normal' }}>Ask</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'normal' }}>Vol</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'normal' }}>OI</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'normal' }}>IV</th>
            </tr>
          </thead>
          <tbody>
            {strikesInRange.map((strike) => {
              const { call, put } = strikeMap.get(strike) || {};
              const isAtMoney = underlyingPrice > 0 && Math.abs(strike - underlyingPrice) / underlyingPrice < 0.02;
              const callItm = underlyingPrice > 0 && strike < underlyingPrice;
              const putItm = underlyingPrice > 0 && strike > underlyingPrice;

              return (
                <tr 
                  key={strike} 
                  style={{ 
                    borderBottom: '1px solid var(--terminal-border)',
                    background: isAtMoney ? 'rgba(74, 158, 255, 0.1)' : 'transparent',
                  }}
                >
                  {/* Call columns */}
                  <td style={{ 
                    padding: '6px 8px', 
                    textAlign: 'right',
                    background: callItm ? 'rgba(0, 255, 136, 0.05)' : 'transparent',
                    fontWeight: callItm ? 'bold' : 'normal',
                  }}>
                    {formatPrice(call?.last)}
                  </td>
                  <td style={{ 
                    padding: '6px 8px', 
                    textAlign: 'right',
                    background: callItm ? 'rgba(0, 255, 136, 0.05)' : 'transparent',
                    color: 'var(--terminal-green, #00ff88)',
                  }}>
                    {formatPrice(call?.bid)}
                  </td>
                  <td style={{ 
                    padding: '6px 8px', 
                    textAlign: 'right',
                    background: callItm ? 'rgba(0, 255, 136, 0.05)' : 'transparent',
                    color: 'var(--terminal-error, #ff4444)',
                  }}>
                    {formatPrice(call?.ask)}
                  </td>
                  <td style={{ 
                    padding: '6px 8px', 
                    textAlign: 'right',
                    background: callItm ? 'rgba(0, 255, 136, 0.05)' : 'transparent',
                    color: 'var(--terminal-dim)',
                  }}>
                    {formatVolume(call?.volume)}
                  </td>
                  <td style={{ 
                    padding: '6px 8px', 
                    textAlign: 'right',
                    background: callItm ? 'rgba(0, 255, 136, 0.05)' : 'transparent',
                    color: 'var(--terminal-dim)',
                  }}>
                    {formatVolume(call?.open_interest)}
                  </td>
                  <td style={{ 
                    padding: '6px 8px', 
                    textAlign: 'right',
                    background: callItm ? 'rgba(0, 255, 136, 0.05)' : 'transparent',
                    color: 'var(--terminal-dim)',
                  }}>
                    {formatPercent(call?.implied_volatility)}
                  </td>
                  
                  {/* Strike column */}
                  <td style={{ 
                    padding: '6px 8px', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    background: isAtMoney ? 'rgba(74, 158, 255, 0.2)' : 'var(--terminal-bg-secondary)',
                    color: isAtMoney ? 'var(--terminal-accent)' : 'var(--terminal-text)',
                  }}>
                    {strike.toFixed(2)}
                  </td>
                  
                  {/* Put columns */}
                  <td style={{ 
                    padding: '6px 8px', 
                    textAlign: 'right',
                    background: putItm ? 'rgba(255, 68, 68, 0.05)' : 'transparent',
                    fontWeight: putItm ? 'bold' : 'normal',
                  }}>
                    {formatPrice(put?.last)}
                  </td>
                  <td style={{ 
                    padding: '6px 8px', 
                    textAlign: 'right',
                    background: putItm ? 'rgba(255, 68, 68, 0.05)' : 'transparent',
                    color: 'var(--terminal-green, #00ff88)',
                  }}>
                    {formatPrice(put?.bid)}
                  </td>
                  <td style={{ 
                    padding: '6px 8px', 
                    textAlign: 'right',
                    background: putItm ? 'rgba(255, 68, 68, 0.05)' : 'transparent',
                    color: 'var(--terminal-error, #ff4444)',
                  }}>
                    {formatPrice(put?.ask)}
                  </td>
                  <td style={{ 
                    padding: '6px 8px', 
                    textAlign: 'right',
                    background: putItm ? 'rgba(255, 68, 68, 0.05)' : 'transparent',
                    color: 'var(--terminal-dim)',
                  }}>
                    {formatVolume(put?.volume)}
                  </td>
                  <td style={{ 
                    padding: '6px 8px', 
                    textAlign: 'right',
                    background: putItm ? 'rgba(255, 68, 68, 0.05)' : 'transparent',
                    color: 'var(--terminal-dim)',
                  }}>
                    {formatVolume(put?.open_interest)}
                  </td>
                  <td style={{ 
                    padding: '6px 8px', 
                    textAlign: 'right',
                    background: putItm ? 'rgba(255, 68, 68, 0.05)' : 'transparent',
                    color: 'var(--terminal-dim)',
                  }}>
                    {formatPercent(put?.implied_volatility)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {strikesInRange.length === 0 && (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: 'var(--terminal-dim)' 
          }}>
            No options available for selected filters
          </div>
        )}
      </div>

      {/* Footer with legend */}
      <div style={{ 
        padding: '8px 16px',
        borderTop: '1px solid var(--terminal-border)',
        background: 'var(--terminal-bg-secondary)',
        fontSize: '10px',
        color: 'var(--terminal-dim)',
        display: 'flex',
        gap: '16px',
      }}>
        <span>
          <span style={{ 
            display: 'inline-block', 
            width: '8px', 
            height: '8px', 
            background: 'rgba(0, 255, 136, 0.3)', 
            marginRight: '4px' 
          }}></span>
          ITM Calls
        </span>
        <span>
          <span style={{ 
            display: 'inline-block', 
            width: '8px', 
            height: '8px', 
            background: 'rgba(255, 68, 68, 0.3)', 
            marginRight: '4px' 
          }}></span>
          ITM Puts
        </span>
        <span>
          <span style={{ 
            display: 'inline-block', 
            width: '8px', 
            height: '8px', 
            background: 'rgba(74, 158, 255, 0.3)', 
            marginRight: '4px' 
          }}></span>
          At the Money
        </span>
        <span style={{ marginLeft: 'auto' }}>
          Vol = Volume • OI = Open Interest • IV = Implied Volatility
        </span>
      </div>
    </div>
  );
}
