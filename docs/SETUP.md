# GM Terminal Setup Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (for portfolios/RSS)
- Redis 6+ (for caching, optional initially)

## Installation

### 1. Clone and Install Dependencies

```bash
cd GM Terminal
npm install
```

This will install dependencies for all workspaces (frontend, backend, shared).

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb macroterm

# Or using psql
psql -U postgres
CREATE DATABASE macroterm;
\q

# Set up Prisma
cd backend
npm run db:generate
npm run db:migrate
```

### 3. Environment Variables

Create `.env` files:

**backend/.env:**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/macroterm
REDIS_URL=redis://localhost:6379
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**frontend/.env:**
```env
VITE_API_URL=http://localhost:5000
```

### 4. Start Development Servers

From the root directory:

```bash
# Start both frontend and backend
npm run dev

# Or separately:
npm run dev:frontend  # Frontend on port 3000
npm run dev:backend   # Backend on port 5000
```

## Development

### Project Structure

```
GM Terminal/
├── frontend/          # React + TypeScript
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── store/       # Zustand state
│   │   ├── utils/       # Utilities
│   │   └── App.tsx      # Main app
│   └── package.json
├── backend/            # Node.js + Express
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── websocket.ts # WebSocket setup
│   │   └── index.ts    # Server entry
│   └── prisma/         # Database schema
├── shared/             # Shared types
│   └── src/
│       └── types.ts
└── docs/               # Documentation
```

### Adding New CLI Commands

1. Add command parsing logic in `frontend/src/utils/commandParser.ts`
2. Add command execution in `frontend/src/utils/commandExecutor.ts`
3. Create pane component in `frontend/src/components/Pane/`
4. Add pane type to `shared/src/types.ts`
5. Register pane in `frontend/src/components/Pane/Pane.tsx`

### Adding API Endpoints

1. Create route file in `backend/src/routes/`
2. Register route in `backend/src/index.ts`
3. Add types to `shared/src/types.ts` if needed

## Testing

```bash
# Run tests (when implemented)
npm test

# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test
```

## Building for Production

```bash
# Build all workspaces
npm run build

# Frontend build
cd frontend && npm run build

# Backend build
cd backend && npm run build
```

## Deployment

### Frontend (Vercel/Netlify)

```bash
cd frontend
npm run build
# Deploy dist/ folder
```

### Backend (Railway/Render)

1. Set environment variables
2. Run migrations: `npm run db:migrate`
3. Start server: `npm start`

## API Integration

### Current Mock Data

The application currently uses mock data. To integrate real APIs:

1. **Nasdaq Data** - Replace mock quotes in `backend/src/routes/data.ts`
2. **CoinGecko** - Replace mock crypto data
3. **Polymarket/Kalshi** - Replace mock prediction data
4. **ETFdb/Yahoo** - Replace mock exposure data

### API Keys

Add API keys to `backend/.env`:

```env
NASDAQ_API_KEY=your_key
COINGECKO_API_KEY=your_key
POLYMARKET_API_KEY=your_key
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill

# Kill process on port 5000
lsof -ti:5000 | xargs kill
```

### Database Connection Issues

- Verify PostgreSQL is running
- Check DATABASE_URL in `.env`
- Ensure database exists: `psql -l | grep macroterm`

### Module Not Found Errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- [ ] Integrate real market data APIs
- [ ] Add authentication (NextAuth)
- [ ] Implement layout persistence
- [ ] Add WebSocket real-time updates
- [ ] Create mobile responsive design
- [ ] Add pro tier gating
- [ ] Set up error monitoring (Sentry)
- [ ] Add E2E tests (Cypress)

