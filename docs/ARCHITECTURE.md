# GM Terminal Architecture

## Overview

GM Terminal is a monorepo application with three main workspaces:
- **Frontend**: React + TypeScript SPA
- **Backend**: Node.js + Express API
- **Shared**: Common TypeScript types

## Frontend Architecture

### State Management

Uses Zustand for global state:
- `useTerminalStore`: Pane management, command history, layouts, themes

### Component Structure

```
App
├── PaneGrid (resizable panes)
│   └── Pane (individual pane wrapper)
│       ├── ChartPane
│       ├── NewsPane
│       ├── QuotePane
│       ├── PortfolioPane
│       └── ... (other pane types)
└── CLI (terminal interface)
    └── xterm.js terminal
```

### Command Flow

1. User types command in CLI
2. `commandParser.ts` parses input
3. `commandExecutor.ts` executes command
4. Creates new `Pane` object
5. Adds to Zustand store
6. PaneGrid renders new pane

### Real-Time Updates

- WebSocket connection to backend
- Subscribe to ticker updates
- Auto-refresh panes with new data

## Backend Architecture

### API Routes

- `/api/portfolio` - Portfolio management
- `/api/rss` - RSS feed management
- `/api/exposure` - ETF/fund exposures
- `/api/data` - Market data (quotes, charts, news)
- `/api/errors` - Error reporting

### WebSocket Events

- `subscribe:ticker` - Subscribe to ticker updates
- `ticker:update` - Real-time price updates
- `subscribe:portfolio` - Portfolio alerts
- `portfolio:alert` - Portfolio change alerts

### Data Sources

Currently using mock data. Integration points:
- Nasdaq API (equities)
- CoinGecko API (crypto)
- Polymarket/Kalshi (predictions)
- ETFdb/Yahoo Finance (exposures)
- RSS feeds (user-added)

## Database Schema

### Models

- `User` - User accounts
- `PortfolioPosition` - User holdings
- `RSSFeed` - User RSS subscriptions
- `Layout` - Saved layouts

## Performance Considerations

### Frontend

- Virtual scrolling for large lists
- Lazy loading of pane components
- Memoization of expensive calculations
- Debounced API calls

### Backend

- Redis caching for frequently accessed data
- Rate limiting (100 req/min free tier)
- Connection pooling for database
- WebSocket connection management

## Security

- Rate limiting on API endpoints
- Input validation (Zod schemas)
- CORS configuration
- Helmet.js security headers
- SQL injection prevention (Prisma)
- XSS protection

## Scalability

### Current Limitations

- In-memory state (panes, layouts)
- Mock data sources
- Single server instance

### Future Improvements

- Redis for session/state management
- Database persistence for layouts
- CDN for static assets
- Load balancing for API
- Horizontal scaling with Redis pub/sub

## Monitoring

- Error tracking (Sentry - TODO)
- Performance monitoring
- API usage metrics
- WebSocket connection tracking

## Deployment

### Frontend
- Static build (Vite)
- CDN distribution
- Environment-based API URLs

### Backend
- Node.js runtime
- PostgreSQL database
- Redis cache
- WebSocket server

