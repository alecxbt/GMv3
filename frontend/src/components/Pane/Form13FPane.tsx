import { useEffect, useState } from 'react';
import type { Pane } from '@shared/types';
import { marketDataApi } from '../../services/api';

interface Form13FPaneProps {
  pane: Pane;
}

interface Form13FFiling {
  id: string;
  form: string;
  date: string;
  description: string;
  accessionNumber: string;
  url: string;
  cik: string;
  managerName: string;
}

interface Holding {
  issuer: string;
  cusip: string;
  value: number;
  shares: number;
  title: string;
}

interface Form13FData {
  managerName: string;
  cik: string;
  filings: Form13FFiling[];
  latestHoldings: Holding[];
  latestFilingDate: string | null;
}

export function Form13FPane({ pane }: Form13FPaneProps) {
  const [data, setData] = useState<Form13FData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiling, setSelectedFiling] = useState<Form13FFiling | null>(null);

  useEffect(() => {
    const managerName = pane.ticker || pane.config?.managerName;
    if (!managerName) return;

    const fetchForm13F = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const form13FData = await marketDataApi.getForm13F(managerName, 10);
        setData(form13FData);
        
        // Select the most recent filing by default
        if (form13FData.filings.length > 0) {
          setSelectedFiling(form13FData.filings[0]);
        }
      } catch (err: any) {
        console.error('Error fetching 13-F filings:', err);
        setError(err.response?.data?.error || err.message || 'Failed to fetch 13-F filings');
      } finally {
        setLoading(false);
      }
    };

    fetchForm13F();
  }, [pane.ticker, pane.config?.managerName]);

  if (loading) {
    return <div className="pane-loading">Loading 13-F filings...</div>;
  }

  if (error) {
    return (
      <div className="pane-loading" style={{ color: 'var(--terminal-error)' }}>
        Error: {error}
      </div>
    );
  }

  if (!data || data.filings.length === 0) {
    return (
      <div className="pane-loading">
        No 13-F filings found for {pane.ticker || 'this manager'}
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="form13f-pane">
      <div className="form13f-header">
        <h3>{data.managerName}</h3>
        <div className="form13f-meta">
          <span>CIK: {data.cik}</span>
          {data.latestFilingDate && (
            <span>Latest: {new Date(data.latestFilingDate).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      <div className="form13f-content">
        <div className="form13f-filings-list">
          <h4>13-F Filings</h4>
          <div className="filings-list">
            {data.filings.map((filing) => (
              <div
                key={filing.id}
                className={`filing-item ${selectedFiling?.id === filing.id ? 'active' : ''}`}
                onClick={() => setSelectedFiling(filing)}
              >
                <div className="filing-form">{filing.form}</div>
                <div className="filing-date">{new Date(filing.date).toLocaleDateString()}</div>
                <a
                  href={filing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="filing-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  View on SEC →
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="form13f-holdings" style={{ 
          flex: 1,
          overflowY: 'auto',
        }}>
          <h4 style={{ 
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: 'bold',
          }}>
            Holdings
            {selectedFiling && (
              <span style={{ 
                marginLeft: '8px',
                fontSize: '11px',
                color: 'var(--terminal-dim)',
                fontWeight: 'normal',
              }}>
                {new Date(selectedFiling.date).toLocaleDateString()}
              </span>
            )}
          </h4>
          
          {data.latestHoldings && data.latestHoldings.length > 0 ? (
            <div className="holdings-table-container" style={{
              overflowX: 'auto',
            }}>
              <table className="holdings-table" style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12px',
              }}>
                <thead>
                  <tr style={{
                    borderBottom: '1px solid var(--terminal-border)',
                    textAlign: 'left',
                  }}>
                    <th style={{ padding: '8px' }}>Issuer</th>
                    <th style={{ padding: '8px' }}>CUSIP</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Shares</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Value</th>
                    <th style={{ padding: '8px' }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {data.latestHoldings.map((holding, index) => (
                    <tr key={index} style={{
                      borderBottom: '1px solid var(--terminal-border)',
                    }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{holding.issuer}</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '11px' }}>{holding.cusip}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{formatNumber(holding.shares)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(holding.value)}</td>
                      <td style={{ padding: '8px', color: 'var(--terminal-dim)' }}>{holding.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ 
              padding: '20px',
              textAlign: 'center',
              color: 'var(--terminal-dim)',
            }}>
              {data.filings.length > 0 ? (
                <div>
                  <div style={{ marginBottom: '8px' }}>Holdings data is being fetched...</div>
                  <div style={{ fontSize: '11px' }}>This may take a moment. Holdings will appear here once loaded.</div>
                </div>
              ) : (
                <div>Holdings data not available</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

