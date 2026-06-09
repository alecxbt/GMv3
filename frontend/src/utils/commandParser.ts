import type { Command, AssetType } from '@shared/types';

// Common country codes (ISO 3166-1 alpha-2)
const COUNTRY_CODES = new Set([
  'US', 'DE', 'GB', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT',
  'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'IE', 'PT', 'GR', 'AU',
  'CA', 'JP', 'CN', 'HK', 'SG', 'KR', 'IN', 'BR', 'MX', 'AR',
  'NZ', 'ZA', 'RU', 'TR', 'IL', 'AE', 'SA', 'TW', 'TH', 'MY',
  'ID', 'PH', 'VN', 'CL', 'CO', 'PE', 'EG', 'NG', 'KE',
]);

// Simplified action aliases - each function has ONE short code
const ACTIONS: Record<string, string> = {
  // Chart & Quote
  'G': 'chart',
  'N': 'news',
  'Q': 'quote',
  'O': 'options',
  
  // Analysis
  'FA': 'fundamental-analysis',
  'CF': 'filings',
  'FIN': 'financials',
  
  // Crypto specific
  'VOL': 'volume',
  'OC': 'onchain',
};

// Common crypto symbols for pair detection
const CRYPTO_SYMBOLS = new Set([
  'BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'MATIC', 'AVAX', 'LINK', 'UNI', 'ATOM',
  'XRP', 'DOGE', 'SHIB', 'LTC', 'BCH', 'XLM', 'ALGO', 'VET', 'FIL', 'TRX',
  'ETC', 'XMR', 'ZEC', 'DASH', 'EOS', 'AAVE', 'MKR', 'COMP', 'SNX', 'YFI',
  'USD', 'USDT', 'USDC', 'DAI', 'EUR', 'GBP', 'JPY',
]);

// Check if ticker is a crypto pair (e.g., BTCUSD, BTCZEC, ETHBTC)
function isCryptoPair(ticker: string): boolean {
  const upper = ticker.toUpperCase();
  if (upper.length < 6 || upper.length > 8) return false;
  
  for (const symbol of CRYPTO_SYMBOLS) {
    if (upper.startsWith(symbol) && upper.length > symbol.length) {
      const remaining = upper.slice(symbol.length);
      if (CRYPTO_SYMBOLS.has(remaining) || 
          remaining === 'USD' || remaining === 'USDT' || remaining === 'USDC' ||
          remaining === 'EUR' || remaining === 'GBP' || remaining === 'JPY') {
        return true;
      }
      if (remaining.length >= 3 && remaining.length <= 4 && /^[A-Z]+$/.test(remaining)) {
        return true;
      }
    }
  }
  return false;
}

export function parseCommand(input: string): Command {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  const command: Command = {
    raw: input,
    parts,
  };

  if (parts.length === 0) {
    return command;
  }

  const firstPart = parts[0].toUpperCase();
  
  // ============================================
  // STANDALONE COMMANDS (no ticker required)
  // ============================================
  
  // Help - H
  if (firstPart === 'H' || firstPart === 'HELP') {
    command.action = 'help';
    return command;
  }
  
  // Portfolio - P
  if (firstPart === 'P') {
    if (parts.length === 1) {
      command.action = 'portfolio';
      return command;
    }
    command.action = parts[1]?.toUpperCase();
    if (command.action === 'ADD') {
      command.ticker = parts[2];
      const sharesMatch = parts.find((p) => /^\d+$/.test(p));
      if (sharesMatch) {
        command.filters = { shares: sharesMatch };
      }
      const typeMatch = parts.find((p) => 
        ['etf', 'fund', 'crypto', 'pred'].includes(p.toLowerCase())
      );
      if (typeMatch) {
        command.assetType = typeMatch.toLowerCase() as AssetType;
      }
    } else if (command.action === 'EXP') {
      command.ticker = parts[2];
    }
    return command;
  }

  // Most Active - M
  if (firstPart === 'M') {
    command.action = 'most-active';
    return command;
  }
  
  // Sector Monitor - S
  if (firstPart === 'S') {
    command.action = 'sector';
    return command;
  }
  
  // Trading Terminal - T
  if (firstPart === 'T') {
    command.action = 'trading';
    return command;
  }
  
  // DeFi Yields - Y
  if (firstPart === 'Y') {
    command.action = 'yields';
    return command;
  }
  
  // Quote Monitor - QM
  if (firstPart === 'QM') {
    command.action = 'quote-monitor';
    return command;
  }
  
  // Notes - NOTES
  if (firstPart === 'NOTES') {
    command.action = 'notes';
    return command;
  }
  
  // DeFi Overview - D or DEFI
  if (firstPart === 'D' || firstPart === 'DEFI') {
    command.action = 'defi';
    if (parts.length > 1) {
      command.ticker = parts.slice(1).join(' ');
    }
    return command;
  }

  // On-Chain Overview - OC (standalone)
  if (firstPart === 'OC' && parts.length === 1) {
    command.action = 'onchain-overview';
    return command;
  }

  // Prediction Markets - PRED
  if (firstPart === 'PRED') {
    if (parts.length === 1) {
      command.action = 'prediction-overview';
      return command;
    }
    command.assetType = 'prediction';
    if (parts[1]?.toUpperCase() === 'EVENT') {
      command.action = 'event';
      command.ticker = parts.slice(2).join(' ');
    } else if (parts[1]?.toUpperCase() === 'VOL') {
      command.action = 'volume';
    }
    return command;
  }

  // Manager Selector - MGR
  if (firstPart === 'MGR') {
    command.action = 'manager-selector';
    return command;
  }

  // Historical Comparison - HC
  if (firstPart === 'HC') {
    command.action = 'historical-comparison';
    const tickersStr = parts.slice(1).join(' ');
    const tickers = tickersStr.includes(',') 
      ? tickersStr.split(',').map(t => t.trim()).filter(Boolean)
      : parts.slice(1).filter(Boolean);
    command.filters = { tickers: tickers.join(',') };
    return command;
  }

  // Ratio Analysis - RA
  if (firstPart === 'RA') {
    command.action = 'ratio-analysis';
    if (parts.length >= 3) {
      command.ticker = parts[1];
      command.filters = { ticker2: parts[2] };
    } else if (parts.length === 2 && parts[1].includes('/')) {
      const [t1, t2] = parts[1].split('/');
      command.ticker = t1.trim();
      command.filters = { ticker2: t2.trim() };
    }
    return command;
  }
  
  // Predictive Analytics - PREDICT
  if (firstPart === 'PREDICT') {
    command.action = 'predict';
    return command;
  }

  // Economic Calendar - E or ECON
  if (firstPart === 'E' || firstPart === 'ECON' || firstPart === 'ECONOMIC') {
    command.action = 'economic';
    return command;
  }

  // Earnings Calendar - EARNINGS
  if (firstPart === 'EARNINGS') {
    command.action = 'earnings';
    return command;
  }

  // Treasury Yields - YIELDS or TREASURY
  if (firstPart === 'TREASURY' || (firstPart === 'YIELDS' && parts.length === 1)) {
    command.action = 'treasury';
    return command;
  }

  // Fed Calendar - FED
  if (firstPart === 'FED') {
    command.action = 'fed';
    return command;
  }

  // Fear & Greed - FG
  if (firstPart === 'FG' || firstPart === 'FEARGREED') {
    command.action = 'feargreed';
    return command;
  }

  // Governance / DAO - GOV or DAO
  if (firstPart === 'GOV' || firstPart === 'DAO' || firstPart === 'GOVERNANCE') {
    command.action = 'governance';
    if (parts.length > 1) {
      command.ticker = parts.slice(1).join(' ');
    }
    return command;
  }

  // Alerts - ALERTS or AL
  if (firstPart === 'ALERTS' || firstPart === 'AL') {
    command.action = 'alerts';
    return command;
  }

  // Whales - WHALE or WH
  if (firstPart === 'WHALE' || firstPart === 'WH' || firstPart === 'WHALES') {
    command.action = 'onchain';
    return command;
  }

  // Funding Rates - FR
  if (firstPart === 'FR' || firstPart === 'FUNDING') {
    command.action = 'onchain';
    return command;
  }

  // Layout Commands
  if (firstPart === 'SAVE') {
    command.action = 'save-layout';
    if (parts.length > 1) {
      command.filters = { name: parts.slice(1).join(' ') };
    }
    return command;
  }
  
  if (firstPart === 'LOAD') {
    command.action = 'load-layout';
    if (parts.length > 1) {
      command.filters = { name: parts.slice(1).join(' ') };
    }
    return command;
  }
  
  if (firstPart === 'LS') {
    command.action = 'list-layouts';
    return command;
  }
  
  // RSS Commands
  if (firstPart === 'RSS') {
    command.action = parts[1]?.toUpperCase();
    if (command.action === 'ADD') {
      command.filters = {
        url: parts[2],
        label: parts.slice(3).join(' ').replace(/^"|"$/g, ''),
      };
    } else if (command.action === 'VIEW') {
      command.filters = { label: parts.slice(2).join(' ') };
    }
    return command;
  }

  // Error Reporting
  if (firstPart === 'ERR') {
    command.action = 'error';
    command.filters = { message: parts.slice(1).join(' ') };
    return command;
  }

  // ============================================
  // TICKER-BASED COMMANDS
  // ============================================

  // 13-F Filings for managers: "Manager Name CF"
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].toUpperCase();
    if (lastPart === 'CF' && parts.length > 2) {
      // Check if this looks like a manager name (more than one word before CF)
      const managerName = parts.slice(0, -1).join(' ');
      command.action = 'form13f';
      command.ticker = managerName;
      return command;
    }
  }

  // Crypto pair commands (e.g., BTCUSD G)
  if (isCryptoPair(firstPart)) {
    command.ticker = firstPart;
    command.assetType = 'crypto';
    const actionPart = parts[1];
    if (actionPart) {
      command.action = ACTIONS[actionPart.toUpperCase()] || actionPart.toLowerCase();
    }
    return command;
  }
  
  // Check for "CHAIN D" or "CHAIN DEFI" pattern
  const secondPart = parts[1]?.toUpperCase();
  if (secondPart === 'D' || secondPart === 'DEFI') {
    command.action = 'defi';
    command.ticker = firstPart;
    return command;
  }

  // Standard equity commands: TICKER COUNTRY_CODE ACTION
  command.ticker = firstPart;
  
  if (secondPart && COUNTRY_CODES.has(secondPart)) {
    command.countryCode = secondPart;
    command.assetType = 'equity';
    const actionPart = parts[2];
    if (actionPart) {
      command.action = ACTIONS[actionPart.toUpperCase()] || actionPart.toLowerCase();
    }
  } else {
    // Default to US equity
    command.countryCode = 'US';
    command.assetType = 'equity';
    const actionPart = parts[1];
    if (actionPart) {
      command.action = ACTIONS[actionPart.toUpperCase()] || actionPart.toLowerCase();
    }
  }

  // Parse filters (key=value pairs)
  const filterStart = command.countryCode && COUNTRY_CODES.has(parts[1]?.toUpperCase() || '') ? 3 : 2;
  const filterParts = parts.slice(filterStart);
  if (filterParts.length > 0) {
    command.filters = command.filters || {};
    for (const part of filterParts) {
      if (part.includes('=')) {
        const [key, value] = part.split('=');
        command.filters[key] = value;
      }
    }
  }

  return command;
}

export function getCommandSuggestions(input: string): string[] {
  const suggestions: string[] = [];
  const upper = input.toUpperCase();
  const parts = input.trim().split(/\s+/).filter(Boolean);
  
  // Common ticker suggestions
  const commonTickers: Record<string, string[]> = {
    'US': ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA'],
    'DE': ['DBK', 'SAP', 'BMW', 'VOW3', 'BAYN'],
    'GB': ['BP', 'GSK', 'HSBC', 'RIO'],
  };
  
  if (parts.length === 0 || parts.length === 1) {
    const ticker = parts[0] || '';
    Object.entries(commonTickers).forEach(([country, tickers]) => {
      tickers.forEach((t) => {
        if (t.startsWith(ticker.toUpperCase())) {
          suggestions.push(`${t} ${country} G`);
        }
      });
    });
  } else if (parts.length === 2) {
    const ticker = parts[0];
    const second = parts[1].toUpperCase();
    
    if (COUNTRY_CODES.has(second)) {
      suggestions.push(`${ticker} ${second} G`, `${ticker} ${second} N`, `${ticker} ${second} Q`, `${ticker} ${second} CF`, `${ticker} ${second} FA`);
    }
  }
  
  // Command suggestions
  if (upper.startsWith('P') && upper.length === 1) {
    suggestions.push('P', 'P ADD AAPL 100', 'P EXP SPY');
  } else if (upper.startsWith('BTC') || upper.startsWith('ETH')) {
    suggestions.push('BTCUSD G', 'BTCUSD OC', 'ETHBTC G');
  } else if (upper.startsWith('PRED')) {
    suggestions.push('PRED', 'PRED EVENT', 'PRED VOL');
  } else if (upper.startsWith('HC')) {
    suggestions.push('HC URA SPY', 'HC AAPL MSFT', 'HC URA,SPY,AAPL');
  } else if (upper.startsWith('RA')) {
    suggestions.push('RA URA SPY', 'RA URA/SPY');
  }
  
  return suggestions.slice(0, 5);
}
