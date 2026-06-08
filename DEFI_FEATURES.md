# DeFi Features - DeFiLlama Integration

This document outlines the comprehensive DeFi features added to GM Terminal, making it a complete DeFi analytics platform similar to DeFiLlama.

## 🚀 Features

### 1. Protocol Analytics

Track and analyze all DeFi protocols across multiple chains:

- **Protocol Rankings**: View top protocols by TVL
- **Protocol Details**: Deep dive into individual protocols
- **TVL History**: Historical TVL charts for protocols
- **Multi-Chain Support**: Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Solana, and more

**CLI Commands:**
```
DEFI                    # Open DeFi overview
uniswap DEFI            # View Uniswap protocol details
aave DEFI               # View Aave protocol details
```

**API Endpoints:**
- `GET /api/defi/protocols` - Get all protocols
- `GET /api/defi/protocol/:id` - Get protocol details
- `GET /api/defi/protocol/:id/tvl` - Get protocol TVL history
- `GET /api/defi/rankings` - Get protocol rankings
- `GET /api/defi/search?q=query` - Search protocols

### 2. Global TVL Tracking

Monitor Total Value Locked across the entire DeFi ecosystem:

- **Global TVL**: Aggregate TVL across all chains
- **Chain Breakdown**: TVL by individual blockchain
- **Historical Trends**: 30-day, 90-day, and full history charts
- **Real-time Updates**: Auto-refresh every 2 minutes

**CLI Commands:**
```
DEFI                    # View global TVL overview
```

**API Endpoints:**
- `GET /api/defi/tvl/global` - Get global TVL history
- `GET /api/defi/tvl/chains` - Get chain TVL breakdown

### 3. Yield Farming Opportunities

Discover and compare yield farming opportunities:

- **APY/APR Data**: Real-time yield rates
- **TVL Filtering**: Filter by minimum TVL
- **Chain Filtering**: Filter by blockchain
- **Risk Indicators**: Impermanent loss risk ratings
- **Historical APY**: 30-day average APY tracking

**CLI Commands:**
```
YIELDS                  # View yield opportunities
DEFI                    # Switch to Yields tab
```

**API Endpoints:**
- `GET /api/defi/yields?minTVL=100000&minAPY=5&chain=Ethereum` - Get yield opportunities

**Features:**
- Filter by minimum TVL (default: $100k)
- Filter by minimum APY (default: 0%)
- Filter by chain
- Sort by APY (highest first)
- Display base APY vs reward APY
- Show impermanent loss risk

### 4. Chain Analytics

Compare DeFi activity across different blockchains:

- **Chain TVL Comparison**: Side-by-side chain comparison
- **Bar Charts**: Visual chain TVL breakdown
- **Top Chains**: Ranked by total TVL
- **Multi-Chain Support**: All major L1 and L2 chains

**CLI Commands:**
```
DEFI                    # Switch to Chains tab
```

### 5. Protocol Comparison

Compare multiple protocols side-by-side:

- **TVL Comparison**: Compare protocol sizes
- **Performance Metrics**: 1d, 7d, 30d changes
- **Chain Distribution**: See which chains protocols operate on
- **Token Metrics**: Market cap, token price (if available)

## 📊 Data Sources

All DeFi data is sourced from **DeFiLlama API**:

- **Main API**: `https://api.llama.fi`
- **Yields API**: `https://yields.llama.fi`
- **No API Key Required**: DeFiLlama provides free public API access
- **Rate Limits**: Reasonable rate limits, cached for 60 seconds

## 🎯 Usage Examples

### View DeFi Overview
```
DEFI
```
Opens a pane with:
- Global TVL dashboard
- TVL trend chart
- Top chains breakdown
- Quick access to protocols, yields, and chains

### View Protocol Details
```
uniswap DEFI
aave DEFI
compound DEFI
```
Shows:
- Protocol name and description
- Current TVL
- 1d, 7d, 30d changes
- Market cap (if available)
- Token price (if available)
- Historical TVL chart

### Find Yield Opportunities
```
YIELDS
```
Displays:
- Top yield farming pools
- Filterable by chain, min TVL, min APY
- APY breakdown (base + rewards)
- Impermanent loss risk
- Pool TVL

### Search Protocols
```
DEFI search uniswap
```
Returns matching protocols with:
- Protocol name
- Chain
- Current TVL
- Performance metrics

## 🔧 Configuration

### Caching

DeFi data is cached to minimize API calls:
- **Protocols**: 60 seconds
- **TVL Data**: 5 minutes (300 seconds)
- **Yields**: 60 seconds

### Auto-Refresh

All DeFi panes auto-refresh:
- **Overview**: Every 2 minutes
- **Protocols**: Every 2 minutes
- **Yields**: Every 2 minutes

## 📈 Database Schema

### DefiPosition

Track your DeFi positions:

```prisma
model DefiPosition {
  id              String   @id @default(cuid())
  userId          String
  protocolId      String
  protocolName    String
  chain           String
  poolId          String?
  poolName        String?
  tokenSymbol     String
  amount          Float
  valueUSD        Float
  apy             Float?
  apyBase         Float?
  apyReward       Float?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### WatchedProtocol

Watch protocols for alerts:

```prisma
model WatchedProtocol {
  id          String   @id @default(cuid())
  userId      String
  protocolId  String
  protocolName String
  alerts      Json?    // Alert preferences
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 🎨 UI Features

### DeFi Overview Pane

- **Total TVL Card**: Large display of global TVL
- **TVL Trend Chart**: 30-day historical chart
- **Top Chains Grid**: Visual breakdown of chain TVL
- **Tab Navigation**: Switch between Overview, Protocols, Yields, Chains

### Protocols Tab

- **Chain Filter**: Filter by blockchain
- **Sortable Table**: Sort by TVL, 1d, 7d, 30d changes
- **Color-Coded Changes**: Green for positive, red for negative
- **Top 50 Display**: Shows top 50 protocols by default

### Yields Tab

- **Advanced Filters**: Chain, min TVL, min APY
- **APY Display**: Bold, color-coded APY values
- **Risk Indicators**: Impermanent loss risk
- **Project & Pool Info**: Full pool details

### Chains Tab

- **Bar Chart**: Visual chain comparison
- **Top 15 Chains**: Displayed in chart
- **TVL Values**: Formatted currency display

## 🔒 Data Accuracy

- **Real-time Data**: Direct from DeFiLlama API
- **Cached Responses**: Reduces API load while maintaining freshness
- **Error Handling**: Graceful fallbacks if API unavailable
- **Data Validation**: Type-safe data structures

## 🚧 Future Enhancements

- [ ] DeFi position tracking (manual entry)
- [ ] Protocol alerts (TVL changes, APY drops)
- [ ] Historical APY charts per pool
- [ ] Protocol comparison tool
- [ ] DeFi news integration
- [ ] Security audit tracking
- [ ] Token unlock calendar
- [ ] Airdrop tracking
- [ ] Gas fee optimization suggestions
- [ ] Cross-protocol arbitrage opportunities
- [ ] DeFi portfolio aggregation
- [ ] Yield farming strategy builder

## 💡 Tips for Trading Desks

1. **Monitor Top Protocols**: Use rankings to identify trending protocols
2. **Track TVL Changes**: Large TVL changes can signal protocol health
3. **Compare Yields**: Use yield tab to find best opportunities
4. **Watch Multiple Chains**: Different chains offer different yields
5. **Filter by Risk**: Use IL risk indicators to assess pool safety
6. **Historical Context**: Check TVL history before investing
7. **Protocol Details**: Always review protocol details before deploying capital

## 📝 Notes

- All data is read-only (no trading execution)
- DeFiLlama API is free and public
- Data updates every 2 minutes automatically
- Some protocols may not have complete data
- Token prices and market caps are available for some protocols only
- Yield data includes both base APY and reward APY

## 🐛 Known Limitations

1. **API Rate Limits**: DeFiLlama has rate limits (mitigated by caching)
2. **Data Completeness**: Not all protocols have full historical data
3. **Yield Accuracy**: APY values are estimates, actual yields may vary
4. **Chain Coverage**: Some smaller chains may have limited data
5. **Real-time Updates**: 2-minute refresh interval (not real-time)

## 🔗 Related Features

- **On-Chain Data**: Combine with on-chain analytics for full picture
- **Trading Terminal**: Execute trades based on DeFi insights
- **Portfolio Tracking**: Track DeFi positions alongside CEX positions
- **Smart Order Routing**: Use DeFi data to inform trading decisions

