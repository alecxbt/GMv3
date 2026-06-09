import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Pane } from '@shared/types';
import { marketDataApi } from '../../services/api';

interface HistoricalComparisonPaneProps {
  pane: Pane;
}

interface PerformanceData {
  ticker: string;
  data: Array<{
    time: string;
    percentChange: number;
    price: number;
  }>;
  error?: string;
}

interface ComparisonData {
  tickers: string[];
  period: string;
  data: PerformanceData[];
}

// Color palette for different securities
const COLORS = [
  '#00ff88', // Terminal green
  '#00d4ff', // Cyan
  '#ff6b6b', // Red
  '#ffd93d', // Yellow
  '#6bcf7f', // Green
  '#4d96ff', // Blue
  '#ff9ff3', // Pink
  '#54a0ff', // Light blue
  '#5f27cd', // Purple
  '#00d2d3', // Teal
];

export function HistoricalComparisonPane({ pane }: HistoricalComparisonPaneProps) {
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('1y');
  const [tickers, setTickers] = useState<string[]>(pane.config?.tickers || []);
  const [newTicker, setNewTicker] = useState('');

  useEffect(() => {
    if (tickers.length === 0) {
      setLoading(false);
      return;
    }

    const fetchComparison = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await marketDataApi.getHistoricalComparison(tickers, period);
        setComparisonData(data);
      } catch (err: any) {
        console.error('Error fetching historical comparison:', err);
        setError(err.message || 'Failed to load historical comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [tickers, period]);

  const handleAddTicker = () => {
    const trimmed = newTicker.trim().toUpperCase();
    if (trimmed && !tickers.includes(trimmed)) {
      setTickers([...tickers, trimmed]);
      setNewTicker('');
    }
  };

  const handleRemoveTicker = (tickerToRemove: string) => {
    setTickers(tickers.filter(t => t !== tickerToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTicker();
    }
  };

  if (loading) {
    return <div className="pane-loading">Loading historical comparison...</div>;
  }

  if (error) {
    return (
      <div className="pane-error" style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--terminal-error)', marginBottom: '8px' }}>{error}</p>
      </div>
    );
  }

  // Prepare chart data - combine all tickers' data by time
  const chartDataMap = new Map<string, Record<string, number | string>>();
  
  comparisonData?.data.forEach((tickerData) => {
    if (tickerData.error || !tickerData.data) return;
    
    tickerData.data.forEach((point) => {
      const time = point.time;
      if (!chartDataMap.has(time)) {
        chartDataMap.set(time, { time });
      }
      chartDataMap.get(time)![tickerData.ticker] = point.percentChange;
    });
  });

  const chartData = Array.from(chartDataMap.values()).sort((a, b) => 
    new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="historical-comparison-pane" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="comparison-controls" style={{ 
        padding: '6px 8px', 
        borderBottom: '1px solid var(--terminal-border)',
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <label htmlFor="period-select" style={{ fontSize: '10px', color: 'var(--terminal-dim)' }}>
            Period:
          </label>
          <select
            id="period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: '2px 6px',
              background: 'var(--terminal-bg)',
              border: '1px solid var(--terminal-border)',
              color: 'var(--terminal-text)',
              fontSize: '10px',
              borderRadius: '2px',
              height: '20px',
            }}
          >
            <option value="1d">1D</option>
            <option value="5d">5D</option>
            <option value="1mo">1M</option>
            <option value="3mo">3M</option>
            <option value="1y">1Y</option>
            <option value="5y">5Y</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <input
            type="text"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder="Add..."
            style={{
              padding: '2px 6px',
              background: 'var(--terminal-bg)',
              border: '1px solid var(--terminal-border)',
              color: 'var(--terminal-text)',
              fontSize: '10px',
              borderRadius: '2px',
              width: '70px',
              height: '20px',
            }}
          />
          <button
            onClick={handleAddTicker}
            style={{
              padding: '2px 8px',
              background: 'var(--terminal-accent)',
              border: 'none',
              color: 'var(--terminal-bg)',
              fontSize: '10px',
              borderRadius: '2px',
              cursor: 'pointer',
              height: '20px',
            }}
          >
            +
          </button>
        </div>
      </div>

      <div className="ticker-tags" style={{ 
        padding: '4px 8px', 
        display: 'flex', 
        gap: '4px', 
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--terminal-border)',
        flexShrink: 0,
        maxHeight: '60px',
        overflowY: 'auto',
      }}>
        {tickers.map((ticker, index) => (
          <div
            key={ticker}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              background: 'var(--terminal-bg-secondary)',
              border: '1px solid var(--terminal-border)',
              borderRadius: '2px',
              fontSize: '9px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: COLORS[index % COLORS.length],
                flexShrink: 0,
              }}
            />
            <span style={{ whiteSpace: 'nowrap' }}>{ticker}</span>
            <button
              onClick={() => handleRemoveTicker(ticker)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--terminal-dim)',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '0',
                width: '12px',
                height: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: '1',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="comparison-chart" style={{ flex: 1, padding: '6px', minHeight: '150px', overflow: 'hidden' }}>
        {chartData.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'var(--terminal-dim)',
          }}>
            {tickers.length === 0 ? 'Add tickers to compare' : 'No data available'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
              <XAxis
                dataKey="time"
                tickFormatter={formatDate}
                stroke="var(--terminal-text)"
                tick={{ fill: 'var(--terminal-text)', fontSize: 9 }}
                style={{ fontSize: '9px', color: 'var(--terminal-text)' }}
                height={30}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(value) => `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`}
                stroke="var(--terminal-text)"
                tick={{ fill: 'var(--terminal-text)', fontSize: 9 }}
                style={{ fontSize: '9px', color: 'var(--terminal-text)' }}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--terminal-bg-secondary)',
                  border: '1px solid var(--terminal-border)',
                  borderRadius: '4px',
                  color: 'var(--terminal-text)',
                  fontSize: '10px',
                  padding: '4px 8px',
                }}
                labelStyle={{ fontSize: '10px' }}
                labelFormatter={formatDate}
                formatter={(value: number) => formatPercent(value)}
              />
              <Legend
                wrapperStyle={{ fontSize: '9px', color: 'var(--terminal-text)', paddingTop: '4px' }}
                iconType="line"
                iconSize={8}
              />
              {tickers.map((ticker, index) => {
                const tickerData = comparisonData?.data.find(d => d.ticker === ticker);
                if (tickerData?.error || !tickerData?.data) return null;
                
                return (
                  <Line
                    key={ticker}
                    type="monotone"
                    dataKey={ticker}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                    activeDot={{ r: 3 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

