import { useEffect, useState } from 'react';
import type { Pane } from '../../../shared/src/types';

interface Prediction {
  id: string;
  event: string;
  probability: number;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  factors: string[];
}

interface PredictiveAnalyticsPaneProps {
  pane: Pane;
}

export function PredictiveAnalyticsPane({ pane }: PredictiveAnalyticsPaneProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);
      // Mock data - replace with ML model predictions
      await new Promise((resolve) => setTimeout(resolve, 50));
      
      const mockPredictions: Prediction[] = [
        {
          id: '1',
          event: 'Election Impact on Tech Sector',
          probability: 0.75,
          impact: 'high',
          timeframe: 'Q1 2025',
          factors: ['Regulatory changes', 'Policy shifts', 'Market sentiment'],
        },
        {
          id: '2',
          event: 'Interest Rate Cut',
          probability: 0.65,
          impact: 'high',
          timeframe: 'Q2 2025',
          factors: ['Inflation data', 'Fed signals', 'Economic indicators'],
        },
        {
          id: '3',
          event: 'Sector Rotation to Value',
          probability: 0.55,
          impact: 'medium',
          timeframe: 'Q1 2025',
          factors: ['Valuation metrics', 'Growth slowdown', 'Yield curve'],
        },
        {
          id: '4',
          event: 'Crypto Regulation Clarity',
          probability: 0.45,
          impact: 'medium',
          timeframe: 'Q2 2025',
          factors: ['Legislative progress', 'SEC guidance', 'Market adoption'],
        },
      ];
      
      setPredictions(mockPredictions);
      setLoading(false);
    };

    fetchPredictions();
  }, []);

  if (loading) {
    return <div className="pane-loading">Loading predictions...</div>;
  }

  return (
    <div className="predictive-analytics-pane">
      <div className="predictions-list">
        {predictions.map((pred) => (
          <div key={pred.id} className="prediction-item">
            <div className="prediction-header">
              <span className="prediction-event">{pred.event}</span>
              <span className={`prediction-probability ${pred.probability > 0.6 ? 'high' : pred.probability > 0.4 ? 'medium' : 'low'}`}>
                {(pred.probability * 100).toFixed(0)}%
              </span>
            </div>
            <div className="prediction-meta">
              <span className={`prediction-impact ${pred.impact}`}>{pred.impact.toUpperCase()}</span>
              <span className="prediction-timeframe">{pred.timeframe}</span>
            </div>
            <div className="prediction-factors">
              {pred.factors.map((factor, i) => (
                <span key={i} className="prediction-factor">{factor}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

