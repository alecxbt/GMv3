import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Pane } from '../../../shared/src/types';
import { marketDataApi, cryptoApi } from '../../services/api';

interface ChartPaneProps {
  pane: Pane;
}

type Timeframe = '1d' | '5d' | '1mo' | '3mo' | '1y' | '5y';

// Format time based on timeframe
const formatTimeForTimeframe = (timeStr: string, tf: Timeframe): string => {
  const date = new Date(timeStr);
  switch (tf) {
    case '1d':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    case '5d':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
    case '1mo':
    case '3mo':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '1y':
    case '5y':
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    default:
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
};

export function ChartPane({ pane }: ChartPaneProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('1d');

  useEffect(() => {
    if (!pane.ticker) return;

    const fetchChartData = async () => {
      try {
      setLoading(true);
        
        // Check if it's crypto or equity
        // Detect crypto by: assetType === 'crypto', config.isPair, or ticker pattern (6-8 chars, all caps)
        const isCrypto = pane.assetType === 'crypto' || 
                        pane.config?.isPair || 
                        (pane.ticker && pane.ticker.length >= 6 && pane.ticker.length <= 8 && /^[A-Z]{6,8}$/.test(pane.ticker));
        
        if (isCrypto) {
          console.debug(`Fetching crypto chart for ${pane.ticker}`);
          const chartData = await cryptoApi.getChart(pane.ticker!, timeframe);
          // Format data for chart
          const formattedData = chartData.data.map((point: any) => ({
            time: formatTimeForTimeframe(point.time, timeframe),
            price: Number(point.price) || 0,
            volume: Number(point.volume) || 0,
          }));
          setData(formattedData);
        } else {
          console.debug(`Fetching equity chart for ${pane.ticker}`);
          const chartData = await marketDataApi.getChart(
            pane.ticker!,
            timeframe,
            pane.config?.countryCode
          );
          // Format data for chart
          const formattedData = chartData.data.map((point: any) => ({
            time: formatTimeForTimeframe(point.time, timeframe),
            price: Number(point.price) || 0,
            volume: Number(point.volume) || 0,
          }));
          setData(formattedData);
        }
      } catch (error: any) {
        console.error('Error fetching chart data:', error);
        setData([]); // Clear data on error
        // Error will be shown in the UI below
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [pane.ticker, pane.config?.countryCode, pane.assetType, pane.config?.isPair, timeframe]);

  // Calculate Y-axis domain with padding for better price action visibility
  const calculateYAxisDomain = (data: any[]): [number, number] => {
    if (data.length === 0) return [0, 100];
    const prices = data.map(d => d.price).filter(p => p > 0);
    if (prices.length === 0) return [0, 100];
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    
    // Use 5% padding for better visibility, but ensure we don't go below 0
    const padding = Math.max(range * 0.05, min * 0.01); // At least 1% of min or 5% of range
    
    return [Math.max(0, min - padding), max + padding];
  };

  // Format Y-axis tick values
  const formatYAxisTick = (value: number): string => {
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toFixed(2);
  };

  if (loading) {
    return <div className="pane-loading">Loading chart...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="pane-error" style={{ padding: '20px', textAlign: 'center' }}>
        <p>No chart data available for {pane.ticker}</p>
        <p style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginTop: '8px' }}>
          Check that the backend is running and API keys are configured
        </p>
      </div>
    );
  }

  // Check if it's a crypto pair
  const isPair = pane.config?.isPair;
  const displayTitle = isPair 
    ? `${pane.config?.base || pane.ticker?.slice(0, 3)}/${pane.config?.quote || pane.ticker?.slice(3)}`
    : pane.ticker;

  const yAxisDomain = calculateYAxisDomain(data);

  return (
    <div className="chart-pane" style={{ width: '100%', height: '100%', minHeight: '200px' }}>
      <div className="chart-controls">
        <select 
          className="chart-timeframe-select"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as Timeframe)}
        >
          <option value="1d">1D</option>
          <option value="5d">5D</option>
          <option value="1mo">1M</option>
          <option value="3mo">3M</option>
          <option value="1y">1Y</option>
          <option value="5y">5Y</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
          <XAxis 
            dataKey="time" 
            stroke="var(--terminal-text)" 
            tick={{ fill: 'var(--terminal-text)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--terminal-border)' }}
            interval="preserveStartEnd"
          />
          <YAxis 
            domain={yAxisDomain}
            stroke="var(--terminal-text)" 
            tick={{ fill: 'var(--terminal-text)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--terminal-border)' }}
            width={60}
            tickFormatter={formatYAxisTick}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--terminal-bg)',
              border: '1px solid var(--terminal-border)',
              color: 'var(--terminal-fg)',
              borderRadius: '4px',
              fontSize: '11px',
            }}
            labelStyle={{ color: 'var(--terminal-accent)' }}
            formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Price']}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--terminal-accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--terminal-accent)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

