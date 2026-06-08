# Crypto Trading Features

This document outlines the new crypto-focused features added to GM Terminal, making it a professional-grade terminal for crypto trading desks.

## 🚀 New Features

### 1. On-Chain Data Integration

Access real-time blockchain analytics directly in the terminal:

- **Whale Alerts**: Monitor large transfers, deposits, and withdrawals
- **Exchange Flows**: Track inflows and outflows from major exchanges
- **On-Chain Metrics**: View total supply, holders, active addresses, and transaction volumes

**CLI Commands:**
```
BTC ONCHAIN        # Open on-chain data pane for BTC
ETH ONCHAIN        # Open on-chain data pane for ETH
```

**API Endpoints:**
- `GET /api/onchain/whale-alerts/:token` - Get whale alerts
- `GET /api/onchain/flows/:token` - Get exchange flows
- `GET /api/onchain/metrics/:token` - Get on-chain metrics

**Data Sources:**
- Etherscan API (for Ethereum-based tokens)
- The Graph (for Uniswap and DeFi data)
- Glassnode (for advanced analytics - optional)
- Dune Analytics (for custom queries - optional)

### 2. Smart Order Routing System

Execute trades across multiple exchanges with intelligent routing:

**Routing Strategies:**
- **Best Price**: Routes to exchange with best bid/ask
- **Liquidity**: Routes to exchange with highest volume
- **Split Order**: Distributes large orders across multiple exchanges

**Features:**
- Multi-exchange support (Binance, Coinbase, Kraken, OKX, Bybit)
- Real-time price comparison
- Slippage protection
- Order splitting for large sizes
- Execution tracking

**CLI Commands:**
```
TRADE              # Open trading terminal
BTCUSD TRADE       # Open trading terminal with BTC/USD pre-selected
```

**API Endpoints:**
- `POST /api/trading/order` - Place order
- `POST /api/trading/order/:orderId/cancel` - Cancel order
- `GET /api/trading/order/:orderId` - Get order status
- `GET /api/trading/orders` - Get all orders
- `GET /api/trading/best-price` - Get best execution price
- `GET /api/trading/statistics` - Get trading statistics

### 3. Multi-Exchange Portfolio Tracking

Aggregate your portfolio across all connected exchanges:

**Features:**
- Real-time balance sync from all exchanges
- Unified P&L calculation
- Exchange breakdown (see allocation per exchange)
- Automatic price updates
- Support for all major cryptocurrencies

**CLI Commands:**
```
PORT VIEW          # View aggregated portfolio
PORT VIEW?exchange=binance  # View portfolio from specific exchange
```

**API Endpoints:**
- `GET /api/portfolio?userId=xxx` - Get aggregated portfolio
- `GET /api/portfolio?userId=xxx&exchange=binance` - Get exchange-specific portfolio

### 4. Exchange Connectors

Unified interface for connecting to multiple exchanges:

**Supported Exchanges:**
- ✅ Binance (fully implemented)
- ✅ Coinbase (partially implemented)
- 🚧 Kraken (framework ready)
- 🚧 OKX (framework ready)
- 🚧 Bybit (framework ready)

**Exchange Connection Setup:**
1. Configure API keys in database (encrypted storage)
2. Enable/disable exchanges per user
3. Sandbox mode support for testing

**Database Schema:**
```prisma
model ExchangeConnection {
  id          String   @id @default(cuid())
  userId      String
  exchange    String   // binance, coinbase, etc.
  apiKey      String   // Encrypted
  apiSecret   String   // Encrypted
  passphrase  String?  // Encrypted (for Coinbase)
  sandbox     Boolean  @default(false)
  enabled     Boolean  @default(true)
}
```

## 📊 Order Management System

Track and manage orders across all exchanges:

**Features:**
- Order status tracking (pending, open, filled, cancelled)
- Execution history with fills
- Fee tracking
- Real-time order updates
- Order cancellation
- Statistics dashboard

**Database Schema:**
```prisma
model Order {
  id              String   @id @default(cuid())
  userId          String
  exchange        String
  symbol          String
  side            String   // buy, sell
  type            String   // market, limit, stop, stop_limit
  quantity        Float
  price           Float?
  status          String
  filledQuantity  Float
  routingStrategy String?
}

model Execution {
  id        String   @id @default(cuid())
  orderId   String
  exchange  String
  quantity  Float
  price     Float
  fee       Float?
  timestamp DateTime
}
```

## 🔧 Configuration

### Environment Variables

Add these to your `backend/.env`:

```bash
# On-Chain Data APIs (Optional)
ETHERSCAN_API_KEY=your_etherscan_key
GLASSNODE_API_KEY=your_glassnode_key
THE_GRAPH_API_URL=https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3
DUNE_API_KEY=your_dune_key

# Exchange API Keys (configured per user in database)
# These are stored encrypted in the ExchangeConnection model
```

### Routing Configuration

Default routing config in `smartOrderRouter.ts`:

```typescript
const routingConfig: RoutingConfig = {
  enabledExchanges: ['binance', 'coinbase', 'kraken'],
  defaultStrategy: 'best_price',
  slippageTolerance: 1.0, // 1%
  minOrderSize: 0.001,
  maxOrderSize: 1000,
};
```

## 🎯 Usage Examples

### View On-Chain Data
```
BTC ONCHAIN
```
Opens a pane with:
- Whale alerts (large transfers)
- Exchange flows (inflows/outflows)
- On-chain metrics (supply, holders, transactions)

### Place a Trade
```
TRADE
```
Opens trading terminal where you can:
- Select symbol (e.g., BTC/USD)
- Choose side (buy/sell)
- Select order type (market/limit/stop)
- Set quantity and price
- Choose routing strategy
- Monitor order execution

### View Multi-Exchange Portfolio
```
PORT VIEW
```
Shows:
- Aggregated positions across all exchanges
- Total value and P&L
- Breakdown by exchange
- Real-time price updates

## 🔒 Security Considerations

1. **API Key Encryption**: Exchange credentials are encrypted at rest
2. **Sandbox Mode**: Test with sandbox accounts before going live
3. **Rate Limiting**: All API endpoints are rate-limited
4. **User Isolation**: Orders and portfolios are user-specific
5. **Audit Trail**: All orders and executions are logged

## 🚧 Future Enhancements

- [ ] Advanced order types (iceberg, TWAP, VWAP)
- [ ] Portfolio rebalancing automation
- [ ] Risk management (position limits, stop losses)
- [ ] Advanced on-chain analytics (funding rates, open interest)
- [ ] DEX integration (Uniswap, SushiSwap)
- [ ] Cross-chain support (Solana, Polygon, etc.)
- [ ] Backtesting framework
- [ ] Strategy builder
- [ ] Alerts and notifications

## 📝 Notes

- The system currently focuses on centralized exchanges (CEX)
- On-chain data is primarily for Ethereum-based tokens
- Order routing requires API keys to be configured
- Portfolio aggregation works best with multiple exchange connections
- All prices are in USD by default

## 🐛 Known Limitations

1. Coinbase connector is partially implemented (balance fetching works, order placement needs completion)
2. On-chain data requires API keys for full functionality
3. Portfolio cost basis calculation assumes current price (needs trade history integration)
4. Some exchanges may have rate limits that affect routing speed

## 💡 Tips for Trading Desks

1. **Start with Sandbox**: Test all functionality in sandbox mode first
2. **Monitor Slippage**: Use slippage tolerance settings to protect against bad fills
3. **Split Large Orders**: Use split strategy for orders > $100k to minimize market impact
4. **Track Fees**: Monitor execution fees across exchanges to optimize routing
5. **Use On-Chain Data**: Whale alerts can signal large movements before they hit exchanges

