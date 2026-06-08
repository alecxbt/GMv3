import { useEffect, useState } from 'react';
import type { Pane } from '../../../shared/src/types';

interface PredictionPaneProps {
  pane: Pane;
}

export function PredictionPane({ pane }: PredictionPaneProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictionData = async () => {
      setLoading(true);
      // Mock data - replace with Polymarket/Kalshi API
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      if (pane.ticker) {
        // Specific event
        setData({
          event: pane.ticker,
          yesOdds: 55,
          noOdds: 45,
          volume: 1000000,
        });
      } else {
        // Top markets
        setData({
          markets: [
            { event: 'Event 1', yesOdds: 60, volume: 500000 },
            { event: 'Event 2', yesOdds: 40, volume: 300000 },
          ],
        });
      }
      setLoading(false);
    };

    fetchPredictionData();
  }, [pane.ticker]);

  if (loading || !data) {
    return <div className="pane-loading">Loading prediction data...</div>;
  }

  return (
    <div className="prediction-pane">
      {pane.ticker ? (
        <div className="prediction-event">
          <h3>{data.event}</h3>
          <div className="prediction-odds">
            <div className="prediction-yes">
              <span>YES: {data.yesOdds}%</span>
            </div>
            <div className="prediction-no">
              <span>NO: {data.noOdds}%</span>
            </div>
          </div>
          <div className="prediction-volume">Volume: ${data.volume.toLocaleString()}</div>
        </div>
      ) : (
        <div className="prediction-markets">
          {data.markets?.map((market: any, i: number) => (
            <div key={i} className="prediction-market-item">
              <div>{market.event}</div>
              <div>YES: {market.yesOdds}%</div>
              <div>Vol: ${market.volume.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

