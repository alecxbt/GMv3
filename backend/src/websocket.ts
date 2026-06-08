import { Server } from 'socket.io';
import { getQuote } from './services/marketData.js';
import { getCryptoQuote } from './services/cryptoData.js';
import { logger } from './utils/logger.js';

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

// Track subscribed tickers
const subscribedTickers = new Set<string>();
const subscribedCrypto = new Set<string>();

export function setupWebSocket(io: Server) {
  io.on('connection', (socket) => {
    logger.info('WebSocket client connected:', socket.id);

    // Subscribe to ticker updates
    socket.on('subscribe:ticker', async (ticker: string) => {
      logger.info(`Client ${socket.id} subscribed to ${ticker}`);
      socket.join(`ticker:${ticker}`);
      subscribedTickers.add(ticker);
      
      // Send initial quote
      try {
        const quote = await getQuote(ticker);
        socket.emit('ticker:update', quote);
        logger.debug(`Sent initial quote for ${ticker} to ${socket.id}`);
      } catch (error) {
        logger.error(`Error fetching initial quote for ${ticker}:`, error);
      }
    });

    // Unsubscribe from ticker updates
    socket.on('unsubscribe:ticker', (ticker: string) => {
      logger.info(`Client ${socket.id} unsubscribed from ${ticker}`);
      socket.leave(`ticker:${ticker}`);
    });

    // Subscribe to crypto updates
    socket.on('subscribe:crypto', async (pair: string) => {
      logger.info(`Client ${socket.id} subscribed to crypto ${pair}`);
      socket.join(`crypto:${pair}`);
      subscribedCrypto.add(pair);
      
      // Send initial quote
      try {
        const quote = await getCryptoQuote(pair);
        socket.emit('crypto:update', quote);
        logger.debug(`Sent initial crypto quote for ${pair} to ${socket.id}`);
      } catch (error) {
        logger.error(`Error fetching initial crypto quote for ${pair}:`, error);
      }
    });

    // Unsubscribe from crypto updates
    socket.on('unsubscribe:crypto', (pair: string) => {
      logger.info(`Client ${socket.id} unsubscribed from crypto ${pair}`);
      socket.leave(`crypto:${pair}`);
    });

    // Subscribe to portfolio updates
    socket.on('subscribe:portfolio', () => {
      logger.info(`Client ${socket.id} subscribed to portfolio`);
      socket.join('portfolio');
    });

    socket.on('disconnect', () => {
      logger.info('WebSocket client disconnected:', socket.id);
    });
  });

  // Real-time price updates for subscribed tickers - faster updates for quote monitor
  setInterval(async () => {
    if (subscribedTickers.size === 0) return;
    
    // Process in batches to avoid overwhelming the API
    const tickersArray = Array.from(subscribedTickers);
    const batchSize = 10;
    
    for (let i = 0; i < tickersArray.length; i += batchSize) {
      const batch = tickersArray.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (ticker) => {
          try {
            const quote = await getQuote(ticker);
            io.to(`ticker:${ticker}`).emit('ticker:update', quote);
            logger.debug(`Updated quote for ${ticker}`);
          } catch (error) {
            logger.error(`Error updating ticker ${ticker}:`, error);
          }
        })
      );
    }
  }, 2000); // Update every 2 seconds for real-time feel

  // Real-time crypto updates - faster updates for quote monitor
  setInterval(async () => {
    if (subscribedCrypto.size === 0) return;
    
    // Process in batches
    const cryptoArray = Array.from(subscribedCrypto);
    const batchSize = 10;
    
    for (let i = 0; i < cryptoArray.length; i += batchSize) {
      const batch = cryptoArray.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (pair) => {
          try {
            const quote = await getCryptoQuote(pair);
            io.to(`crypto:${pair}`).emit('crypto:update', quote);
            logger.debug(`Updated crypto quote for ${pair}`);
          } catch (error) {
            logger.error(`Error updating crypto ${pair}:`, error);
          }
        })
      );
    }
  }, 2000); // Update every 2 seconds for real-time feel

  // Portfolio alerts (e.g., >5% change)
  setInterval(() => {
    // Check for portfolio alerts
    // This would check actual portfolio data and emit alerts
    io.to('portfolio').emit('portfolio:alert', {
      type: 'price_change',
      message: 'Portfolio value changed by more than 5%',
      timestamp: Date.now(),
    });
  }, 30000); // Check every 30 seconds
}

