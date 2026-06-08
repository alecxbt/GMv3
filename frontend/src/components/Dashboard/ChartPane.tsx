import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore, api } from '../../stores/authStore';

// Import charting library components - using Recharts as planned
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Interface for data points used in the chart
interface ChartDataPoint {
  timestamp: string;
  price: number;
}

interface ChartPaneProps {
  id: string; // Unique identifier for the pane from react-grid-layout
  name: string;
  symbol?: string; // The financial symbol (e.g., 'AAPL', 'BTC-USD')
}

// Replace with actual API endpoint and data fetching logic
const MOCK_API_ENDPOINT = '/api/data/charts'; // Example endpoint

export const ChartPane: React.FC<ChartPaneProps> = ({ id, name, symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authStore = useAuthStore(); // Access auth store if needed for API calls or tokens

  // Effect to fetch data when the component mounts or symbol changes
  useEffect(() => {
    if (!symbol) { // If no symbol is provided, clear data and stop loading
      setChartData([]);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // --- Data Fetching Logic ---
        // In a real application, this would call a backend API that fetches from a market data provider.
        // Example: const response = await api.get(`${MOCK_API_ENDPOINT}?symbol=${symbol}&range=1d`);
        // setChartData(response.data);
        
        // Mock data for now:
        const mockData: ChartDataPoint[] = [
          { timestamp: '09:00', price: 150.50 },
          { timestamp: '09:15', price: 151.20 },
          { timestamp: '09:30', price: 150.80 },
          { timestamp: '09:45', price: 152.00 },
          { timestamp: '10:00', price: 151.90 },
          { timestamp: '10:15', price: 152.50 },
          { timestamp: '10:30', price: 153.10 },
        ];
        setChartData(mockData);
        // ----------------------------

      } catch (err: any) {
        console.error(`Error fetching chart data for ${symbol}:`, err);
        setError('Failed to load chart data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

  }, [symbol]); // Re-fetch if symbol changes

  return (
    <div className="bg-gray-800 p-4 h-full flex flex-col rounded-lg border border-gray-700 overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-green-500">{name}</h3>
        {symbol && <p className="text-sm text-gray-400">{symbol}</p>}
      </div>
      <div ref={chartContainerRef} className="flex-grow">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-gray-400">Loading Chart...</div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-500">{error}</div>
          </div>
        )}
        {!isLoading && !error && chartData.length === 0 && symbol && (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">No data available for {symbol}</div>
            </div>
        )}
        {!isLoading && !error && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" /> {/* Darker grid */}
              <XAxis dataKey="timestamp" stroke="#9ca3af" /> {/* Gray axis */}
              <YAxis stroke="#9ca3af" /> {/* Gray axis */}
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2} dot={false} /> {/* Green line */}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
