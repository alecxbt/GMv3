import type { Pane } from '../../../shared/src/types';

interface HelpPaneProps {
  pane: Pane;
}

interface CommandCategory {
  title: string;
  commands: Array<{
    command: string;
    description: string;
    example?: string;
  }>;
}

export function HelpPane({ pane }: HelpPaneProps) {
  const commandCategories: CommandCategory[] = [
    {
      title: 'Quick Reference',
      commands: [
        { command: 'H', description: 'Open this help page' },
        { command: 'P', description: 'View portfolio' },
        { command: 'M', description: 'Most active stocks' },
        { command: 'S', description: 'Sector monitor' },
        { command: 'T', description: 'Trading terminal' },
        { command: 'Y', description: 'DeFi yields' },
        { command: 'D', description: 'DeFi overview' },
        { command: 'QM', description: 'Quote monitor' },
        { command: 'OC', description: 'On-chain overview' },
        { command: 'MGR', description: 'Manager selector (13-F)' },
        { command: 'PRED', description: 'Prediction markets' },
        { command: 'NOTES', description: 'Notes pane' },
      ],
    },
    {
      title: 'Equity Commands',
      commands: [
        { command: 'TICKER CC G', description: 'View chart', example: 'AAPL US G' },
        { command: 'TICKER CC N', description: 'View news', example: 'MSFT US N' },
        { command: 'TICKER CC Q', description: 'View quote', example: 'TSLA US Q' },
        { command: 'TICKER CC O', description: 'View options chain', example: 'AAPL US O' },
        { command: 'TICKER CC FA', description: 'Fundamental analysis', example: 'AAPL US FA' },
        { command: 'TICKER CC CF', description: 'SEC filings', example: 'AAPL US CF' },
        { command: 'TICKER CC FIN', description: 'Financial statements', example: 'AAPL US FIN' },
      ],
    },
    {
      title: 'Crypto Commands',
      commands: [
        { command: 'PAIR G', description: 'View crypto chart', example: 'BTCUSD G' },
        { command: 'PAIR N', description: 'View crypto news', example: 'ETHUSD N' },
        { command: 'PAIR VOL', description: 'View volume data', example: 'BTCUSD VOL' },
        { command: 'PAIR OC', description: 'On-chain data (whale alerts, flows)', example: 'BTCUSD OC' },
        { command: 'PAIR T', description: 'Trading terminal with pair', example: 'BTCUSD T' },
      ],
    },
    {
      title: 'DeFi Commands',
      commands: [
        { command: 'D', description: 'DeFi overview: protocols, TVL, yields' },
        { command: 'CHAIN D', description: 'DeFi filtered by chain', example: 'Solana D' },
        { command: 'PROTOCOL D', description: 'Protocol details', example: 'uniswap D' },
        { command: 'Y', description: 'Yield farming opportunities' },
        { command: 'GOV', description: 'DAO governance proposals' },
      ],
    },
    {
      title: 'Economic & Macro',
      commands: [
        { command: 'E', description: 'Economic calendar & macro overview' },
        { command: 'EARNINGS', description: 'Earnings calendar' },
        { command: 'TREASURY', description: 'Treasury yields curve' },
        { command: 'FED', description: 'Fed meetings & rate outlook' },
        { command: 'FG', description: 'Fear & Greed index' },
      ],
    },
    {
      title: 'On-Chain & Alerts',
      commands: [
        { command: 'OC', description: 'On-chain: whales, funding rates, unlocks' },
        { command: 'WHALE', description: 'Whale transactions tracker' },
        { command: 'FR', description: 'Funding rates across exchanges' },
        { command: 'ALERTS', description: 'Manage price & whale alerts' },
      ],
    },
    {
      title: 'Analysis Commands',
      commands: [
        { command: 'HC TICKERS', description: 'Historical comparison', example: 'HC URA SPY' },
        { command: 'RA T1 T2', description: 'Ratio analysis', example: 'RA URA SPY' },
        { command: 'PREDICT', description: 'Predictive analytics' },
      ],
    },
    {
      title: 'Portfolio Commands',
      commands: [
        { command: 'P', description: 'View portfolio' },
        { command: 'P ADD TICKER QTY', description: 'Add position', example: 'P ADD AAPL 100' },
        { command: 'P EXP TICKER', description: 'View exposures', example: 'P EXP SPY' },
      ],
    },
    {
      title: '13-F Filings',
      commands: [
        { command: 'MGR', description: 'Open manager selector' },
        { command: 'NAME CF', description: 'View manager 13-F filings', example: 'Bill Ackman CF' },
      ],
    },
    {
      title: 'Prediction Markets',
      commands: [
        { command: 'PRED', description: 'Prediction markets overview' },
        { command: 'PRED EVENT NAME', description: 'Specific event odds', example: 'PRED EVENT ELECTION' },
        { command: 'PRED VOL', description: 'Top markets by volume' },
      ],
    },
    {
      title: 'Layout & Other',
      commands: [
        { command: 'SAVE name', description: 'Save current layout', example: 'SAVE My Layout' },
        { command: 'LOAD name', description: 'Load saved layout', example: 'LOAD My Layout' },
        { command: 'LS', description: 'List saved layouts' },
        { command: 'RSS ADD url "label"', description: 'Add RSS feed', example: 'RSS ADD https://... "News"' },
        { command: 'RSS VIEW label', description: 'View RSS feed', example: 'RSS VIEW News' },
      ],
    },
  ];

  return (
    <div className="help-pane" style={{ 
      height: '100%', 
      overflowY: 'auto',
      padding: '20px',
      fontSize: '12px',
      color: 'var(--terminal-text)',
    }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '20px', 
          fontWeight: 'bold', 
          color: 'var(--terminal-accent)',
          marginBottom: '8px',
        }}>
          GM Terminal Commands
        </h1>
        <p style={{ color: 'var(--terminal-dim)', fontSize: '11px' }}>
          Press ` to toggle CLI • Use ↑↓ for history
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px' 
      }}>
        {commandCategories.map((category, categoryIndex) => (
          <div key={categoryIndex} style={{ 
            background: 'var(--terminal-bg-secondary)',
            borderRadius: '6px',
            border: '1px solid var(--terminal-border)',
            padding: '16px',
          }}>
            <h2 style={{ 
              fontSize: '13px', 
              fontWeight: 'bold', 
              color: 'var(--terminal-accent)',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--terminal-border)',
            }}>
              {category.title}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {category.commands.map((cmd, cmdIndex) => (
                <div key={cmdIndex} style={{ 
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}>
                  <code style={{ 
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    color: 'var(--terminal-green, #00ff88)',
                    background: 'var(--terminal-bg)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    minWidth: '100px',
                  }}>
                    {cmd.command}
                  </code>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: 'var(--terminal-text)', fontSize: '11px' }}>
                      {cmd.description}
                    </span>
                    {cmd.example && (
                      <span style={{ 
                        color: 'var(--terminal-dim)',
                        fontSize: '10px',
                        marginLeft: '6px',
                        fontStyle: 'italic',
                      }}>
                        ({cmd.example})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        marginTop: '24px',
        padding: '16px',
        background: 'var(--terminal-bg-secondary)',
        borderRadius: '6px',
        border: '1px solid var(--terminal-border)',
      }}>
        <h3 style={{ 
          fontSize: '12px', 
          fontWeight: 'bold', 
          color: 'var(--terminal-text)',
          marginBottom: '8px',
        }}>
          Country Codes
        </h3>
        <p style={{ 
          color: 'var(--terminal-dim)',
          fontSize: '11px',
          lineHeight: '1.6',
        }}>
          US (default), DE, GB, FR, JP, CN, HK, AU, CA, and many more.
          <br/>
          <span style={{ color: 'var(--terminal-text)' }}>Crypto pairs:</span> BTCUSD, ETHUSD, SOLUSD, BTCZEC, etc.
        </p>
      </div>
    </div>
  );
}
