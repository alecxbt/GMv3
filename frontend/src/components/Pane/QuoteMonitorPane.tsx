import { useEffect, useState, useRef } from 'react';
import type { Pane, Quote } from '@shared/types';
import { useWebSocket } from '../../hooks/useWebSocket';
import { marketDataApi, cryptoApi } from '../../services/api';
import { useTerminalStore } from '../../store/useTerminalStore';

interface QuoteMonitorPaneProps {
  pane: Pane;
}

interface ExtendedQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  bid?: number;
  ask?: number;
  latency?: number;
  assetType?: 'equity' | 'crypto';
  countryCode?: string;
}

interface WatchlistItem {
  ticker: string;
  assetType: 'equity' | 'crypto';
  countryCode?: string;
}

export function QuoteMonitorPane({ pane }: QuoteMonitorPaneProps) {
  const { updatePane } = useTerminalStore();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(pane.config?.watchlist || []);
  const [quotes, setQuotes] = useState<Record<string, ExtendedQuote>>({});
  const [loading, setLoading] = useState(true);
  const [newTicker, setNewTicker] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const { socket } = useWebSocket();
  const updateTimers = useRef<Record<string, number>>({});
  const lastUpdateTime = useRef<Record<string, number>>({});
  const pollingIntervals = useRef<Record<string, NodeJS.Timeout>>({});
  
  // Monitor WebSocket connection status
  useEffect(() => {
    if (!socket) return;
    
    const handleConnect = () => {
      setWsConnected(true);
    };
    
    const handleDisconnect = () => {
      setWsConnected(false);
    };
    
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    
    // Check initial connection state
    setWsConnected(socket.connected);
    
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  // Polling fallback function for individual ticker
  const pollTicker = async (item: WatchlistItem) => {
    const key = `${item.ticker}${item.countryCode ? `-${item.countryCode}` : ''}`;
    const pollStart = Date.now();
    
    try {
      let quoteData: Quote;
      if (item.assetType === 'crypto') {
        quoteData = await cryptoApi.getQuote(item.ticker);
      } else {
        quoteData = await marketDataApi.getQuote(item.ticker, item.countryCode);
      }
      
      const pollLatency = Date.now() - pollStart;
      
      setQuotes(prev => {
        const prevQuote = prev[key];
        
        return {
          ...prev,
          [key]: {
            ...quoteData,
            bid: prevQuote?.bid || quoteData.price * 0.999,
            ask: prevQuote?.ask || quoteData.price * 1.001,
            latency: pollLatency,
            assetType: item.assetType,
            countryCode: item.countryCode,
          } as ExtendedQuote,
        };
      });
      
      lastUpdateTime.current[key] = Date.now();
    } catch (error) {
      console.error(`Error polling quote for ${item.ticker}:`, error);
    }
  };

  // Subscribe to all tickers in watchlist and set up polling fallback
  useEffect(() => {
    if (!socket) return;

    // Subscribe to all tickers via WebSocket
    watchlist.forEach((item) => {
      const key = `${item.ticker}${item.countryCode ? `-${item.countryCode}` : ''}`;
      updateTimers.current[key] = Date.now();
      lastUpdateTime.current[key] = Date.now();
      
      if (item.assetType === 'crypto') {
        socket.emit('subscribe:crypto', item.ticker);
      } else {
        socket.emit('subscribe:ticker', item.ticker);
      }
      
      // Set up polling fallback (every 3 seconds as backup)
      pollingIntervals.current[key] = setInterval(() => {
        pollTicker(item);
      }, 3000);
    });

    // Handle ticker updates from WebSocket
    const handleTickerUpdate = (quote: Quote) => {
      const item = watchlist.find(w => w.ticker === quote.symbol);
      if (item) {
        const key = `${quote.symbol}${item.countryCode ? `-${item.countryCode}` : ''}`;
        const updateStart = updateTimers.current[key] || Date.now();
        const newLatency = Date.now() - updateStart;
        updateTimers.current[key] = Date.now();
        lastUpdateTime.current[key] = Date.now();
        
        setQuotes(prev => {
          return {
            ...prev,
            [key]: {
              ...quote,
              bid: prev[key]?.bid || quote.price * 0.999,
              ask: prev[key]?.ask || quote.price * 1.001,
              latency: newLatency,
              assetType: item.assetType,
              countryCode: item.countryCode,
            } as ExtendedQuote,
          };
        });
      }
    };

    // Handle crypto updates from WebSocket
    const handleCryptoUpdate = (quote: Quote) => {
      const item = watchlist.find(w => {
        // Match by ticker or if quote symbol contains the ticker (e.g., BTCUSD contains BTC)
        return w.ticker === quote.symbol || 
               quote.symbol.includes(w.ticker) || 
               w.ticker.includes(quote.symbol.split('USD')[0]);
      });
      if (item && item.assetType === 'crypto') {
        const key = `${item.ticker}${item.countryCode ? `-${item.countryCode}` : ''}`;
        const updateStart = updateTimers.current[key] || Date.now();
        const newLatency = Date.now() - updateStart;
        updateTimers.current[key] = Date.now();
        lastUpdateTime.current[key] = Date.now();
        
        setQuotes(prev => {
          return {
            ...prev,
            [key]: {
              ...quote,
              bid: prev[key]?.bid || quote.price * 0.999,
              ask: prev[key]?.ask || quote.price * 1.001,
              latency: newLatency,
              assetType: 'crypto',
            } as ExtendedQuote,
          };
        });
      }
    };

    socket.on('ticker:update', handleTickerUpdate);
    socket.on('crypto:update', handleCryptoUpdate);

    return () => {
      socket.off('ticker:update', handleTickerUpdate);
      socket.off('crypto:update', handleCryptoUpdate);
      
      // Unsubscribe from all tickers
      watchlist.forEach((item) => {
        const key = `${item.ticker}${item.countryCode ? `-${item.countryCode}` : ''}`;
        
        if (item.assetType === 'crypto') {
          socket.emit('unsubscribe:crypto', item.ticker);
        } else {
          socket.emit('unsubscribe:ticker', item.ticker);
        }
        
        // Clear polling interval
        if (pollingIntervals.current[key]) {
          clearInterval(pollingIntervals.current[key]);
          delete pollingIntervals.current[key];
        }
      });
    };
  }, [socket, watchlist]);

  // Fetch initial quotes for all watchlist items
  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true);
      const quotePromises = watchlist.map(async (item) => {
        const key = `${item.ticker}${item.countryCode ? `-${item.countryCode}` : ''}`;
        updateTimers.current[key] = Date.now();
        
        try {
          let quoteData: Quote;
          if (item.assetType === 'crypto') {
            quoteData = await cryptoApi.getQuote(item.ticker);
          } else {
            quoteData = await marketDataApi.getQuote(item.ticker, item.countryCode);
          }
          
          const fetchTime = Date.now();
          const fetchLatency = fetchTime - updateTimers.current[key];
          
          const extendedQuote: ExtendedQuote = {
            ...quoteData,
            bid: quoteData.price * 0.999, // Mock bid if not available
            ask: quoteData.price * 1.001, // Mock ask if not available
            latency: fetchLatency,
            assetType: item.assetType,
            countryCode: item.countryCode,
          };
          
          return {
            key,
            quote: extendedQuote,
          };
        } catch (error) {
          console.error(`Error fetching quote for ${item.ticker}:`, error);
          return null;
        }
      });

      const results = await Promise.all(quotePromises);
      const newQuotes: Record<string, ExtendedQuote> = {};
      
      results.forEach((result) => {
        if (result) {
          newQuotes[result.key] = result.quote;
        }
      });

      setQuotes(newQuotes);
      setLoading(false);
    };

    if (watchlist.length > 0) {
      fetchQuotes();
    } else {
      setLoading(false);
    }
  }, [watchlist.length]); // Only refetch when watchlist length changes

  const handleAddTicker = async () => {
    const trimmed = newTicker.trim().toUpperCase();
    if (!trimmed) return;

    // Parse ticker format: "TICKER" or "TICKER COUNTRY_CODE" or "TICKER CRYPTO"
    const parts = trimmed.split(/\s+/);
    const ticker = parts[0];
    const secondPart = parts[1]?.toUpperCase();
    
    let assetType: 'equity' | 'crypto' = 'equity';
    let countryCode: string | undefined = 'US';
    
    // Check if it's a crypto pair (e.g., BTCUSD, ETHBTC)
    const isCryptoPair = /^[A-Z]{3,}[A-Z]{3,}$/.test(ticker) && 
                        (ticker.includes('BTC') || ticker.includes('ETH') || ticker.includes('USD') || ticker.length >= 6);
    
    if (isCryptoPair || secondPart === 'CRYPTO' || secondPart === 'C') {
      assetType = 'crypto';
      countryCode = undefined;
    } else if (secondPart && secondPart.length === 2) {
      countryCode = secondPart;
    }

    // Check if already in watchlist
    const exists = watchlist.some(
      w => w.ticker === ticker && 
           w.assetType === assetType && 
           w.countryCode === countryCode
    );

    if (!exists) {
      const newItem: WatchlistItem = { ticker, assetType, countryCode };
      const updatedWatchlist = [...watchlist, newItem];
      setWatchlist(updatedWatchlist);
      
      // Immediately fetch quote for new ticker
      const key = `${ticker}${countryCode ? `-${countryCode}` : ''}`;
      updateTimers.current[key] = Date.now();
      lastUpdateTime.current[key] = Date.now();
      
      // Subscribe to WebSocket immediately
      if (socket) {
        if (assetType === 'crypto') {
          socket.emit('subscribe:crypto', ticker);
        } else {
          socket.emit('subscribe:ticker', ticker);
        }
      }
      
      // Set up polling fallback
      pollingIntervals.current[key] = setInterval(() => {
        pollTicker(newItem);
      }, 3000);
      
      // Fetch initial quote immediately
      pollTicker(newItem);
      
      // Update pane config
      updatePane(pane.id, { config: { ...pane.config, watchlist: updatedWatchlist } });
      
      setNewTicker('');
    }
  };

  const handleRemoveTicker = (tickerToRemove: string, assetType: 'equity' | 'crypto', countryCode?: string) => {
    const updatedWatchlist = watchlist.filter(
      w => !(w.ticker === tickerToRemove && w.assetType === assetType && w.countryCode === countryCode)
    );
    setWatchlist(updatedWatchlist);
    
    // Remove from quotes
    const key = `${tickerToRemove}${countryCode ? `-${countryCode}` : ''}`;
    setQuotes(prev => {
      const newQuotes = { ...prev };
      delete newQuotes[key];
      return newQuotes;
    });
    
    // Clear polling interval
    if (pollingIntervals.current[key]) {
      clearInterval(pollingIntervals.current[key]);
      delete pollingIntervals.current[key];
    }
    
    // Clean up refs
    delete updateTimers.current[key];
    delete lastUpdateTime.current[key];
    
    // Unsubscribe from WebSocket
    if (socket) {
      if (assetType === 'crypto') {
        socket.emit('unsubscribe:crypto', tickerToRemove);
      } else {
        socket.emit('unsubscribe:ticker', tickerToRemove);
      }
    }
    
    // Update pane config
    updatePane(pane.id, { config: { ...pane.config, watchlist: updatedWatchlist } });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTicker();
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(4);
  };

  const formatLatency = (latency?: number) => {
    if (!latency) return '-';
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  return (
    <div className="quote-monitor-pane" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Add Ticker Input */}
      <div style={{ 
        padding: '8px', 
        borderBottom: '1px solid var(--terminal-border)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <input
          type="text"
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
          placeholder="Add ticker (e.g., AAPL US or BTCUSD)"
          style={{
            flex: 1,
            padding: '4px 8px',
            background: 'var(--terminal-bg)',
            border: '1px solid var(--terminal-border)',
            color: 'var(--terminal-text)',
            fontSize: '11px',
            borderRadius: '2px',
          }}
        />
        <button
          onClick={handleAddTicker}
          style={{
            padding: '4px 12px',
            background: 'var(--terminal-accent)',
            border: 'none',
            color: 'var(--terminal-bg)',
            fontSize: '11px',
            borderRadius: '2px',
            cursor: 'pointer',
          }}
        >
          Add
        </button>
        {/* Connection Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '9px',
          color: 'var(--terminal-dim)',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: wsConnected ? 'var(--terminal-success)' : 'var(--terminal-error)',
            display: 'inline-block',
          }} />
          <span>{wsConnected ? 'Live' : 'Polling'}</span>
        </div>
      </div>

      {/* Quotes Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading && watchlist.length === 0 ? (
          <div className="pane-loading" style={{ padding: '20px', textAlign: 'center' }}>
            Loading quote monitor...
          </div>
        ) : watchlist.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--terminal-dim)' }}>
            Add tickers to monitor live pricing
          </div>
        ) : (
          <table style={{ 
            width: '100%', 
            fontSize: '11px', 
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}>
            <thead style={{ 
              position: 'sticky', 
              top: 0, 
              background: 'var(--terminal-bg)',
              zIndex: 10,
            }}>
              <tr style={{ borderBottom: '2px solid var(--terminal-border)' }}>
                <th style={{ padding: '8px 4px', textAlign: 'left', width: '15%' }}>Symbol</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', width: '12%' }}>Last</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', width: '12%' }}>Bid</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', width: '12%' }}>Ask</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', width: '12%' }}>Change %</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', width: '15%' }}>Volume</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', width: '10%' }}>Latency</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', width: '10%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((item) => {
                const key = `${item.ticker}${item.countryCode ? `-${item.countryCode}` : ''}`;
                const quote = quotes[key];
                
                if (!quote) {
                  return (
                    <tr key={key} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                      <td style={{ padding: '8px 4px' }}>
                        {item.ticker} {item.countryCode || (item.assetType === 'crypto' ? 'CRYPTO' : '')}
                      </td>
                      <td colSpan={7} style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--terminal-dim)' }}>
                        Loading...
                      </td>
                    </tr>
                  );
                }

                const isPositive = quote.change >= 0;
                const changeColor = isPositive ? 'var(--terminal-success)' : 'var(--terminal-error)';
                
                // Calculate time since last update for stale data detection
                const timeSinceUpdate = lastUpdateTime.current[key] 
                  ? Date.now() - lastUpdateTime.current[key] 
                  : 0;
                const isStale = timeSinceUpdate > 5000; // Stale if > 5 seconds
                const isVeryStale = timeSinceUpdate > 10000; // Very stale if > 10 seconds

                return (
                  <tr 
                    key={key} 
                    style={{ 
                      borderBottom: '1px solid var(--terminal-border)',
                      backgroundColor: isVeryStale 
                        ? 'rgba(255, 0, 0, 0.15)' 
                        : isStale 
                        ? 'rgba(255, 165, 0, 0.1)' 
                        : 'transparent',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <td style={{ padding: '8px 4px', fontWeight: 'bold' }}>
                      {quote.symbol} {item.countryCode || ''}
                      {isStale && (
                        <span style={{ 
                          marginLeft: '4px', 
                          fontSize: '9px', 
                          color: 'var(--terminal-error)',
                          opacity: 0.7,
                        }}>
                          ⚠
                        </span>
                      )}
                    </td>
                    <td style={{ 
                      padding: '8px 4px', 
                      textAlign: 'right', 
                      fontWeight: 'bold',
                      color: isStale ? 'var(--terminal-dim)' : 'var(--terminal-text)',
                    }}>
                      ${formatPrice(quote.price)}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--terminal-dim)' }}>
                      ${formatPrice(quote.bid || quote.price * 0.999)}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--terminal-dim)' }}>
                      ${formatPrice(quote.ask || quote.price * 1.001)}
                    </td>
                    <td style={{ 
                      padding: '8px 4px', 
                      textAlign: 'right', 
                      color: changeColor,
                      fontWeight: 'bold',
                    }}>
                      {isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                      {quote.volume.toLocaleString()}
                    </td>
                    <td style={{ 
                      padding: '8px 4px', 
                      textAlign: 'right',
                      color: quote.latency && quote.latency > 2000 ? 'var(--terminal-error)' : 'var(--terminal-dim)',
                      fontSize: '10px',
                    }}>
                      {formatLatency(quote.latency)}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveTicker(item.ticker, item.assetType, item.countryCode)}
                        style={{
                          background: 'var(--terminal-error)',
                          border: 'none',
                          color: 'white',
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '2px',
                          cursor: 'pointer',
                        }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

