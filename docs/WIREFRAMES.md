# GM Terminal Wireframes

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  GM Terminal                  [Dark] [Light]           │  ← Header (40px)
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┬──────────────┬──────────────┐       │
│  │ Chart (G)    │ News (N)     │ Portfolio    │       │
│  │ AAPL: $150   │ Headlines    │ P&L: +2%     │       │  ← Resizable Panes
│  │ [Chart]      │ [News List]  │ [Pie Chart]  │       │
│  ├──────────────┼──────────────┼──────────────┤       │
│  │ Quote        │ Watchlist    │ Exposure     │       │
│  │ TSLA: $210   │ BTC: $60k    │ VTI: 28% Tech│       │
│  │ +2.5%        │ ETH: $2.5k   │ [Table]      │       │
│  └──────────────┴──────────────┴──────────────┘       │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  > AAPL EQ G | CRYPTO BTC VOL  [Autocomplete]          │  ← CLI Bar (200px)
│  [Output: Spawns pane above; Scrollable if long]       │
└─────────────────────────────────────────────────────────┘
```

## CLI Command Examples

### Basic Commands
```
> AAPL EQ G          → Opens AAPL chart pane
> TSLA EQ N          → Opens TSLA news pane
> MSFT EQ FOCUS      → Opens MSFT quote pane
> MOST ACTIVE        → Opens most active stocks pane
```

### Portfolio Commands
```
> PORT VIEW          → Opens portfolio pane with P&L
> PORT ADD AAPL 10   → Adds 10 shares of AAPL
> PORT EXP VTI       → Shows VTI ETF exposure breakdown
```

### Crypto Commands
```
> CRYPTO BTC VOL     → Opens BTC volume/OHLC pane
> CRYPTO BTC WHALE   → Opens BTC whale alerts
> CRYPTO PAIR CHART  → Opens BTC/ETH ratio chart
```

### Prediction Market Commands
```
> PRED EVENT ELEC TRUMP YES  → Shows election odds
> PRED VOL                   → Top prediction markets
```

### RSS Commands
```
> RSS ADD https://rss.com/feed "My Feed"  → Subscribe
> RSS VIEW "My Feed"                     → View feed pane
```

## Pane Types

### Chart Pane
- TradingView-style chart
- Indicators: MA, RSI
- Timeframe selector
- Fullscreen option

### News Pane
- Headline list
- Source filter
- Date filter
- Click to open article

### Quote Pane
- Large price display
- Change percentage (color-coded)
- Volume
- Real-time updates

### Portfolio Pane
- Total value
- P&L summary
- Pie chart allocation
- Position table

### Exposure Pane
- Sector breakdown table
- Top holdings
- Weight percentages
- Refresh button

## Keyboard Shortcuts

- `Ctrl+K` - Command palette
- `F10` - Focus ticker input
- `Ctrl+/` - Toggle filters
- `F11` - Fullscreen
- `Esc` - Focus CLI
- `Ctrl+1-9` - Switch layouts
- `Ctrl+Shift+P` - New pane
- `Arrow keys` - Navigate panes
- `Space` - Maximize pane
- `Delete` - Close pane

## Color Scheme

- Background: `#0d1117` (dark terminal)
- Foreground: `#c9d1d9` (light text)
- Border: `#30363d` (subtle borders)
- Accent: `#58a6ff` (blue highlights)
- Success: `#3fb950` (green for gains)
- Error: `#f85149` (red for losses)

