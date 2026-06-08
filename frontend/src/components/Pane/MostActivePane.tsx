import { useEffect, useState } from 'react';
import type { Pane } from '../../../shared/src/types';
import { marketDataApi } from '../../services/api';

interface MostActivePaneProps {
  pane: Pane;
}

interface MostActiveStock {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  volumeInMillions: number;
}

export function MostActivePane({ pane }: MostActivePaneProps) {
  const [stocks, setStocks] = useState<MostActiveStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMostActive = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await marketDataApi.getMostActive();
        // Transform data to include volume in millions
        const transformedStocks = (data.stocks || []).map((stock: any) => ({
          symbol: stock.symbol || stock.ticker || '',
          price: stock.price || 0,
          change: stock.change || 0,
          changePercent: stock.changePercent || 0,
          volume: stock.volume || 0,
          volumeInMillions: (stock.volume || 0) / 1000000,
        }));
        setStocks(transformedStocks);
      } catch (err: any) {
        console.error('Error fetching most active stocks:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load most active stocks');
        setStocks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMostActive();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMostActive, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="pane-loading">Loading most active stocks...</div>;
  }

  if (error && stocks.length === 0) {
    return (
      <div className="pane-loading" style={{ color: 'var(--terminal-error)' }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div className="most-active-pane" style={{
      height: '100%',
      overflowY: 'auto',
      padding: '16px',
      color: 'var(--terminal-text)',
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '4px',
        }}>
          Most Active Stocks
        </h3>
        <p style={{
          fontSize: '11px',
          color: 'var(--terminal-dim)',
        }}>
          Top stocks by trading volume today
        </p>
      </div>

      {stocks.length === 0 ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: 'var(--terminal-dim)',
        }}>
          No data available
        </div>
      ) : (
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px',
        }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--terminal-border)',
              textAlign: 'left',
            }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Symbol</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Change</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Change %</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Volume (M)</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, index) => (
              <tr key={stock.symbol || index} style={{
                borderBottom: '1px solid var(--terminal-border)',
              }}>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{stock.symbol}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  ${stock.price.toFixed(2)}
                </td>
                <td style={{
                  padding: '8px',
                  textAlign: 'right',
                  color: stock.change >= 0 ? 'var(--terminal-success)' : 'var(--terminal-error)',
                }}>
                  {stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}
                </td>
                <td style={{
                  padding: '8px',
                  textAlign: 'right',
                  color: stock.changePercent >= 0 ? 'var(--terminal-success)' : 'var(--terminal-error)',
                }}>
                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  {stock.volumeInMillions.toFixed(2)}M
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

