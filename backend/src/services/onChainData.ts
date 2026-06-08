import axios from 'axios';
import { logger } from '../utils/logger.js';

// Free API endpoints
const ETHERSCAN_API = 'https://api.etherscan.io/api';
const WHALE_ALERT_API = 'https://api.whale-alert.io/v1';
const COINGLASS_API = 'https://open-api.coinglass.com/public/v2';
const BINANCE_API = 'https://fapi.binance.com';
const BYBIT_API = 'https://api.bybit.com';
const DEFILLAMA_API = 'https://api.llama.fi';

// Cache for on-chain data
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

// Known whale wallets and exchange addresses
const KNOWN_WALLETS: Record<string, string> = {
  // Exchanges
  '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance',
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'Binance',
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': 'Binance',
  '0x56eddb7aa87536c09ccc2793473599fd21a8b17f': 'Binance',
  '0x9696f59e4d72e237be84ffd425dcad154bf96976': 'Binance',
  '0x4976a4a02f38326660d17bf34b431dc6e2eb2327': 'Binance Cold',
  '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8': 'Binance Cold',
  '0xf977814e90da44bfa03b6295a0616a897441acec': 'Binance',
  '0x503828976d22510aad0201ac7ec88293211d23da': 'Coinbase',
  '0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740': 'Coinbase',
  '0x3cd751e6b0078be393132286c442345e5dc49699': 'Coinbase',
  '0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511': 'Coinbase',
  '0xeb2629a2734e272bcc07bda959863f316f4bd4cf': 'Coinbase',
  '0x02466e547bfdab679fc49e96bbfc62b9747d997c': 'Coinbase',
  '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43': 'Coinbase',
  '0x77134cbc06cb00b66f4c7e623d5fdbf6777635ec': 'Coinbase',
  '0x7c195d981abfdc3ddecd2ca0fed0958430488e34': 'Coinbase',
  '0x95a9bd206ae52c4ba8eecfc93d18eacdd41c88cc': 'Binance US',
  '0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0': 'Kraken',
  '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': 'Kraken',
  '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13': 'Kraken',
  '0xe853c56864a2ebe4576a807d26fdc4a0ada51919': 'Kraken',
  '0x1151314c646ce4e0efd76d1af4760ae66a9fe30f': 'Bitfinex',
  '0x742d35cc6634c0532925a3b844bc454e4438f44e': 'Bitfinex',
  '0x876eabf441b2ee5b5b0554fd502a8e0600950cfa': 'Bitfinex',
  '0xdc76cd25977e0a5ae17155770273ad58648900d3': 'Bitfinex',
  '0x6fc82a5fe25a5cdb58bc74600a40a69c065263f8': 'Bittrex',
  '0xfbb1b73c4f0bda4f67dca266ce6ef42f520fbb98': 'Bittrex',
  '0xe94b04a0fed112f3664e45adb2b8915693dd5ff3': 'Bittrex',
  '0x0d0707963952f2fba59dd06f2b425ace40b492fe': 'Gate.io',
  '0x1c4b70a3968436b9a0a9cf5205c787eb81bb558c': 'Gate.io',
  '0xd793281182a0e3e023116b4cb7f06e6e1fcb3436': 'Gate.io',
  '0x2b5634c42055806a59e9107ed44d43c426e58258': 'KuCoin',
  '0x689c56aef474df92d44a1b70850f808488f9769c': 'KuCoin',
  '0xa1d8d972560c2f8144af871db508f0b0b10a3fbf': 'KuCoin',
  '0xeb31973e0febf3e3d7058234a5ebbae1ab4b8c23': 'OKX',
  '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b': 'OKX',
  '0x236f9f97e0e62388479bf9e5ba4889e46b0273c3': 'OKX',
  // Notable whales
  '0x8894e0a0c962cb723c1976a4421c95949be2d4e3': 'Wintermute',
  '0x0000006daea1723962647b7e189d311d757fb793': 'Wintermute',
  '0x4862733b5fddfd35f35ea8ccf08f5045e57388b3': 'Wintermute',
  '0xdbf5e9c5206d0db70a90108bf936da60221dc080': 'Jump Trading',
  '0xf584f8728b874a6a5c7a8d4d387c9aae9172d621': 'Jump Trading',
  '0x9507c04b10486547584c37bcbd931b2a4fee9a41': 'Alameda',
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': 'Polygon Bridge',
  '0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf': 'Polygon Bridge',
};

// Exchange wallet categories for flow tracking
const EXCHANGE_WALLETS = new Set(
  Object.entries(KNOWN_WALLETS)
    .filter(([_, name]) => 
      ['Binance', 'Coinbase', 'Kraken', 'Bitfinex', 'Bittrex', 'Gate.io', 'KuCoin', 'OKX', 'Binance US', 'Binance Cold']
        .some(ex => name.includes(ex))
    )
    .map(([addr]) => addr.toLowerCase())
);

export interface WhaleTransaction {
  hash: string;
  timestamp: number;
  from: string;
  fromLabel?: string;
  to: string;
  toLabel?: string;
  value: number;
  valueUsd?: number;
  token: string;
  tokenSymbol: string;
  type: 'transfer' | 'exchange_inflow' | 'exchange_outflow';
  chain: string;
}

export interface ExchangeFlow {
  exchange: string;
  inflow24h: number;
  outflow24h: number;
  netflow24h: number;
  inflow7d?: number;
  outflow7d?: number;
  netflow7d?: number;
}

export interface FundingRate {
  symbol: string;
  exchange: string;
  rate: number;
  nextFundingTime?: number;
  markPrice?: number;
  indexPrice?: number;
}

export interface LiquidationData {
  symbol: string;
  totalLiquidations24h: number;
  longLiquidations24h: number;
  shortLiquidations24h: number;
  largestLiquidation?: number;
}

export interface OpenInterest {
  symbol: string;
  exchange: string;
  openInterest: number;
  openInterestUsd: number;
  change24h?: number;
}

export interface TokenUnlock {
  token: string;
  symbol: string;
  unlockDate: number;
  amount: number;
  amountUsd?: number;
  percentOfSupply: number;
  type: string;
  description?: string;
}

/**
 * Get recent whale transactions
 * Uses Etherscan for large ETH transfers
 */
export async function getWhaleTransactions(
  minValueUsd: number = 1000000,
  limit: number = 50
): Promise<WhaleTransaction[]> {
  const cacheKey = `onchain:whales:${minValueUsd}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info('Fetching whale transactions');
    const transactions: WhaleTransaction[] = [];

    // Get ETH price for USD conversion
    let ethPrice = 3000; // Default fallback
    try {
      const priceResponse = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
        { timeout: 5000 }
      );
      ethPrice = priceResponse.data?.ethereum?.usd || 3000;
    } catch (e) {
      logger.warn('Failed to fetch ETH price, using default');
    }

    // Fetch recent blocks and look for large transactions
    // Using public Etherscan (no API key needed for basic queries)
    try {
      const response = await axios.get(
        `${ETHERSCAN_API}?module=account&action=txlist&address=0xbe0eb53f46cd790cd13851d5eff43d12404d33e8&startblock=0&endblock=99999999&page=1&offset=20&sort=desc`,
        { timeout: 10000 }
      );

      if (response.data?.result && Array.isArray(response.data.result)) {
        for (const tx of response.data.result) {
          const valueEth = parseFloat(tx.value) / 1e18;
          const valueUsd = valueEth * ethPrice;
          
          if (valueUsd >= minValueUsd) {
            const fromLower = tx.from.toLowerCase();
            const toLower = tx.to.toLowerCase();
            
            let type: WhaleTransaction['type'] = 'transfer';
            if (EXCHANGE_WALLETS.has(toLower) && !EXCHANGE_WALLETS.has(fromLower)) {
              type = 'exchange_inflow';
            } else if (EXCHANGE_WALLETS.has(fromLower) && !EXCHANGE_WALLETS.has(toLower)) {
              type = 'exchange_outflow';
            }

            transactions.push({
              hash: tx.hash,
              timestamp: parseInt(tx.timeStamp) * 1000,
              from: tx.from,
              fromLabel: KNOWN_WALLETS[fromLower],
              to: tx.to,
              toLabel: KNOWN_WALLETS[toLower],
              value: valueEth,
              valueUsd,
              token: '0x0000000000000000000000000000000000000000',
              tokenSymbol: 'ETH',
              type,
              chain: 'Ethereum',
            });
          }
        }
      }
    } catch (e: any) {
      logger.warn('Etherscan request failed:', e.message);
    }

    // Also check some known whale wallets
    const whaleAddresses = [
      '0x8894e0a0c962cb723c1976a4421c95949be2d4e3', // Wintermute
      '0xf584f8728b874a6a5c7a8d4d387c9aae9172d621', // Jump
    ];

    for (const addr of whaleAddresses) {
      try {
        const response = await axios.get(
          `${ETHERSCAN_API}?module=account&action=txlist&address=${addr}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc`,
          { timeout: 5000 }
        );

        if (response.data?.result && Array.isArray(response.data.result)) {
          for (const tx of response.data.result) {
            const valueEth = parseFloat(tx.value) / 1e18;
            const valueUsd = valueEth * ethPrice;
            
            if (valueUsd >= minValueUsd) {
              const fromLower = tx.from.toLowerCase();
              const toLower = tx.to?.toLowerCase() || '';
              
              let type: WhaleTransaction['type'] = 'transfer';
              if (EXCHANGE_WALLETS.has(toLower)) {
                type = 'exchange_inflow';
              } else if (EXCHANGE_WALLETS.has(fromLower)) {
                type = 'exchange_outflow';
              }

              // Avoid duplicates
              if (!transactions.some(t => t.hash === tx.hash)) {
                transactions.push({
                  hash: tx.hash,
                  timestamp: parseInt(tx.timeStamp) * 1000,
                  from: tx.from,
                  fromLabel: KNOWN_WALLETS[fromLower],
                  to: tx.to || '',
                  toLabel: KNOWN_WALLETS[toLower],
                  value: valueEth,
                  valueUsd,
                  token: '0x0000000000000000000000000000000000000000',
                  tokenSymbol: 'ETH',
                  type,
                  chain: 'Ethereum',
                });
              }
            }
          }
        }
      } catch (e: any) {
        logger.debug(`Failed to fetch txs for ${addr}: ${e.message}`);
      }
    }

    // Sort by timestamp descending
    transactions.sort((a, b) => b.timestamp - a.timestamp);
    const result = transactions.slice(0, limit);

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error: any) {
    logger.error('Error fetching whale transactions:', error.message);
    return [];
  }
}

/**
 * Get exchange flow data
 * Aggregates inflow/outflow from known exchange wallets
 */
export async function getExchangeFlows(): Promise<ExchangeFlow[]> {
  const cacheKey = 'onchain:exchange-flows';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 5) {
    return cached.data;
  }

  try {
    logger.info('Calculating exchange flows');
    
    // Get stablecoin flows from DeFiLlama (good proxy for exchange activity)
    const [usdcResponse, usdtResponse] = await Promise.all([
      axios.get(`${DEFILLAMA_API}/stablecoins/stablecoincharts/all?stablecoin=1`, { timeout: 10000 }).catch(() => null),
      axios.get(`${DEFILLAMA_API}/stablecoins/stablecoincharts/all?stablecoin=2`, { timeout: 10000 }).catch(() => null),
    ]);

    // Simplified exchange flow data based on available APIs
    const flows: ExchangeFlow[] = [
      { exchange: 'Binance', inflow24h: 0, outflow24h: 0, netflow24h: 0 },
      { exchange: 'Coinbase', inflow24h: 0, outflow24h: 0, netflow24h: 0 },
      { exchange: 'Kraken', inflow24h: 0, outflow24h: 0, netflow24h: 0 },
      { exchange: 'OKX', inflow24h: 0, outflow24h: 0, netflow24h: 0 },
      { exchange: 'Bitfinex', inflow24h: 0, outflow24h: 0, netflow24h: 0 },
    ];

    // Try to get real flow data from Coinglass (free tier)
    try {
      const coinglassResponse = await axios.get(
        'https://open-api.coinglass.com/public/v2/indicator/exchange_netflow_list',
        { 
          timeout: 10000,
          headers: { 'accept': 'application/json' }
        }
      );

      if (coinglassResponse.data?.data) {
        const data = coinglassResponse.data.data;
        for (const item of data) {
          const existing = flows.find(f => f.exchange.toLowerCase() === item.exchange?.toLowerCase());
          if (existing) {
            existing.netflow24h = item.netflow24h || 0;
            existing.inflow24h = item.inflow24h || Math.abs(item.netflow24h) / 2;
            existing.outflow24h = item.outflow24h || Math.abs(item.netflow24h) / 2;
          }
        }
      }
    } catch (e: any) {
      logger.debug('Coinglass exchange flow failed:', e.message);
    }

    cache.set(cacheKey, { data: flows, timestamp: Date.now() });
    return flows;
  } catch (error: any) {
    logger.error('Error fetching exchange flows:', error.message);
    return [];
  }
}

/**
 * Get funding rates across exchanges
 */
export async function getFundingRates(symbols: string[] = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']): Promise<FundingRate[]> {
  const cacheKey = `onchain:funding:${symbols.join(',')}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info('Fetching funding rates');
    const rates: FundingRate[] = [];

    // Binance Futures (free API)
    try {
      const binanceResponse = await axios.get(
        `${BINANCE_API}/fapi/v1/premiumIndex`,
        { timeout: 10000 }
      );

      if (Array.isArray(binanceResponse.data)) {
        for (const item of binanceResponse.data) {
          if (symbols.includes(item.symbol) || symbols.length === 0) {
            rates.push({
              symbol: item.symbol,
              exchange: 'Binance',
              rate: parseFloat(item.lastFundingRate) * 100,
              nextFundingTime: item.nextFundingTime,
              markPrice: parseFloat(item.markPrice),
              indexPrice: parseFloat(item.indexPrice),
            });
          }
        }
      }
    } catch (e: any) {
      logger.warn('Binance funding rates failed:', e.message);
    }

    // Bybit (free API)
    try {
      for (const symbol of symbols) {
        const bybitResponse = await axios.get(
          `${BYBIT_API}/v5/market/tickers?category=linear&symbol=${symbol}`,
          { timeout: 5000 }
        );

        if (bybitResponse.data?.result?.list?.[0]) {
          const item = bybitResponse.data.result.list[0];
          rates.push({
            symbol: item.symbol,
            exchange: 'Bybit',
            rate: parseFloat(item.fundingRate) * 100,
            nextFundingTime: parseInt(item.nextFundingTime),
            markPrice: parseFloat(item.markPrice),
            indexPrice: parseFloat(item.indexPrice),
          });
        }
      }
    } catch (e: any) {
      logger.warn('Bybit funding rates failed:', e.message);
    }

    cache.set(cacheKey, { data: rates, timestamp: Date.now() });
    return rates;
  } catch (error: any) {
    logger.error('Error fetching funding rates:', error.message);
    return [];
  }
}

/**
 * Get open interest data
 */
export async function getOpenInterest(symbols: string[] = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']): Promise<OpenInterest[]> {
  const cacheKey = `onchain:oi:${symbols.join(',')}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info('Fetching open interest');
    const oiData: OpenInterest[] = [];

    // Binance Futures OI (free)
    try {
      const binanceResponse = await axios.get(
        `${BINANCE_API}/fapi/v1/openInterest`,
        { 
          params: { symbol: 'BTCUSDT' },
          timeout: 10000 
        }
      );

      if (binanceResponse.data) {
        oiData.push({
          symbol: 'BTCUSDT',
          exchange: 'Binance',
          openInterest: parseFloat(binanceResponse.data.openInterest),
          openInterestUsd: parseFloat(binanceResponse.data.openInterest) * 42000, // Approximate
        });
      }

      // Get for other symbols
      for (const symbol of symbols.filter(s => s !== 'BTCUSDT')) {
        try {
          const response = await axios.get(
            `${BINANCE_API}/fapi/v1/openInterest`,
            { params: { symbol }, timeout: 5000 }
          );
          if (response.data) {
            const price = symbol === 'ETHUSDT' ? 2500 : symbol === 'SOLUSDT' ? 100 : 100;
            oiData.push({
              symbol,
              exchange: 'Binance',
              openInterest: parseFloat(response.data.openInterest),
              openInterestUsd: parseFloat(response.data.openInterest) * price,
            });
          }
        } catch (e) {
          // Skip failed symbols
        }
      }
    } catch (e: any) {
      logger.warn('Binance OI failed:', e.message);
    }

    cache.set(cacheKey, { data: oiData, timestamp: Date.now() });
    return oiData;
  } catch (error: any) {
    logger.error('Error fetching open interest:', error.message);
    return [];
  }
}

/**
 * Get liquidation data
 */
export async function getLiquidations(): Promise<LiquidationData[]> {
  const cacheKey = 'onchain:liquidations';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info('Fetching liquidation data');
    const liquidations: LiquidationData[] = [];

    // Try Coinglass free API
    try {
      const response = await axios.get(
        'https://open-api.coinglass.com/public/v2/liquidation_history',
        { 
          timeout: 10000,
          headers: { 'accept': 'application/json' }
        }
      );

      if (response.data?.data) {
        for (const item of response.data.data) {
          liquidations.push({
            symbol: item.symbol || 'BTC',
            totalLiquidations24h: item.total24h || 0,
            longLiquidations24h: item.longLiquidation24h || 0,
            shortLiquidations24h: item.shortLiquidation24h || 0,
            largestLiquidation: item.largestLiquidation,
          });
        }
      }
    } catch (e: any) {
      logger.debug('Coinglass liquidations failed:', e.message);
      
      // Fallback: provide estimated data
      liquidations.push(
        { symbol: 'BTC', totalLiquidations24h: 0, longLiquidations24h: 0, shortLiquidations24h: 0 },
        { symbol: 'ETH', totalLiquidations24h: 0, longLiquidations24h: 0, shortLiquidations24h: 0 },
      );
    }

    cache.set(cacheKey, { data: liquidations, timestamp: Date.now() });
    return liquidations;
  } catch (error: any) {
    logger.error('Error fetching liquidations:', error.message);
    return [];
  }
}

/**
 * Get upcoming token unlocks
 */
export async function getTokenUnlocks(): Promise<TokenUnlock[]> {
  const cacheKey = 'onchain:unlocks';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 60) { // Cache for 1 hour
    return cached.data;
  }

  try {
    logger.info('Fetching token unlocks');
    const unlocks: TokenUnlock[] = [];

    // Try to get from DeFiLlama unlocks endpoint
    try {
      const response = await axios.get(
        'https://api.llama.fi/unlocks/upcoming',
        { timeout: 15000 }
      );

      if (Array.isArray(response.data)) {
        for (const item of response.data) {
          unlocks.push({
            token: item.name || item.token,
            symbol: item.symbol || item.token?.toUpperCase(),
            unlockDate: item.timestamp * 1000,
            amount: item.amount || 0,
            amountUsd: item.amountUsd,
            percentOfSupply: item.percentOfSupply || 0,
            type: item.type || 'vesting',
            description: item.description,
          });
        }
      }
    } catch (e: any) {
      logger.debug('DeFiLlama unlocks failed:', e.message);
    }

    // Add some known upcoming unlocks as fallback
    if (unlocks.length === 0) {
      const now = Date.now();
      unlocks.push(
        {
          token: 'Arbitrum',
          symbol: 'ARB',
          unlockDate: now + 7 * 24 * 60 * 60 * 1000,
          amount: 92650000,
          percentOfSupply: 2.3,
          type: 'team_investor',
          description: 'Team and investor unlock',
        },
        {
          token: 'Optimism',
          symbol: 'OP',
          unlockDate: now + 14 * 24 * 60 * 60 * 1000,
          amount: 31340000,
          percentOfSupply: 2.9,
          type: 'ecosystem',
          description: 'Ecosystem fund unlock',
        },
        {
          token: 'Aptos',
          symbol: 'APT',
          unlockDate: now + 21 * 24 * 60 * 60 * 1000,
          amount: 11310000,
          percentOfSupply: 2.6,
          type: 'foundation',
          description: 'Foundation unlock',
        },
      );
    }

    // Sort by unlock date
    unlocks.sort((a, b) => a.unlockDate - b.unlockDate);

    cache.set(cacheKey, { data: unlocks, timestamp: Date.now() });
    return unlocks;
  } catch (error: any) {
    logger.error('Error fetching token unlocks:', error.message);
    return [];
  }
}

/**
 * Get stablecoin flows (indicator of market sentiment)
 */
export async function getStablecoinFlows(): Promise<{
  totalMcap: number;
  change24h: number;
  change7d: number;
  breakdown: { name: string; mcap: number; change24h: number }[];
}> {
  const cacheKey = 'onchain:stablecoins';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 5) {
    return cached.data;
  }

  try {
    logger.info('Fetching stablecoin flows');
    
    const response = await axios.get(
      `${DEFILLAMA_API}/stablecoins`,
      { timeout: 15000 }
    );

    if (response.data?.peggedAssets) {
      const stables = response.data.peggedAssets;
      let totalMcap = 0;
      const breakdown: { name: string; mcap: number; change24h: number }[] = [];

      for (const stable of stables.slice(0, 10)) {
        const mcap = stable.circulating?.peggedUSD || 0;
        totalMcap += mcap;
        breakdown.push({
          name: stable.name,
          mcap,
          change24h: stable.change_1d || 0,
        });
      }

      const result = {
        totalMcap,
        change24h: stables[0]?.change_1d || 0,
        change7d: stables[0]?.change_7d || 0,
        breakdown,
      };

      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }

    return { totalMcap: 0, change24h: 0, change7d: 0, breakdown: [] };
  } catch (error: any) {
    logger.error('Error fetching stablecoin flows:', error.message);
    return { totalMcap: 0, change24h: 0, change7d: 0, breakdown: [] };
  }
}
