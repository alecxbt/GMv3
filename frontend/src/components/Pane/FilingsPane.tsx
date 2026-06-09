import { useEffect, useState } from 'react';
import type { Pane } from '@shared/types';
import { marketDataApi } from '../../services/api';

interface Filing {
  id: string;
  ticker: string;
  type: string;
  title: string;
  date: string;
  edgarUrl: string;
}

interface FilingsPaneProps {
  pane: Pane;
}

export function FilingsPane({ pane }: FilingsPaneProps) {
  const ticker = pane.ticker ?? '';
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!ticker) return;

    const fetchFilings = async () => {
      setLoading(true);
      try {
        const filingsData = await marketDataApi.getFilings(ticker, 20);
        const formattedFilings: Filing[] = filingsData.filings.map((f: any) => ({
          id: f.id,
          ticker: f.ticker,
          type: f.form,
          title: f.description,
          date: f.date,
          edgarUrl: f.url,
        }));
        setFilings(formattedFilings);
      } catch (error: any) {
        console.error('Failed to fetch filings:', error);
        setFilings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFilings();
  }, [pane.ticker]);

  if (loading) {
    return <div className="pane-loading">Loading filings...</div>;
  }

  if (filings.length === 0 && !loading) {
    return (
      <div className="pane-loading" style={{ color: 'var(--terminal-dim)' }}>
        No filings found for {ticker}. The ticker may not be in the SEC database.
      </div>
    );
  }

  const filteredFilings = filter === 'all'
    ? filings
    : filings.filter((f) => f.type === filter);

  return (
    <div className="filings-pane">
      <div className="filings-filter">
        <button
          className={`filings-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filings-filter-btn ${filter === '10-K' ? 'active' : ''}`}
          onClick={() => setFilter('10-K')}
        >
          10-K
        </button>
        <button
          className={`filings-filter-btn ${filter === '10-Q' ? 'active' : ''}`}
          onClick={() => setFilter('10-Q')}
        >
          10-Q
        </button>
        <button
          className={`filings-filter-btn ${filter === '8-K' ? 'active' : ''}`}
          onClick={() => setFilter('8-K')}
        >
          8-K
        </button>
      </div>
      <div className="filings-list">
        {filteredFilings.map((filing) => (
          <div key={filing.id} className="filing-item">
            <div className="filing-header">
              <span className="filing-type">{filing.type}</span>
              <span className="filing-date">
                {new Date(filing.date).toLocaleDateString()}
              </span>
            </div>
            <div className="filing-title">{filing.title}</div>
            <a
              href={filing.edgarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="filing-link"
            >
              View on EDGAR →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

