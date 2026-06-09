import { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Pane } from '@shared/types';
import { marketDataApi } from '../../services/api';

interface RatioAnalysisPaneProps {
  pane: Pane;
}

interface RatioDataPoint {
  time: string;
  ratio: number;
  price1: number;
  price2: number;
}

interface RatioAnalysisData {
  ticker1: string;
  ticker2: string;
  period: string;
  ratioData: RatioDataPoint[];
  correlation: number;
  beta: number;
}

export function RatioAnalysisPane({ pane }: RatioAnalysisPaneProps) {
  const [analysisData, setAnalysisData] = useState<RatioAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('1y');
  const [ticker1, setTicker1] = useState<string>(pane.config?.ticker1 || pane.ticker || '');
  const [ticker2, setTicker2] = useState<string>(pane.config?.ticker2 || '');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced fetch function
  const fetchAnalysis = async (t1: string, t2: string, p: string) => {
    if (!t1.trim() || !t2.trim()) {
      setLoading(false);
      setAnalysisData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await marketDataApi.getRatioAnalysis(t1.trim(), t2.trim(), p);
      setAnalysisData(data);
    } catch (err: any) {
      console.error('Error fetching ratio analysis:', err);
      setError(err.message || 'Failed to load ratio analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If either ticker is empty, don't fetch
    if (!ticker1.trim() || !ticker2.trim()) {
      setLoading(false);
      setAnalysisData(null);
      return;
    }

    // Debounce the API call - wait 800ms after user stops typing
    debounceTimerRef.current = setTimeout(() => {
      fetchAnalysis(ticker1, ticker2, period);
    }, 800);

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [ticker1, ticker2, period]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatRatio = (value: number) => {
    return value.toFixed(4);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  if (loading) {
    return <div className="pane-loading">Loading ratio analysis...</div>;
  }

  if (error) {
    return (
      <div className="pane-error" style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--terminal-error)', marginBottom: '8px' }}>{error}</p>
      </div>
    );
  }

  const chartData = analysisData?.ratioData.map(point => ({
    time: point.time,
    ratio: point.ratio,
  })) || [];

  return (
    <div className="ratio-analysis-pane" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="ratio-controls" style={{ 
        padding: '12px', 
        borderBottom: '1px solid var(--terminal-border)',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
          <input
            type="text"
            value={ticker1}
            onChange={(e) => setTicker1(e.target.value.toUpperCase())}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && ticker1.trim() && ticker2.trim()) {
                if (debounceTimerRef.current) {
                  clearTimeout(debounceTimerRef.current);
                }
                fetchAnalysis(ticker1, ticker2, period);
              }
            }}
            placeholder="Ticker 1"
            style={{
              padding: '4px 8px',
              background: 'var(--terminal-bg)',
              border: '1px solid var(--terminal-border)',
              color: 'var(--terminal-text)',
              fontSize: '12px',
              borderRadius: '2px',
              width: '80px',
            }}
          />
          <span style={{ color: 'var(--terminal-dim)', fontSize: '12px' }}>/</span>
          <input
            type="text"
            value={ticker2}
            onChange={(e) => setTicker2(e.target.value.toUpperCase())}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && ticker1.trim() && ticker2.trim()) {
                if (debounceTimerRef.current) {
                  clearTimeout(debounceTimerRef.current);
                }
                fetchAnalysis(ticker1, ticker2, period);
              }
            }}
            placeholder="Ticker 2"
            style={{
              padding: '4px 8px',
              background: 'var(--terminal-bg)',
              border: '1px solid var(--terminal-border)',
              color: 'var(--terminal-text)',
              fontSize: '12px',
              borderRadius: '2px',
              width: '80px',
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label htmlFor="period-select" style={{ fontSize: '12px', color: 'var(--terminal-dim)' }}>
            Period:
          </label>
          <select
            id="period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: '4px 8px',
              background: 'var(--terminal-bg)',
              border: '1px solid var(--terminal-border)',
              color: 'var(--terminal-text)',
              fontSize: '12px',
              borderRadius: '2px',
            }}
          >
            <option value="1d">1 Day</option>
            <option value="5d">5 Days</option>
            <option value="1mo">1 Month</option>
            <option value="3mo">3 Months</option>
            <option value="1y">1 Year</option>
            <option value="5y">5 Years</option>
          </select>
        </div>
      </div>

      {analysisData && (
        <div className="ratio-metrics" style={{ 
          padding: '12px', 
          borderBottom: '1px solid var(--terminal-border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
              Correlation
            </div>
            <div style={{ fontSize: '18px', color: 'var(--terminal-text)', fontWeight: 'bold' }}>
              {formatPercent(analysisData.correlation)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
              Beta ({ticker1} vs {ticker2})
            </div>
            <div style={{ fontSize: '18px', color: 'var(--terminal-text)', fontWeight: 'bold' }}>
              {analysisData.beta.toFixed(3)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
              Current Ratio
            </div>
            <div style={{ fontSize: '18px', color: 'var(--terminal-text)', fontWeight: 'bold' }}>
              {analysisData.ratioData.length > 0 
                ? formatRatio(analysisData.ratioData[analysisData.ratioData.length - 1].ratio)
                : 'N/A'}
            </div>
          </div>
        </div>
      )}

      <div className="ratio-chart" style={{ flex: 1, padding: '12px', minHeight: '300px' }}>
        {chartData.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'var(--terminal-dim)',
          }}>
            {!ticker1 || !ticker2 ? 'Enter two tickers to analyze' : 'No data available'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
              <XAxis
                dataKey="time"
                tickFormatter={formatDate}
                stroke="var(--terminal-text)"
                tick={{ fill: 'var(--terminal-text)', fontSize: 11 }}
                style={{ fontSize: '11px', color: 'var(--terminal-text)' }}
              />
              <YAxis
                tickFormatter={formatRatio}
                stroke="var(--terminal-text)"
                tick={{ fill: 'var(--terminal-text)', fontSize: 11 }}
                style={{ fontSize: '11px', color: 'var(--terminal-text)' }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--terminal-bg-secondary)',
                  border: '1px solid var(--terminal-border)',
                  borderRadius: '4px',
                  color: 'var(--terminal-text)',
                }}
                labelFormatter={formatDate}
                formatter={(value: number) => formatRatio(value)}
              />
              <Line
                type="monotone"
                dataKey="ratio"
                stroke="#00ff88"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

