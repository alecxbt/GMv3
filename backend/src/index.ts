import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from './utils/logger.js';

// Import routes
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
import { initializeSampleAlerts } from './services/alertsService.js';
import dotenv from 'dotenv';

dotenv.config();

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  PORT: string;
};

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', cors({
  origin: (origin) => origin || 'http://localhost:3000',
  credentials: true,
}));

// Routes
app.route('/api/kanban', kanbanRoutes);
app.route('/api/layouts', layoutRoutes);
app.route('/api/watchlists', watchlistRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/portfolio', portfolioRoutes);
app.route('/api/rss', rssRoutes);
app.route('/api/exposure', exposureRoutes);
app.route('/api/errors', errorRoutes);
app.route('/api/data', dataRoutes);
app.route('/api/trading', tradingRoutes);
app.route('/api/onchain', onchainRoutes);
app.route('/api/defi', defiRoutes);
app.route('/api/prediction', predictionRoutes);
app.route('/api/economic', economicRoutes);
app.route('/api/sentiment', sentimentRoutes);
app.route('/api/fundamental', fundamentalRoutes);
app.route('/api/governance', governanceRoutes);
app.route('/api/alerts', alertsRoutes);

// Health check
app.get('/health', (c) => c.json({ 
  status: 'ok', 
  timestamp: new Date().toISOString(),
  platform: 'hono-node-server'
}));

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ 
    error: 'Internal server error',
    message: err.message 
  }, 500);
});

// Initialize sample alerts on startup (for demo)
initializeSampleAlerts();

const port = parseInt(process.env.PORT || '5001');

console.log(`🚀 GM Terminal backend running on port ${port}`);
console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
console.log(`API endpoints available at: http://localhost:${port}/api`);
console.log(`Health check: http://localhost:${port}/health`);

serve({
  fetch: app.fetch,
  port,
});

export default app;