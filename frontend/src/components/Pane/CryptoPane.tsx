import { useEffect, useState } from 'react';
import type { Pane } from '@shared/types';

interface CryptoPaneProps {
  pane: Pane;
}

export function CryptoPane({ pane }: CryptoPaneProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pane.ticker) return;

    const fetchCryptoData = async () => {
      setLoading(true);
      // Mock data - replace with CoinGecko API
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      setData({
        symbol: pane.ticker,
        price: 42000,
        volume24h: 1500000000,
        change24h: 2.5,
      });
      setLoading(false);
    };

    fetchCryptoData();
  }, [pane.ticker]);

  if (loading || !data) {
    return <div className="pane-loading">Loading crypto data...</div>;
  }

  return (
    <div className="crypto-pane">
      <div className="crypto-header">
        <h3>{data.symbol}</h3>
      </div>
      <div className="crypto-price">${data.price.toLocaleString()}</div>
      <div className={`crypto-change ${data.change24h >= 0 ? 'positive' : 'negative'}`}>
        {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
      </div>
      <div className="crypto-volume">24h Volume: ${data.volume24h.toLocaleString()}</div>
    </div>
  );
}

