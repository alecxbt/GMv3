import { useEffect, useState } from 'react';
import type { Pane, Quote } from '../../../shared/src/types';
import { speakPriceAlert } from '../../utils/voiceAlerts';
import { marketDataApi } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';

interface QuotePaneProps {
  pane: Pane;
}

export function QuotePane({ pane }: QuotePaneProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!pane.ticker) return;

    // Fetch initial quote
    const fetchQuote = async () => {
      try {
      setLoading(true);
        const quoteData = await marketDataApi.getQuote(
          pane.ticker!,
          pane.config?.countryCode
        );
      setQuote((prevQuote) => {
        // Voice alert on significant price change
          if (prevQuote && Math.abs(quoteData.changePercent - prevQuote.changePercent) > 1) {
            speakPriceAlert(quoteData.symbol, quoteData.price, quoteData.change, quoteData.changePercent);
        }
          return quoteData;
      });
      } catch (error) {
        console.error('Error fetching quote:', error);
      } finally {
      setLoading(false);
      }
    };

    fetchQuote();

    // Subscribe to WebSocket updates
    if (socket && pane.ticker) {
      socket.emit('subscribe:ticker', pane.ticker);
      
      const handleUpdate = (updatedQuote: Quote) => {
        if (updatedQuote.symbol === pane.ticker) {
          setQuote((prevQuote) => {
            // Voice alert on significant price change
            if (prevQuote && Math.abs(updatedQuote.changePercent - prevQuote.changePercent) > 1) {
              speakPriceAlert(updatedQuote.symbol, updatedQuote.price, updatedQuote.change, updatedQuote.changePercent);
            }
            return updatedQuote;
          });
        }
      };

      socket.on('ticker:update', handleUpdate);

      return () => {
        socket.emit('unsubscribe:ticker', pane.ticker);
        socket.off('ticker:update', handleUpdate);
      };
    }
  }, [pane.ticker, pane.config?.countryCode, socket]);

  if (loading || !quote) {
    return <div className="pane-loading">Loading quote...</div>;
  }

  const isPositive = quote.change >= 0;

  return (
    <div className="quote-pane">
      <div className="quote-symbol">{quote.symbol}</div>
      <div className="quote-price">${quote.price.toFixed(2)}</div>
      <div className={`quote-change ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
      </div>
      <div className="quote-volume">Volume: {quote.volume.toLocaleString()}</div>
    </div>
  );
}

