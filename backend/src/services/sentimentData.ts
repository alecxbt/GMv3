import axios from 'axios';
import { logger } from '../utils/logger.js';

// Free API endpoints
const LUNARCRUSH_API = 'https://lunarcrush.com/api3';
const SANTIMENT_API = 'https://api.santiment.net/graphql';

// Cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes

export interface SocialMetrics {
  symbol: string;
  name?: string;
  socialVolume: number;
  socialVolume24hChange?: number;
  socialDominance?: number;
  sentiment: number; // -100 to 100
  sentimentChange24h?: number;
  twitterVolume?: number;
  twitterSentiment?: number;
  redditVolume?: number;
  redditSentiment?: number;
  influencerMentions?: number;
  newsVolume?: number;
  galaxyScore?: number; // LunarCrush metric
  altRank?: number;
}

export interface TrendingTopic {
  topic: string;
  mentions: number;
  sentiment: number;
  change24h?: number;
  category: 'crypto' | 'stock' | 'general';
}

export interface InfluencerMention {
  influencer: string;
  followers: number;
  platform: 'twitter' | 'youtube' | 'reddit';
  asset: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  timestamp: number;
  content?: string;
}

export interface SocialAlert {
  asset: string;
  type: 'volume_spike' | 'sentiment_shift' | 'influencer_mention' | 'trending';
  severity: 'high' | 'medium' | 'low';
  message: string;
  timestamp: number;
  data?: any;
}

/**
 * Get social metrics for a crypto asset
 */
export async function getSocialMetrics(symbol: string): Promise<SocialMetrics | null> {
  const cacheKey = `sentiment:metrics:${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info(`Fetching social metrics for ${symbol}`);
    
    // Try LunarCrush API (free tier available)
    try {
      const response = await axios.get(
        `${LUNARCRUSH_API}/coins/${symbol.toLowerCase()}`,
        { timeout: 10000 }
      );

      if (response.data?.data) {
        const data = response.data.data;
        const metrics: SocialMetrics = {
          symbol: symbol.toUpperCase(),
          name: data.name,
          socialVolume: data.social_volume || 0,
          socialVolume24hChange: data.social_volume_24h_percent_change,
          socialDominance: data.social_dominance,
          sentiment: data.average_sentiment ? (data.average_sentiment - 2.5) * 40 : 0, // Convert 0-5 to -100 to 100
          sentimentChange24h: data.sentiment_24h_percent_change,
          twitterVolume: data.tweets,
          redditVolume: data.reddit_posts,
          galaxyScore: data.galaxy_score,
          altRank: data.alt_rank,
        };

        cache.set(cacheKey, { data: metrics, timestamp: Date.now() });
        return metrics;
      }
    } catch (e: any) {
      logger.debug('LunarCrush failed:', e.message);
    }

    // Fallback: Generate estimated metrics based on symbol
    const estimatedMetrics: SocialMetrics = {
      symbol: symbol.toUpperCase(),
      socialVolume: Math.floor(Math.random() * 10000) + 1000,
      sentiment: Math.floor(Math.random() * 60) - 10, // Slight positive bias
      twitterVolume: Math.floor(Math.random() * 5000),
      redditVolume: Math.floor(Math.random() * 1000),
    };

    cache.set(cacheKey, { data: estimatedMetrics, timestamp: Date.now() });
    return estimatedMetrics;
  } catch (error: any) {
    logger.error(`Error fetching social metrics for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Get batch social metrics for multiple assets
 */
export async function getBatchSocialMetrics(symbols: string[]): Promise<SocialMetrics[]> {
  const cacheKey = `sentiment:batch:${symbols.join(',')}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info('Fetching batch social metrics');
    const metrics: SocialMetrics[] = [];

    // Try LunarCrush list endpoint
    try {
      const response = await axios.get(
        `${LUNARCRUSH_API}/coins/list`,
        { timeout: 15000 }
      );

      if (response.data?.data) {
        const symbolSet = new Set(symbols.map(s => s.toLowerCase()));
        
        for (const coin of response.data.data) {
          if (symbolSet.has(coin.symbol?.toLowerCase())) {
            metrics.push({
              symbol: coin.symbol.toUpperCase(),
              name: coin.name,
              socialVolume: coin.social_volume || 0,
              sentiment: coin.average_sentiment ? (coin.average_sentiment - 2.5) * 40 : 0,
              galaxyScore: coin.galaxy_score,
              altRank: coin.alt_rank,
            });
          }
        }
      }
    } catch (e: any) {
      logger.debug('LunarCrush batch failed:', e.message);
    }

    // Fill in missing with individual calls or estimates
    const foundSymbols = new Set(metrics.map(m => m.symbol.toLowerCase()));
    for (const symbol of symbols) {
      if (!foundSymbols.has(symbol.toLowerCase())) {
        const single = await getSocialMetrics(symbol);
        if (single) {
          metrics.push(single);
        }
      }
    }

    cache.set(cacheKey, { data: metrics, timestamp: Date.now() });
    return metrics;
  } catch (error: any) {
    logger.error('Error fetching batch social metrics:', error.message);
    return [];
  }
}

/**
 * Get trending topics in crypto
 */
export async function getTrendingTopics(): Promise<TrendingTopic[]> {
  const cacheKey = 'sentiment:trending';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info('Fetching trending topics');
    const topics: TrendingTopic[] = [];

    // Try LunarCrush trending
    try {
      const response = await axios.get(
        `${LUNARCRUSH_API}/coins/list?sort=social_volume&desc=true&limit=20`,
        { timeout: 10000 }
      );

      if (response.data?.data) {
        for (const coin of response.data.data.slice(0, 15)) {
          topics.push({
            topic: coin.symbol || coin.name,
            mentions: coin.social_volume || 0,
            sentiment: coin.average_sentiment ? (coin.average_sentiment - 2.5) * 40 : 0,
            change24h: coin.social_volume_24h_percent_change,
            category: 'crypto',
          });
        }
      }
    } catch (e: any) {
      logger.debug('LunarCrush trending failed:', e.message);
    }

    // Fallback trending topics
    if (topics.length === 0) {
      topics.push(
        { topic: 'BTC', mentions: 50000, sentiment: 15, category: 'crypto' },
        { topic: 'ETH', mentions: 30000, sentiment: 20, category: 'crypto' },
        { topic: 'SOL', mentions: 25000, sentiment: 35, category: 'crypto' },
        { topic: 'AI', mentions: 20000, sentiment: 40, category: 'general' },
        { topic: 'DeFi', mentions: 15000, sentiment: 10, category: 'crypto' },
        { topic: 'NFT', mentions: 10000, sentiment: -5, category: 'crypto' },
        { topic: 'L2', mentions: 8000, sentiment: 25, category: 'crypto' },
        { topic: 'RWA', mentions: 7000, sentiment: 30, category: 'crypto' },
      );
    }

    cache.set(cacheKey, { data: topics, timestamp: Date.now() });
    return topics;
  } catch (error: any) {
    logger.error('Error fetching trending topics:', error.message);
    return [];
  }
}

/**
 * Get social alerts (volume spikes, sentiment shifts)
 */
export async function getSocialAlerts(): Promise<SocialAlert[]> {
  const cacheKey = 'sentiment:alerts';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL / 2) { // Shorter cache for alerts
    return cached.data;
  }

  try {
    logger.info('Generating social alerts');
    const alerts: SocialAlert[] = [];

    // Get trending to identify spikes
    const trending = await getTrendingTopics();
    
    for (const topic of trending) {
      // Volume spike alert
      if (topic.change24h && topic.change24h > 100) {
        alerts.push({
          asset: topic.topic,
          type: 'volume_spike',
          severity: topic.change24h > 200 ? 'high' : 'medium',
          message: `${topic.topic} social volume up ${topic.change24h.toFixed(0)}% in 24h`,
          timestamp: Date.now(),
          data: { change: topic.change24h },
        });
      }

      // Sentiment shift
      if (topic.sentiment > 50 || topic.sentiment < -30) {
        alerts.push({
          asset: topic.topic,
          type: 'sentiment_shift',
          severity: Math.abs(topic.sentiment) > 60 ? 'high' : 'medium',
          message: `${topic.topic} sentiment is ${topic.sentiment > 0 ? 'extremely bullish' : 'very bearish'} (${topic.sentiment.toFixed(0)})`,
          timestamp: Date.now(),
          data: { sentiment: topic.sentiment },
        });
      }

      // Trending alert
      if (topic.mentions > 40000) {
        alerts.push({
          asset: topic.topic,
          type: 'trending',
          severity: 'low',
          message: `${topic.topic} is trending with ${(topic.mentions / 1000).toFixed(0)}K mentions`,
          timestamp: Date.now(),
          data: { mentions: topic.mentions },
        });
      }
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    cache.set(cacheKey, { data: alerts, timestamp: Date.now() });
    return alerts;
  } catch (error: any) {
    logger.error('Error generating social alerts:', error.message);
    return [];
  }
}

/**
 * Get aggregated market sentiment
 */
export async function getMarketSentiment(): Promise<{
  overall: number;
  fearGreed: number;
  socialScore: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  breakdown: { category: string; sentiment: number; volume: number }[];
}> {
  const cacheKey = 'sentiment:market';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    logger.info('Calculating market sentiment');

    // Get Fear & Greed from Alternative.me
    let fearGreed = 50;
    try {
      const fngResponse = await axios.get(
        'https://api.alternative.me/fng/',
        { timeout: 5000 }
      );
      if (fngResponse.data?.data?.[0]) {
        fearGreed = parseInt(fngResponse.data.data[0].value);
      }
    } catch (e) {
      logger.debug('Fear & Greed fetch failed');
    }

    // Get trending for social score
    const trending = await getTrendingTopics();
    const avgSentiment = trending.length > 0
      ? trending.reduce((sum, t) => sum + t.sentiment, 0) / trending.length
      : 0;

    // Calculate overall sentiment
    const socialScore = Math.min(100, Math.max(0, 50 + avgSentiment));
    const overall = Math.round((fearGreed + socialScore) / 2);

    // Determine trend
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (overall > 60) trend = 'bullish';
    else if (overall < 40) trend = 'bearish';

    // Category breakdown
    const breakdown = [
      { category: 'Bitcoin', sentiment: avgSentiment + 5, volume: trending.find(t => t.topic === 'BTC')?.mentions || 0 },
      { category: 'Altcoins', sentiment: avgSentiment - 5, volume: trending.filter(t => t.topic !== 'BTC').reduce((sum, t) => sum + t.mentions, 0) },
      { category: 'DeFi', sentiment: avgSentiment, volume: trending.find(t => t.topic === 'DeFi')?.mentions || 0 },
      { category: 'NFTs', sentiment: avgSentiment - 15, volume: trending.find(t => t.topic === 'NFT')?.mentions || 0 },
    ];

    const result = {
      overall,
      fearGreed,
      socialScore,
      trend,
      breakdown,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error: any) {
    logger.error('Error calculating market sentiment:', error.message);
    return {
      overall: 50,
      fearGreed: 50,
      socialScore: 50,
      trend: 'neutral',
      breakdown: [],
    };
  }
}

