import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { kanbanRoutes } from './routes/kanban';
import { watchlistRoutes } from './routes/watchlists';
import { layoutRoutes } from './routes/layouts';
import { authRoutes } from './routes/auth';
import { portfolioRoutes } from './routes/portfolio';
import { rssRoutes } from './routes/rss';
import { exposureRoutes } from './routes/exposure';
import { errorRoutes } from './routes/error';
import { dataRoutes } from './routes/data';
import { tradingRoutes } from './routes/trading';
import { onchainRoutes } from './routes/onchain';
import { defiRoutes } from './routes/defi';
import { predictionRoutes } from './routes/prediction';
import { economicRoutes } from './routes/economic';
import { sentimentRoutes } from './routes/sentiment';
import { fundamentalRoutes } from './routes/fundamental';
import { governanceRoutes } from './routes/governance';
import { alertsRoutes } from './routes/alerts';
import { setupWebSocket } from './websocket';
import { logger } from './utils/logger.js';
import { initializeSampleAlerts } from './services/alertsService.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5001;

// Middleware
// Configure Helmet for development (less restrictive)
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
} else {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
}
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute for free tier
  message: 'Too many requests, please try again later.',
});
app.use('/api', limiter);

// Routes
app.use('/api/kanban', kanbanRoutes);
app.use('/api/layouts', layoutRoutes);
app.use('/api/watchlists', watchlistRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/rss', rssRoutes);
app.use('/api/exposure', exposureRoutes);
app.use('/api/errors', errorRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/onchain', onchainRoutes);
app.use('/api/defi', defiRoutes);
app.use('/api/prediction', predictionRoutes);
app.use('/api/economic', economicRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/fundamental', fundamentalRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/alerts', alertsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup WebSocket
setupWebSocket(io);

// Start server
httpServer.listen(PORT, () => {
  logger.info(`🚀 GM Terminal backend running on port ${PORT}`);
  logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  logger.info(`API endpoints available at: http://localhost:${PORT}/api`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  
  // Initialize sample alerts for demo
  initializeSampleAlerts();
});
