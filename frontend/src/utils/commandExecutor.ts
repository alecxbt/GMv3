import type { Command, Pane } from '../../../shared/src/types';
import { useTerminalStore } from '../store/useTerminalStore';

export async function executeCommand(command: Command): Promise<Pane | null> {
  const { ticker, countryCode, assetType, action, filters } = command;
  const store = useTerminalStore.getState();

  // ============================================
  // LAYOUT COMMANDS
  // ============================================
  
  if (action === 'save-layout') {
    const name = filters?.name || `Layout ${new Date().toLocaleString()}`;
    store.saveCurrentLayout(name);
    return null;
  }
  
  if (action === 'load-layout') {
    const name = filters?.name;
    if (name) {
      const layout = store.layouts.find(l => l.name.toLowerCase() === name.toLowerCase());
      if (layout) {
        store.loadLayout(layout.id);
      }
    }
    return null;
  }
  
  if (action === 'list-layouts') {
    return {
      id: `layouts-${Date.now()}`,
      type: 'help',
      title: 'Saved Layouts',
      data: { layouts: store.layouts },
    };
  }

  // ============================================
  // STANDALONE PANE COMMANDS
  // ============================================

  // Help - H
  if (action === 'help') {
    return {
      id: `help-${Date.now()}`,
      type: 'help',
      title: 'Command Reference',
    };
  }

  // Portfolio - P
  if (action === 'portfolio') {
    return {
      id: `portfolio-${Date.now()}`,
      type: 'portfolio',
      title: 'Portfolio',
    };
  }
  
  // Portfolio Add
  if (action === 'ADD' && command.parts[0] === 'P') {
    await fetch('/api/portfolio/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker,
        shares: parseFloat(filters?.shares || '0'),
        type: assetType || 'equity',
      }),
    });
    return null;
  }
  
  // Portfolio Exposure
  if (action === 'EXP' && command.parts[0] === 'P' && ticker) {
    return {
      id: `exposure-${ticker}-${Date.now()}`,
      type: 'exposure',
      title: `${ticker} Exposures`,
      ticker,
    };
  }

  // Most Active - M
  if (action === 'most-active') {
    return {
      id: `most-active-${Date.now()}`,
      type: 'most-active',
      title: 'Most Active',
    };
  }

  // Sector Monitor - S
  if (action === 'sector') {
    return {
      id: `sector-monitor-${Date.now()}`,
      type: 'sector-monitor',
      title: 'Sector Monitor',
    };
  }

  // Trading Terminal - T
  if (action === 'trading') {
    return {
      id: `trading-${Date.now()}`,
      type: 'trading',
      title: 'Trading Terminal',
    };
  }

  // DeFi Yields - Y
  if (action === 'yields') {
    return {
      id: `defi-yields-${Date.now()}`,
      type: 'defi-yields',
      title: 'DeFi Yields',
    };
  }

  // Quote Monitor - QM
  if (action === 'quote-monitor') {
    return {
      id: `quote-monitor-${Date.now()}`,
      type: 'quote-monitor',
      title: 'Quote Monitor',
      config: { watchlist: [] },
      gridLayout: { x: 0, y: 0, w: 12, h: 10, minW: 8, minH: 6 },
    };
  }

  // Notes - NOTES
  if (action === 'notes') {
    return {
      id: `notes-${Date.now()}`,
      type: 'notes',
      title: 'Notes',
    };
  }

  // On-Chain Overview - OC
  if (action === 'onchain-overview') {
    return {
      id: `onchain-overview-${Date.now()}`,
      type: 'onchain-overview',
      title: 'On-Chain Overview',
    };
  }

  // Prediction Markets - PRED
  if (action === 'prediction-overview') {
    return {
      id: `prediction-overview-${Date.now()}`,
      type: 'prediction-overview',
      title: 'Prediction Markets Overview',
    };
  }

  // Manager Selector - MGR
  if (action === 'manager-selector') {
    return {
      id: `manager-selector-${Date.now()}`,
      type: 'manager-selector',
      title: 'Manager Selector',
    };
  }

  // Historical Comparison - HC
  if (action === 'historical-comparison') {
    const tickersStr = filters?.tickers || '';
    const tickers = tickersStr.split(',').map(t => t.trim()).filter(Boolean);
    return {
      id: `historical-comparison-${Date.now()}`,
      type: 'historical-comparison',
      title: tickers.length > 0 ? `Historical Comparison: ${tickers.join(', ')}` : 'Historical Performance Comparison',
      config: { tickers },
      gridLayout: { x: 0, y: 0, w: 12, h: 10, minW: 6, minH: 6 },
    };
  }

  // Ratio Analysis - RA
  if (action === 'ratio-analysis') {
    const ticker1 = ticker;
    const ticker2 = filters?.ticker2;
    
    if (!ticker1 || !ticker2) {
      return {
        id: `ratio-analysis-${Date.now()}`,
        type: 'ratio-analysis',
        title: 'Ratio Analysis',
        config: { ticker1: '', ticker2: '' },
      };
    }
    
    return {
      id: `ratio-analysis-${Date.now()}`,
      type: 'ratio-analysis',
      title: `Ratio: ${ticker1}/${ticker2}`,
      ticker: ticker1,
      config: { ticker1, ticker2 },
    };
  }

  // Predictive Analytics - PREDICT
  if (action === 'predict') {
    return {
      id: `predictive-${Date.now()}`,
      type: 'predictive-analytics',
      title: 'Predictive Analytics',
    };
  }

  // ============================================
  // ECONOMIC & MACRO COMMANDS
  // ============================================

  // Economic Calendar - E, ECON
  if (action === 'economic') {
    return {
      id: `economic-${Date.now()}`,
      type: 'economic',
      title: 'Economic Calendar & Macro',
      config: { tab: 'overview' },
    };
  }

  // Earnings Calendar - EARNINGS
  if (action === 'earnings') {
    return {
      id: `earnings-${Date.now()}`,
      type: 'economic',
      title: 'Earnings Calendar',
      config: { tab: 'earnings' },
    };
  }

  // Treasury Yields - TREASURY
  if (action === 'treasury') {
    return {
      id: `treasury-${Date.now()}`,
      type: 'economic',
      title: 'Treasury Yield Curve',
      config: { tab: 'treasury' },
    };
  }

  // Fed Calendar - FED
  if (action === 'fed') {
    return {
      id: `fed-${Date.now()}`,
      type: 'economic',
      title: 'Fed Meetings',
      config: { tab: 'fed' },
    };
  }

  // Fear & Greed - FG (standalone feature)
  if (action === 'feargreed') {
    return {
      id: `feargreed-${Date.now()}`,
      type: 'economic',
      title: 'Fear & Greed Index',
      config: { tab: 'feargreed' },
      gridLayout: { x: 0, y: 0, w: 6, h: 10, minW: 4, minH: 6 },
    };
  }

  // ============================================
  // GOVERNANCE & DAO COMMANDS
  // ============================================

  // Governance - GOV, DAO
  if (action === 'governance') {
    return {
      id: `governance-${Date.now()}`,
      type: 'governance',
      title: ticker ? `${ticker} Governance` : 'DAO Governance',
      ticker,
      config: { daoId: ticker?.toLowerCase() },
    };
  }

  // ============================================
  // ALERTS COMMANDS
  // ============================================

  // Alerts - ALERTS, AL
  if (action === 'alerts') {
    return {
      id: `alerts-${Date.now()}`,
      type: 'alerts',
      title: 'Alerts Manager',
    };
  }

  // ============================================
  // ON-CHAIN ANALYTICS COMMANDS
  // ============================================

  // On-Chain (standalone from WHALE, WH, FR, FUNDING commands)
  if (action === 'onchain' && !ticker) {
    return {
      id: `onchain-${Date.now()}`,
      type: 'onchain',
      title: 'On-Chain Analytics',
    };
  }

  // Error Reporting
  if (action === 'error') {
    await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: filters?.message }),
    });
    return null;
  }

  // ============================================
  // DEFI COMMANDS
  // ============================================
  
  if (action === 'defi') {
    if (ticker) {
      const chainNameMap: Record<string, string> = {
        'solana': 'Solana',
        'ethereum': 'Ethereum',
        'eth': 'Ethereum',
        'bsc': 'BSC',
        'binance': 'BSC',
        'polygon': 'Polygon',
        'arbitrum': 'Arbitrum',
        'optimism': 'Optimism',
        'avalanche': 'Avalanche',
        'avax': 'Avalanche',
        'base': 'Base',
        'fantom': 'Fantom',
        'cronos': 'Cronos',
        'cosmos': 'Cosmos',
      };
      
      const tickerLower = ticker.toLowerCase();
      const mappedChain = chainNameMap[tickerLower];
      
      if (mappedChain) {
        return {
          id: `defi-${tickerLower}-${Date.now()}`,
          type: 'defi',
          title: `${mappedChain} DeFi Overview`,
          config: { chain: mappedChain },
        };
      } else {
        return {
          id: `defi-protocol-${ticker}-${Date.now()}`,
          type: 'defi-protocol',
          title: `${ticker} Protocol`,
          ticker,
          config: { protocolId: ticker.toLowerCase() },
        };
      }
    }
    return {
      id: `defi-${Date.now()}`,
      type: 'defi',
      title: 'DeFi Overview',
    };
  }

  // ============================================
  // PREDICTION MARKET COMMANDS
  // ============================================
  
  if (assetType === 'prediction') {
    if (action === 'event') {
      return {
        id: `pred-${Date.now()}`,
        type: 'prediction',
        title: `Prediction: ${ticker}`,
        ticker,
      };
    }
    if (action === 'volume') {
      return {
        id: `pred-vol-${Date.now()}`,
        type: 'prediction',
        title: 'Top Prediction Markets',
      };
    }
  }

  // ============================================
  // RSS COMMANDS
  // ============================================
  
  if (command.parts[0] === 'RSS') {
    if (action === 'ADD') {
      await fetch('/api/rss/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: filters?.url,
          label: filters?.label,
        }),
      });
      return null;
    }
    if (action === 'VIEW') {
      return {
        id: `rss-${filters?.label}-${Date.now()}`,
        type: 'rss',
        title: `RSS: ${filters?.label}`,
        config: { label: filters?.label },
      };
    }
  }

  // ============================================
  // 13-F FILINGS
  // ============================================
  
  if (action === 'form13f' && ticker) {
    return {
      id: `form13f-${ticker}-${Date.now()}`,
      type: 'form13f',
      title: `${ticker} 13-F Filings`,
      ticker,
      config: { managerName: ticker },
    };
  }

  // ============================================
  // CRYPTO COMMANDS
  // ============================================
  
  if (assetType === 'crypto' && ticker) {
    // Parse crypto pair
    const isPair = ticker.length >= 6 && ticker.length <= 8 && /^[A-Z]{3,}[A-Z]{3,}$/i.test(ticker);
    
    let base = ticker;
    let quote = 'USD';
    if (isPair) {
      if (ticker.length === 6) {
        base = ticker.slice(0, 3);
        quote = ticker.slice(3);
      } else if (ticker.length === 7) {
        base = ticker.slice(0, 3);
        quote = ticker.slice(3);
      } else {
        base = ticker.slice(0, 4);
        quote = ticker.slice(4);
      }
    }
    
    const displayTitle = isPair ? `${base}/${quote}` : ticker;
    
    // Chart - G
    if (action === 'chart') {
      return {
        id: `crypto-chart-${ticker}-${Date.now()}`,
        type: 'chart',
        title: `${displayTitle} Chart`,
        ticker,
        assetType: 'crypto',
        config: { isPair, base, quote },
      };
    }
    
    // Volume - VOL
    if (action === 'volume') {
      return {
        id: `crypto-${ticker}-${Date.now()}`,
        type: 'crypto',
        title: `${displayTitle} Volume`,
        ticker,
        config: { isPair },
      };
    }
    
    // On-Chain - OC
    if (action === 'onchain') {
      return {
        id: `onchain-${ticker}-${Date.now()}`,
        type: 'onchain',
        title: `${displayTitle} On-Chain Data`,
        ticker: base,
      };
    }
    
    // Trading - T
    if (action === 'trading') {
      return {
        id: `trading-${Date.now()}`,
        type: 'trading',
        title: 'Trading Terminal',
        ticker: isPair ? `${base}/${quote}` : ticker,
      };
    }
    
    // News - N
    if (action === 'news') {
      return {
        id: `news-${ticker}-${Date.now()}`,
        type: 'news',
        title: `${displayTitle} News`,
        ticker,
        config: { assetType: 'crypto' },
      };
    }
  }

  // ============================================
  // EQUITY COMMANDS
  // ============================================
  
  if ((assetType === 'equity' || countryCode) && ticker) {
    const displayTitle = countryCode ? `${ticker} ${countryCode}` : ticker;
    
    // Chart - G
    if (action === 'chart') {
      return {
        id: `chart-${ticker}-${countryCode || 'US'}-${Date.now()}`,
        type: 'chart',
        title: `${displayTitle} Chart`,
        ticker,
        config: { countryCode },
      };
    }
    
    // News - N
    if (action === 'news') {
      return {
        id: `news-${ticker}-${countryCode || 'US'}-${Date.now()}`,
        type: 'news',
        title: `${displayTitle} News`,
        ticker,
        config: { ...filters, countryCode },
      };
    }
    
    // Quote - Q
    if (action === 'quote') {
      return {
        id: `quote-${ticker}-${countryCode || 'US'}-${Date.now()}`,
        type: 'quote',
        title: `${displayTitle} Quote`,
        ticker,
        config: { countryCode },
      };
    }
    
    // Options - O
    if (action === 'options') {
      return {
        id: `options-${ticker}-${countryCode || 'US'}-${Date.now()}`,
        type: 'options',
        title: `${displayTitle} Options`,
        ticker,
        config: { countryCode },
      };
    }
    
    // Fundamental Analysis - FA
    if (action === 'fundamental-analysis') {
      return {
        id: `fundamental-analysis-${ticker}-${countryCode || 'US'}-${Date.now()}`,
        type: 'fundamental-analysis',
        title: `${displayTitle} Fundamental Analysis`,
        ticker,
        config: { countryCode },
      };
    }
    
    // Filings - CF
    if (action === 'filings') {
      return {
        id: `filings-${ticker}-${Date.now()}`,
        type: 'filings',
        title: `${ticker} Filings`,
        ticker,
        config: { countryCode },
      };
    }
    
    // Financials - FIN
    if (action === 'financials') {
      return {
        id: `financials-${ticker}-${countryCode || 'US'}-${Date.now()}`,
        type: 'financials',
        title: `${displayTitle} Financials`,
        ticker,
        config: { countryCode },
      };
    }
  }

  return null;
}
