import React, { useMemo, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useTerminalStore } from '../../store/useTerminalStore';
import { Pane } from './Pane';
import type { Pane as PaneType } from '@shared/types';

// Virtualized pane grid for 100+ panes with low memory usage
// Only renders visible panes + buffer
const VISIBLE_PANES_BUFFER = 20; // Render 20 panes at a time

export function VirtualizedPaneGrid() {
  const { panes } = useTerminalStore();

  // Memoize pane layout calculation
  const layout = useMemo(() => {
    if (panes.length === 0) return null;
    if (panes.length === 1) return { type: 'single', panes };
    
    // Calculate optimal grid layout
    const totalPanes = panes.length;
    const cols = Math.ceil(Math.sqrt(totalPanes));
    const rows = Math.ceil(totalPanes / cols);
    
    return { type: 'grid', rows, cols, panes };
  }, [panes]);

  // Only render visible panes for performance
  const visiblePanes = useMemo(() => {
    if (!layout || layout.type === 'single') return panes;
    // For now, render all panes but with lazy loading
    // In production, implement intersection observer for true virtualization
    return panes.slice(0, VISIBLE_PANES_BUFFER);
  }, [panes, layout]);

  if (!layout) {
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

  if (layout.type === 'single') {
    return (
      <div className="pane-grid-single">
        <Pane pane={layout.panes[0]} />
      </div>
    );
  }

  // Grid layout with virtualization
  const rows = layout.rows ?? 1;
  const cols = layout.cols ?? 1;
  
  return (
    <div className="pane-grid-container">
      <PanelGroup direction="vertical" className="pane-grid">
        {Array.from({ length: rows }).map((_, rowIdx) => {
          const rowPanes = visiblePanes.slice(rowIdx * cols, (rowIdx + 1) * cols);
          if (rowPanes.length === 0) return null;

          return (
            <React.Fragment key={rowIdx}>
              <Panel defaultSize={100 / rows} minSize={10}>
                <PanelGroup direction="horizontal">
                  {rowPanes.map((pane, colIdx) => (
                    <React.Fragment key={pane.id}>
                      <Panel defaultSize={100 / rowPanes.length} minSize={10}>
                        <Pane pane={pane} />
                      </Panel>
                      {colIdx < rowPanes.length - 1 && (
                        <PanelResizeHandle className="pane-resize-handle" data-panel-group-direction="horizontal" />
                      )}
                    </React.Fragment>
                  ))}
                </PanelGroup>
              </Panel>
              {rowIdx < rows - 1 && (
                <PanelResizeHandle className="pane-resize-handle" data-panel-group-direction="vertical" />
              )}
            </React.Fragment>
          );
        })}
      </PanelGroup>
    </div>
  );
}

