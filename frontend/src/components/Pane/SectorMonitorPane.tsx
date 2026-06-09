import { useEffect, useState } from 'react';
import type { Pane } from '@shared/types';

interface SectorData {
  sector: string;
  change: number;
  changePercent: number;
  topMovers: Array<{
    ticker: string;
    change: number;
  }>;
}

interface SectorMonitorPaneProps {
  pane: Pane;
}

export function SectorMonitorPane({ pane }: SectorMonitorPaneProps) {
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  useEffect(() => {
    const fetchSectorData = async () => {
      setLoading(true);
      // Mock data - replace with actual API
      await new Promise((resolve) => setTimeout(resolve, 50));
      
      const mockSectors: SectorData[] = [
        {
          sector: 'Technology',
          change: 125.5,
          changePercent: 2.1,
          topMovers: [
            { ticker: 'AAPL', change: 3.2 },
            { ticker: 'MSFT', change: 2.8 },
            { ticker: 'NVDA', change: 5.1 },
          ],
        },
        {
          sector: 'Financial',
          change: -45.2,
          changePercent: -1.2,
          topMovers: [
            { ticker: 'JPM', change: -2.1 },
            { ticker: 'BAC', change: -1.8 },
            { ticker: 'GS', change: 0.5 },
          ],
        },
        {
          sector: 'Healthcare',
          change: 78.3,
          changePercent: 1.5,
          topMovers: [
            { ticker: 'JNJ', change: 1.2 },
            { ticker: 'UNH', change: 2.3 },
            { ticker: 'PFE', change: -0.8 },
          ],
        },
        {
          sector: 'Energy',
          change: -12.4,
          changePercent: -0.8,
          topMovers: [
            { ticker: 'XOM', change: -1.5 },
            { ticker: 'CVX', change: -0.9 },
            { ticker: 'SLB', change: 0.3 },
          ],
        },
      ];
      
      setSectors(mockSectors);
      setLoading(false);
    };

    fetchSectorData();
    const interval = setInterval(fetchSectorData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="pane-loading">Loading sectors...</div>;
  }

  const filteredSectors = selectedSector
    ? sectors.filter((s) => s.sector === selectedSector)
    : sectors;

  return (
    <div className="sector-monitor-pane">
      <div className="sector-filter">
        {sectors.map((sector) => (
          <button
            key={sector.sector}
            className={`sector-filter-btn ${selectedSector === sector.sector ? 'active' : ''}`}
            onClick={() => setSelectedSector(selectedSector === sector.sector ? null : sector.sector)}
          >
            {sector.sector}
          </button>
        ))}
      </div>
      <div className="sector-list">
        {filteredSectors.map((sector) => (
          <div key={sector.sector} className="sector-item">
            <div className="sector-header">
              <span className="sector-name">{sector.sector}</span>
              <span className={`sector-change ${sector.change >= 0 ? 'positive' : 'negative'}`}>
                {sector.change >= 0 ? '+' : ''}{sector.change.toFixed(1)} ({sector.changePercent >= 0 ? '+' : ''}{sector.changePercent.toFixed(2)}%)
              </span>
            </div>
            <div className="sector-movers">
              {sector.topMovers.map((mover) => (
                <span key={mover.ticker} className="sector-mover">
                  {mover.ticker} {mover.change >= 0 ? '+' : ''}{mover.change.toFixed(1)}%
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

