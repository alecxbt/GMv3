# GM Terminal Quick Start

Get GM Terminal running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL running (optional for MVP - can use mock data)

## Quick Setup

```bash
# 1. Install dependencies
npm install

# 2. Start development servers
npm run dev
```

That's it! The app will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Try It Out

Open http://localhost:3000 and try these commands in the CLI:

```
AAPL EQ G          # View AAPL chart
TSLA EQ N          # View TSLA news
PORT VIEW          # View portfolio
CRYPTO BTC VOL     # View BTC volume
MOST ACTIVE        # View most active stocks
```

## Next Steps

1. **Add Database** (optional): See `docs/SETUP.md` for PostgreSQL setup
2. **Integrate Real APIs**: Replace mock data with actual market data APIs
3. **Customize**: Modify themes, layouts, and commands

## Troubleshooting

**Port already in use?**
```bash
# Kill processes
lsof -ti:3000 | xargs kill
lsof -ti:5000 | xargs kill
```

**Module errors?**
```bash
rm -rf node_modules package-lock.json
npm install
```

## Documentation

- `docs/SETUP.md` - Detailed setup guide
- `docs/ARCHITECTURE.md` - Architecture overview
- `docs/WIREFRAMES.md` - UI wireframes
- `README.md` - Project overview

## Features Implemented

✅ CLI with xterm.js  
✅ Resizable pane grid  
✅ Core commands (EQ G, N, FOCUS)  
✅ Portfolio tracking  
✅ Crypto commands  
✅ Prediction markets  
✅ RSS feeds  
✅ WebSocket real-time updates  
✅ Command history  
✅ Keyboard shortcuts  

## Coming Soon

- Real market data APIs
- Authentication
- Layout persistence
- Mobile responsive
- Pro tier features

