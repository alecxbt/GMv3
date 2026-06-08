import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Pane, Portfolio } from '../../../shared/src/types';
import api from '../../services/api';

interface PortfolioPaneProps {
  pane: Pane;
}

export function PortfolioPane({ pane }: PortfolioPaneProps) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/portfolio');
        if (response.data) {
          setPortfolio(response.data);
        } else {
          // Empty portfolio
          setPortfolio({
            positions: [],
            totalValue: 0,
            totalCost: 0,
            totalPnl: 0,
            totalPnlPercent: 0,
          });
        }
      } catch (err: any) {
        console.error('Failed to fetch portfolio:', err);
        setError(err.response?.data?.error || 'Failed to load portfolio');
        // Set empty portfolio on error
        setPortfolio({
          positions: [],
          totalValue: 0,
          totalCost: 0,
          totalPnl: 0,
          totalPnlPercent: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  if (loading) {
    return <div className="pane-loading">Loading portfolio...</div>;
  }

  if (error && !portfolio) {
    return (
      <div className="pane-loading" style={{ color: 'var(--terminal-error)' }}>
        {error}
      </div>
    );
  }

  if (!portfolio || portfolio.positions.length === 0) {
    return (
      <div className="portfolio-pane" style={{ 
        padding: '20px',
        color: 'var(--terminal-text)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ 
          textAlign: 'center',
          color: 'var(--terminal-dim)',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>📊</div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>Your portfolio is empty</div>
          <div style={{ fontSize: '12px', color: 'var(--terminal-dim)' }}>
            Use <code style={{ 
              background: 'var(--terminal-bg-secondary)', 
              padding: '2px 6px', 
              borderRadius: '3px' 
            }}>PORT ADD TICKER SHARES</code> to add positions
          </div>
        </div>
      </div>
    );
  }

  const pieData = portfolio.positions.map((pos) => ({
    name: pos.ticker,
    value: pos.currentPrice * pos.shares,
  }));

  const COLORS = ['#58a6ff', '#3fb950', '#f85149', '#d29922', '#a371f7'];

  return (
    <div className="portfolio-pane" style={{ 
      height: '100%',
      overflowY: 'auto',
      padding: '16px',
      color: 'var(--terminal-text)',
    }}>
      <div className="portfolio-summary" style={{ marginBottom: '20px' }}>
        <div className="portfolio-total" style={{
          background: 'var(--terminal-bg-secondary)',
          padding: '16px',
          borderRadius: '4px',
          border: '1px solid var(--terminal-border)',
        }}>
          <div className="portfolio-label" style={{ 
            fontSize: '12px',
            color: 'var(--terminal-dim)',
            marginBottom: '8px',
          }}>
            Total Value
          </div>
          <div className="portfolio-value" style={{ 
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '8px',
          }}>
            ${portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`portfolio-pnl ${portfolio.totalPnl >= 0 ? 'positive' : 'negative'}`} style={{
            fontSize: '14px',
            color: portfolio.totalPnl >= 0 ? 'var(--terminal-success)' : 'var(--terminal-error)',
          }}>
            {portfolio.totalPnl >= 0 ? '+' : ''}${portfolio.totalPnl.toFixed(2)} ({portfolio.totalPnlPercent >= 0 ? '+' : ''}{portfolio.totalPnlPercent.toFixed(2)}%)
          </div>
        </div>
      </div>
      
      {pieData.length > 0 && (
        <div className="portfolio-chart" style={{ marginBottom: '20px' }}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="portfolio-positions">
        <table className="portfolio-table" style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px',
        }}>
          <thead>
            <tr style={{ 
              borderBottom: '1px solid var(--terminal-border)',
              textAlign: 'left',
            }}>
              <th style={{ padding: '8px' }}>Ticker</th>
              <th style={{ padding: '8px' }}>Shares</th>
              <th style={{ padding: '8px' }}>Cost Basis</th>
              <th style={{ padding: '8px' }}>Current Price</th>
              <th style={{ padding: '8px' }}>Value</th>
              <th style={{ padding: '8px' }}>P&L</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.positions.map((pos) => (
              <tr key={pos.ticker} style={{
                borderBottom: '1px solid var(--terminal-border)',
              }}>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{pos.ticker}</td>
                <td style={{ padding: '8px' }}>{pos.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                <td style={{ padding: '8px' }}>${pos.costBasis.toFixed(2)}</td>
                <td style={{ padding: '8px' }}>${pos.currentPrice.toFixed(2)}</td>
                <td style={{ padding: '8px' }}>${(pos.currentPrice * pos.shares).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={pos.pnl >= 0 ? 'positive' : 'negative'} style={{
                  padding: '8px',
                  color: pos.pnl >= 0 ? 'var(--terminal-success)' : 'var(--terminal-error)',
                }}>
                  {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)} ({pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

