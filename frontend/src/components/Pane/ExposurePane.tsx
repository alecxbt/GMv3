import { useEffect, useState } from 'react';
import type { Pane, Exposure } from '@shared/types';

interface ExposurePaneProps {
  pane: Pane;
}

export function ExposurePane({ pane }: ExposurePaneProps) {
  const [exposures, setExposures] = useState<Exposure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pane.ticker) return;

    const fetchExposures = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/exposure/${pane.ticker}`);
        if (response.ok) {
          const data = await response.json();
          setExposures(data.exposures || []);
        } else {
          // Mock data
          setExposures([
            {
              sector: 'Technology',
              weight: 28.5,
              topHoldings: [
                { ticker: 'MSFT', weight: 6.2 },
                { ticker: 'AAPL', weight: 5.8 },
              ],
            },
            {
              sector: 'Financial',
              weight: 13.2,
              topHoldings: [
                { ticker: 'JPM', weight: 2.1 },
                { ticker: 'BAC', weight: 1.8 },
              ],
            },
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch exposures:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExposures();
  }, [pane.ticker]);

  if (loading) {
    return <div className="pane-loading">Loading exposures...</div>;
  }

  return (
    <div className="exposure-pane">
      <div className="exposure-header">
        <h3>{pane.ticker} Exposures</h3>
      </div>
      <table className="exposure-table">
        <thead>
          <tr>
            <th>Sector</th>
            <th>Weight</th>
            <th>Top Holdings</th>
          </tr>
        </thead>
        <tbody>
          {exposures.map((exp, i) => (
            <tr key={i}>
              <td>{exp.sector}</td>
              <td>{exp.weight.toFixed(1)}%</td>
              <td>
                {exp.topHoldings.map((h, j) => (
                  <span key={j} className="exposure-holding">
                    {h.ticker} {h.weight.toFixed(1)}%
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

