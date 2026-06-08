import React, { useState, useRef, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useTerminalStore } from '../../store/useTerminalStore';
import { parseCommand } from '../../utils/commandParser';
import type { Pane as PaneType } from '../../../shared/src/types';
import { ChartPane } from './ChartPane';
import { NewsPane } from './NewsPane';
import { QuotePane } from './QuotePane';
import { PortfolioPane } from './PortfolioPane';
import { CryptoPane } from './CryptoPane';
import { PredictionPane } from './PredictionPane';
import { RSSPane } from './RSSPane';
import { ExposurePane } from './ExposurePane';
import { MostActivePane } from './MostActivePane';
import { NotesPane } from './NotesPane';
import { SectorMonitorPane } from './SectorMonitorPane';
import { FilingsPane } from './FilingsPane';
import { Form13FPane } from './Form13FPane';
import { PredictiveAnalyticsPane } from './PredictiveAnalyticsPane';
import { FinancialsPane } from './FinancialsPane';
import { FundamentalAnalysisPane } from './FundamentalAnalysisPane';
import { OptionsPane } from './OptionsPane';
import { HistoricalComparisonPane } from './HistoricalComparisonPane';
import { RatioAnalysisPane } from './RatioAnalysisPane';
import { HelpPane } from './HelpPane';
import { ManagerSelectorPane } from './ManagerSelectorPane';
import { OnChainPane } from './OnChainPane';
import { OnChainOverviewPane } from './OnChainOverviewPane';
import { TradingPane } from './TradingPane';
import { DeFiPane } from './DeFiPane';
import { DeFiProtocolPane } from './DeFiProtocolPane';
import { PredictionOverviewPane } from './PredictionOverviewPane';
import { QuoteMonitorPane } from './QuoteMonitorPane';
import { EconomicPane } from './EconomicPane';
import { GovernancePane } from './GovernancePane';
import { AlertsPane } from './AlertsPane';
import { PaneLinkMenu } from './PaneLinkMenu';
import './Pane.css';
import './PaneLinkMenu.css';

interface PaneProps {
  pane: PaneType;
}

function PaneContent({ pane }: PaneProps) {
  switch (pane.type) {
    case 'chart':
      return <ChartPane pane={pane} />;
    case 'news':
      return <NewsPane pane={pane} />;
    case 'quote':
      return <QuotePane pane={pane} />;
    case 'portfolio':
      return <PortfolioPane pane={pane} />;
    case 'crypto':
      return <CryptoPane pane={pane} />;
    case 'prediction':
      return <PredictionPane pane={pane} />;
    case 'rss':
      return <RSSPane pane={pane} />;
    case 'exposure':
      return <ExposurePane pane={pane} />;
    case 'most-active':
      return <MostActivePane pane={pane} />;
    case 'notes':
      return <NotesPane pane={pane} />;
    case 'sector-monitor':
      return <SectorMonitorPane pane={pane} />;
    case 'filings':
      return <FilingsPane pane={pane} />;
    case 'form13f':
      return <Form13FPane pane={pane} />;
    case 'predictive-analytics':
      return <PredictiveAnalyticsPane pane={pane} />;
    case 'financials':
      return <FinancialsPane pane={pane} />;
    case 'fundamental-analysis':
      return <FundamentalAnalysisPane pane={pane} />;
    case 'options':
      return <OptionsPane pane={pane} />;
    case 'historical-comparison':
      return <HistoricalComparisonPane pane={pane} />;
    case 'ratio-analysis':
      return <RatioAnalysisPane pane={pane} />;
    case 'help':
      return <HelpPane pane={pane} />;
    case 'manager-selector':
      return <ManagerSelectorPane pane={pane} />;
    case 'onchain':
      return <OnChainPane pane={pane} />;
    case 'onchain-overview':
      return <OnChainOverviewPane pane={pane} />;
    case 'trading':
      return <TradingPane pane={pane} />;
    case 'defi':
    case 'defi-yields':
      return <DeFiPane pane={pane} />;
    case 'defi-protocol':
      return <DeFiProtocolPane pane={pane} />;
    case 'prediction-overview':
      return <PredictionOverviewPane pane={pane} />;
    case 'quote-monitor':
      return <QuoteMonitorPane pane={pane} />;
    case 'economic':
    case 'calendar':
    case 'earnings':
    case 'treasury':
    case 'fed':
    case 'feargreed':
      return <EconomicPane pane={pane} />;
    case 'governance':
    case 'dao':
    case 'proposals':
      return <GovernancePane pane={pane} />;
    case 'alerts':
      return <AlertsPane pane={pane} />;
    default:
      return <div className="pane-empty">Unknown pane type</div>;
  }
}

export function Pane({ pane }: PaneProps) {
  const { removePane, setActivePane, bringPaneToFront, activePaneId, updatePane, panes } = useTerminalStore();
  const [isEditingTicker, setIsEditingTicker] = useState(false);
  const [tickerInput, setTickerInput] = useState('');
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const isActive = activePaneId === pane.id;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTicker && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTicker]);

  const handleTickerChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newTicker = tickerInput.trim().toUpperCase();
      if (newTicker) {
        // Parse the new command to extract ticker and country code
        const command = parseCommand(newTicker);
        if (command.ticker) {
          // Determine pane type suffix
          const typeSuffix = pane.type === 'chart' ? 'Chart' : 
                           pane.type === 'quote' ? 'Quote' : 
                           pane.type === 'news' ? 'News' : '';
          
          // Update the pane with new ticker
          const newTitle = command.countryCode 
            ? `${command.ticker} ${command.countryCode} ${typeSuffix}`
            : command.assetType === 'crypto'
            ? `${command.ticker} ${typeSuffix}`
            : `${command.ticker} ${typeSuffix}`;
          
          updatePane(pane.id, {
            ticker: command.ticker,
            countryCode: command.countryCode,
            assetType: command.assetType,
            title: newTitle,
            config: { ...pane.config, countryCode: command.countryCode, isPair: command.assetType === 'crypto' },
          });
          
          // Update linked panes if any
          if (pane.linkedTickers && pane.linkedTickers.length > 0) {
            panes.forEach((p) => {
              if (p.linkedTickers?.includes(pane.ticker || '')) {
                updatePane(p.id, {
                  ticker: command.ticker,
                  countryCode: command.countryCode,
                  assetType: command.assetType,
                });
              }
            });
          }
        }
      }
      setIsEditingTicker(false);
      setTickerInput('');
    } else if (e.key === 'Escape') {
      setIsEditingTicker(false);
      setTickerInput('');
    }
  };

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Double-click to edit ticker for chart/quote/news panes
    if (pane.type === 'chart' || pane.type === 'quote' || pane.type === 'news') {
      setIsEditingTicker(true);
      setTickerInput(pane.ticker ? `${pane.ticker} ${pane.config?.countryCode || ''}`.trim() : '');
    }
  };

  // Note: Drag is now handled by react-grid-layout via draggableHandle=".pane-header"
  // These handlers are kept for visual feedback only
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    // Bring pane to front when clicked
    bringPaneToFront(pane.id);
    setActivePane(pane.id);
  };
  
  const handlePaneClick = (e: React.MouseEvent) => {
    // Only bring to front if clicking on the pane itself, not on interactive elements
    const target = e.target as HTMLElement;
    if (!target.closest('button') && !target.closest('input') && !target.closest('select')) {
      bringPaneToFront(pane.id);
      setActivePane(pane.id);
    }
  };

  // Extract display ticker from title
  const displayTicker = pane.ticker || pane.title.split(' ')[0];

  return (
    <div
      ref={paneRef}
      className={`pane ${isActive ? 'pane-active' : ''}`}
      onClick={handlePaneClick}
    >
      <div 
        className="pane-header"
        onMouseDown={handleMouseDown}
      >
        <div className="pane-title-container">
          {isEditingTicker && (pane.type === 'chart' || pane.type === 'quote' || pane.type === 'news') ? (
            <input
              ref={inputRef}
              type="text"
              className="pane-ticker-input"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              onKeyDown={handleTickerChange}
              onBlur={() => {
                setIsEditingTicker(false);
                setTickerInput('');
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Enter ticker (e.g., LULU US)"
            />
          ) : (
            <span 
              className="pane-title"
              onDoubleClick={handleTitleDoubleClick}
              title="Double-click to change ticker"
            >
              {pane.title}
            </span>
          )}
        </div>
        <div className="pane-header-actions">
          {(pane.type === 'chart' || pane.type === 'quote' || pane.type === 'news') && (
            <button
              className="pane-link-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowLinkMenu(true);
              }}
              title="Link panes"
            >
              🔗
            </button>
          )}
          <button
            className="pane-close"
            onClick={(e) => {
              e.stopPropagation();
              removePane(pane.id);
            }}
            title="Close pane"
          >
            ×
          </button>
        </div>
      </div>
      <div className={`pane-content ${pane.type === 'chart' ? 'pane-content-chart' : ''}`}>
        <PaneContent pane={pane} />
      </div>
      {showLinkMenu && (
        <PaneLinkMenu pane={pane} onClose={() => setShowLinkMenu(false)} />
      )}
    </div>
  );
}

export function PaneGrid() {
  const { panes } = useTerminalStore();

  if (panes.length === 0) {
    return (
      <div className="pane-grid-empty">
        <div className="pane-grid-empty-content">
          <h2>GM Terminal</h2>
          <p>Start by typing a command in the CLI below</p>
          <p className="pane-grid-examples">
            Try <code>AAPL US G</code>, <code>BTCUSD G</code>, <code>HMS BTCUSD QQQ</code>, <code>HELP</code>
          </p>
        </div>
      </div>
    );
  }

  if (panes.length === 1) {
    return (
      <div className="pane-grid-single">
        <Pane pane={panes[0]} />
      </div>
    );
  }

  // Simple 2x2 grid for now - can be enhanced with more complex layouts
  const rows = Math.ceil(Math.sqrt(panes.length));
  const cols = Math.ceil(panes.length / rows);

  return (
    <PanelGroup direction="vertical" className="pane-grid">
      {Array.from({ length: rows }).map((_, rowIdx) => {
        const rowPanes = panes.slice(rowIdx * cols, (rowIdx + 1) * cols);
        if (rowPanes.length === 0) return null;

        return (
          <PanelGroup key={rowIdx} direction="horizontal">
            {rowPanes.map((pane, colIdx) => (
              <React.Fragment key={pane.id}>
                <Panel defaultSize={100 / rowPanes.length} minSize={20}>
                  <Pane pane={pane} />
                </Panel>
                {colIdx < rowPanes.length - 1 && (
                  <PanelResizeHandle className="pane-resize-handle" data-panel-group-direction="horizontal" />
                )}
              </React.Fragment>
            ))}
          </PanelGroup>
        );
      })}
    </PanelGroup>
  );
}

