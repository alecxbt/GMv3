# API Keys Setup Guide

This guide explains how to set up API keys for GM Terminal.

## Quick Start

1. **Create your `.env` file:**
   ```bash
   cd GM/backend
   cp .env.example .env
   ```

2. **Edit the `.env` file** and add your API keys (see below for where to get them)

3. **Restart the backend server** for changes to take effect

## Required vs Optional API Keys

### ✅ Recommended (Better Rate Limits & Data Quality)

- **Alpha Vantage** - For stock quotes and market data
- **NewsAPI** or **NewsData.io** - For news articles

### ⚠️ Optional (System Works Without Them)

- **Polygon.io** - Alternative/additional market data source
- The system will fall back to free APIs (Yahoo Finance, CoinGecko) if keys are not provided

### 🆓 Free (No API Key Needed)

- **SEC EDGAR** - Corporate filings (completely free, no key required)
- **CoinGecko** - Crypto data (free tier, no key required - used as fallback)

### 💰 Crypto Data (Recommended)

- **CoinMarketCap** - Premium crypto data with better rate limits and data quality

### 🏢 Enterprise (Nasdaq Private Markets)

- **Nasdaq Data Link** - Access to Tape D® API for private market data
- **Nasdaq Private Markets API** - Direct access to private company valuations
- **Note:** These typically require enterprise access or special agreements with Nasdaq

## Where to Get API Keys

### 1. Alpha Vantage (Stock Market Data)
- **Website:** https://www.alphavantage.co/support/#api-key
- **Free Tier:** 5 API calls per minute, 500 calls per day
- **Sign up:** Free account, instant API key
- **Use case:** Real-time stock quotes, historical data

### 2. Polygon.io (Market Data)
- **Website:** https://polygon.io/
- **Free Tier:** 5 API calls per minute (⚠️ Basic plan does NOT include options data)
- **Paid Plans:** Options data available on paid plans (Starter: $29/mo, Developer: $99/mo)
- **Sign up:** Free account
- **Use case:** Alternative market data source (options require paid plan)

### 2a. Tradier (Options Data - FREE SANDBOX) ⭐ RECOMMENDED
- **Website:** https://developer.tradier.com/
- **Free Tier:** Free sandbox environment for testing
- **Paid Plans:** $0.35 per 1,000 API calls (very affordable)
- **Sign up:** Free account at https://developer.tradier.com/user/sign_up
- **Use case:** Options chain data, Greeks, real-time quotes
- **Note:** Great for production use with affordable pricing

### 2b. Finnhub (Options Data - FREE TIER)
- **Website:** https://finnhub.io/
- **Free Tier:** 60 API calls/minute (includes limited options data)
- **Sign up:** Free account at https://finnhub.io/register
- **Use case:** Options chain data, basic options info
- **Note:** Good free option with basic options data

### 2c. CoinMarketCap (Crypto Data - RECOMMENDED) ⭐
- **Website:** https://coinmarketcap.com/api/
- **Free Tier:** Basic plan available (10,000 credits/month)
- **Paid Plans:** Higher rate limits and more features
- **Sign up:** Free account at https://coinmarketcap.com/api/
- **Use case:** Crypto quotes, charts, market data, historical data
- **Note:** Better data quality and rate limits than CoinGecko

### 2d. Financial Modeling Prep (Fundamental Analysis - RECOMMENDED) ⭐
- **Website:** https://site.financialmodelingprep.com/
- **Free Tier:** 250 requests/day
- **Paid Plans:** Higher rate limits and more features
- **Sign up:** Free account at https://site.financialmodelingprep.com/developer/docs/
- **Use case:** Fundamental analysis, financial ratios, key metrics, analyst estimates
- **Note:** Comprehensive fundamental data with ratios, profitability metrics, debt ratios, and analyst estimates

### 3. NewsAPI (News Articles)
- **Website:** https://newsapi.org/register
- **Free Tier:** 100 requests per day
- **Sign up:** Free account, instant API key
- **Use case:** Financial news for stocks and crypto

### 4. NewsData.io (Alternative News Source)
- **Website:** https://newsdata.io/
- **Free Tier:** 200 requests per day
- **Sign up:** Free account
- **Use case:** Alternative news source

### 5. Nasdaq Data Link (Private Market Data)
- **Website:** https://data.nasdaq.com/
- **Access:** Requires account and API key
- **Use case:** Private company valuations, Tape D® data for pre-IPO companies
- **Note:** Enterprise/paid access typically required for private market data

### 6. Nasdaq Private Markets API (Direct Access)
- **Website:** Contact Nasdaq Private Markets
- **Access:** Enterprise access required
- **Use case:** Direct access to private market transactions and valuations
- **Note:** Requires special agreement with Nasdaq

## Setting Up Your .env File

1. Navigate to the backend directory:
   ```bash
   cd GM/backend
   ```

2. Copy the example file:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` in your editor and replace the placeholder values:
   ```env
   ALPHA_VANTAGE_API_KEY=YOUR_ACTUAL_KEY_HERE
   POLYGON_API_KEY=YOUR_POLYGON_KEY_HERE
   NEWS_API_KEY=YOUR_ACTUAL_KEY_HERE
   NASDAQ_DATA_LINK_API_KEY=YOUR_NASDAQ_KEY_HERE  # Optional, for private markets
   
   # Options Data APIs (recommended: Tradier for free sandbox)
   TRADIER_API_KEY=YOUR_TRADIER_KEY_HERE  # Free sandbox available, affordable paid
   TRADIER_SANDBOX=true  # Set to 'true' for sandbox, 'false' or omit for production
   FINNHUB_API_KEY=YOUR_FINNHUB_KEY_HERE  # Free tier available
   
   # Crypto Data APIs (recommended: CoinMarketCap)
   COINMARKETCAP_API_KEY=YOUR_CMC_KEY_HERE  # Better data quality than CoinGecko
   
   # Fundamental Analysis APIs (recommended: Financial Modeling Prep)
   FINANCIAL_MODELING_PREP_API_KEY=YOUR_FMP_KEY_HERE  # Free tier: 250 requests/day
   ```

4. Save the file

5. Restart your backend server:
   ```bash
   npm run dev
   ```

## Verifying Your API Keys

After adding your keys, check the backend logs when you start the server. You should see:
- Successful API calls in the logs
- No "API key missing" warnings

You can also test by:
1. Opening the terminal UI
2. Typing: `AAPL US Q` (to get a quote)
3. Checking the browser console for API responses

## Security Notes

- ⚠️ **Never commit your `.env` file to git** (it's already in `.gitignore`)
- ✅ The `.env.example` file is safe to commit (it has placeholder values)
- ✅ Share API keys only with trusted team members
- ✅ Rotate keys if they're accidentally exposed

## Troubleshooting

### "API key invalid" errors
- Double-check you copied the entire key (no extra spaces)
- Verify the key is active in your API provider's dashboard
- Check if you've exceeded rate limits

### "No data available" errors
- The system will fall back to free APIs (Yahoo Finance, CoinGecko)
- Check backend logs for specific error messages
- Verify your internet connection

### Rate limit errors
- Free tiers have strict limits (e.g., 5 calls/min for Alpha Vantage)
- The system caches responses to minimize API calls
- Consider upgrading to paid tiers for production use

## Current API Usage

The system uses these APIs in order of preference:

**Stock Quotes:**
1. Alpha Vantage (if key provided)
2. Yahoo Finance (free, no key)

**Crypto Data:**
1. Polygon.io (MASSIVE) - Primary source for crypto charting ⭐ RECOMMENDED
2. CoinMarketCap (if key provided - fallback)
3. CoinGecko (free, no key required - fallback)

**News:**
1. NewsAPI (if key provided)
2. NewsData.io (if key provided)
3. Mock data (fallback)

**Filings:**
1. SEC EDGAR (free, no key required)

**Options Chain Data:**
1. Polygon.io (MASSIVE) - Primary source for options data ⭐
2. Uses v3/reference/options/contracts endpoint (available on free tier)
3. Note: Options contract structure is available; real-time quotes may require paid plan

**Private Markets:**
1. Nasdaq Data Link / Tape D® API (if key provided)
2. Nasdaq Private Markets Direct API (if key provided)
3. Returns null if not available (private companies not on public markets)

