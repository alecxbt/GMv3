# GM Terminal - Web-Based Financial Terminal

A browser-based financial terminal mimicking Godel Terminal's efficient CLI-driven UI for real-time market data, tailored for macro investors.

## Features

- **CLI-First Interface**: Terminal-style commands with <100ms latency
- **Multi-Pane Dashboard**: Support 100+ windows/tabs with virtualized rendering (low RAM usage)
- **Portfolio Tracking**: ETF/fund exposure breakdowns, P&L tracking
- **Crypto & Prediction Markets**: Enhanced coverage with real-time data
- **Custom RSS Feeds**: User-added RSS integration
- **Real-Time Data**: WebSocket-powered live updates
- **Voice Alerts**: Automatic announcements for significant price changes
- **EDGAR Filings**: Direct links to SEC filings with filtering
- **Sector Monitors**: Real-time sector performance tracking
- **Predictive Analytics**: ML-powered market predictions
- **Rich Text Notes**: In-app note-taking with formatting
- **Highly Customizable**: Save/load layouts, themes, keyboard shortcuts

## Project Structure

```
GM Terminal/
├── frontend/          # React + TypeScript application
├── backend/           # Node.js + Express API
├── shared/            # Shared types and utilities
└── docs/              # Documentation and wireframes
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (for portfolios/RSS)
- Redis (for caching)

### Installation

```bash
# Install dependencies
npm install

# Start development servers
npm run dev          # Starts both frontend and backend
npm run dev:frontend # Frontend only (port 3000)
npm run dev:backend  # Backend only (port 5000)
```

### Environment Variables

Create `.env` files in `frontend/` and `backend/`:

**backend/.env:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/macroterm
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, xterm.js, Zustand
- **Backend**: Node.js, Express, Socket.io, Prisma
- **Database**: PostgreSQL, Redis
- **Charts**: Recharts, TradingView widgets

## CLI Commands

### Core Commands (Country Code Format)
- `TICKER COUNTRY_CODE G` - Chart view (e.g., `AAPL US G`, `DBK DE G`)
- `TICKER COUNTRY_CODE N` - News headlines
- `TICKER COUNTRY_CODE FOCUS` - Live quote pane
- `TICKER COUNTRY_CODE OPT` - Options chain
- `TICKER COUNTRY_CODE CF` - Corporate filings (EDGAR)
- `MANAGER NAME CF` or `MANAGER NAME 13-F` - 13-F filings for hedge fund managers (e.g., `Bill Ackman CF`, `Israel Englander 13-F`)
- `MOST` - Most active stocks

### Crypto Commands
- `CRYPTOPAIR G` - Chart view (e.g., `BTCUSD G`, `BTCZEC G` for ratio charts)
- `CRYPTOPAIR N` - News for crypto pair
- Examples: `BTCUSD G`, `ETHBTC G`, `BTCZEC G`

### Portfolio Commands
- `PORT ADD TICKER shares [type]` - Add to portfolio
- `PORT VIEW` - Portfolio pane with P&L
- `PORT EXP TICKER` - Exposure breakdown

### Legacy Crypto Commands (Deprecated - use CRYPTOPAIR format instead)
- `CRYPTO ASSET VOL` - Volume/OHLC (use `CRYPTOPAIR VOL` instead)
- `CRYPTO BTC WHALE` - On-chain alerts

### Prediction Markets
- `PRED EVENT [yes/no]` - Odds pane
- `PRED VOL` - Top markets by volume

### RSS Commands
- `RSS ADD url "label"` - Subscribe to feed
- `RSS VIEW label` - View feed pane

### Advanced Features
- `NOTES` - Open rich-text notes pane
- `SECTOR` - Sector monitor with real-time updates
- `PREDICT` - Predictive analytics pane
- Voice alerts automatically announce significant price changes (>1%)

## Development Milestones

- [x] Week 1-2: CLI prototype + basic panes
- [ ] Week 3: Layout customizability + shortcuts
- [ ] Week 4: Portfolio module + exposures
- [ ] Week 5: Real-time WebSockets, alerts
- [ ] Week 6: Pro tier gating, testing

## License

MIT

