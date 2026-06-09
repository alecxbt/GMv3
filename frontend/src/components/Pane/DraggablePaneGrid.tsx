import { useCallback, useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { useTerminalStore } from '../../store/useTerminalStore';
import { Pane } from './Pane';
import './DraggablePaneGrid.css';

// Default pane dimensions in pixels
const DEFAULT_PANE_WIDTH = 500;
const DEFAULT_PANE_HEIGHT = 400;
const MIN_PANE_WIDTH = 300;
const MIN_PANE_HEIGHT = 200;

// Pane positioning offset for cascading new panes
const CASCADE_OFFSET = 30;

export function DraggablePaneGrid() {
  const { panes, updatePane, paneZIndices, bringPaneToFront, removePane } = useTerminalStore();
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Track next cascade position
  const cascadePosition = useRef({ x: 20, y: 20 });

  // Ensure component is mounted before rendering
  useEffect(() => {
    setMounted(true);
    
    const updateContainerSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    
    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  // Calculate initial position for a new pane (cascade effect)
  const getInitialPosition = useCallback((paneIndex: number) => {
    const baseX = 20 + (paneIndex % 10) * CASCADE_OFFSET;
    const baseY = 20 + (paneIndex % 10) * CASCADE_OFFSET;
    
    // Reset cascade if it goes too far
    if (baseX > containerSize.width - DEFAULT_PANE_WIDTH - 100) {
      cascadePosition.current.x = 20;
    }
    if (baseY > containerSize.height - DEFAULT_PANE_HEIGHT - 100) {
      cascadePosition.current.y = 20;
    }
    
    return { x: baseX, y: baseY };
  }, [containerSize]);

  // Convert grid layout to pixel position/size
  const getPixelPosition = useCallback((pane: any, index: number) => {
    const gridLayout = pane.gridLayout;
    
    // If we have pixel positions stored, use them
    if (gridLayout?.pixelX !== undefined && gridLayout?.pixelY !== undefined) {
      return {
        x: gridLayout.pixelX,
        y: gridLayout.pixelY,
        width: gridLayout.pixelWidth || DEFAULT_PANE_WIDTH,
        height: gridLayout.pixelHeight || DEFAULT_PANE_HEIGHT,
      };
    }
    
    // Otherwise, calculate initial position with cascade effect
    const pos = getInitialPosition(index);
    return {
      x: pos.x,
      y: pos.y,
      width: DEFAULT_PANE_WIDTH,
      height: DEFAULT_PANE_HEIGHT,
    };
  }, [getInitialPosition]);

  // Handle drag stop - save position
  const handleDragStop = useCallback((paneId: string, d: { x: number; y: number }) => {
    const pane = panes.find(p => p.id === paneId);
    if (pane) {
      updatePane(paneId, {
        gridLayout: {
          x: pane.gridLayout?.x ?? 0,
          y: pane.gridLayout?.y ?? 0,
          w: pane.gridLayout?.w ?? 6,
          h: pane.gridLayout?.h ?? 4,
          minW: pane.gridLayout?.minW,
          minH: pane.gridLayout?.minH,
          maxW: pane.gridLayout?.maxW,
          maxH: pane.gridLayout?.maxH,
          pixelWidth: pane.gridLayout?.pixelWidth,
          pixelHeight: pane.gridLayout?.pixelHeight,
          pixelX: d.x,
          pixelY: d.y,
        },
      });
    }
  }, [panes, updatePane]);

  // Handle resize stop - save size
  const handleResizeStop = useCallback((
    paneId: string,
    _direction: any,
    ref: HTMLElement,
    _delta: any,
    position: { x: number; y: number }
  ) => {
    const pane = panes.find(p => p.id === paneId);
    if (pane) {
      updatePane(paneId, {
        gridLayout: {
          x: pane.gridLayout?.x ?? 0,
          y: pane.gridLayout?.y ?? 0,
          w: pane.gridLayout?.w ?? 6,
          h: pane.gridLayout?.h ?? 4,
          minW: pane.gridLayout?.minW,
          minH: pane.gridLayout?.minH,
          maxW: pane.gridLayout?.maxW,
          maxH: pane.gridLayout?.maxH,
          pixelX: position.x,
          pixelY: position.y,
          pixelWidth: ref.offsetWidth,
          pixelHeight: ref.offsetHeight,
        },
      });
    }
  }, [panes, updatePane]);

  // Handle pane click - bring to front
  const handlePaneMouseDown = useCallback((paneId: string) => {
    bringPaneToFront(paneId);
  }, [bringPaneToFront]);

  if (!mounted) {
    return (
      <div className="pane-grid-empty">
        <div className="pane-grid-empty-content">
          <h2>GM Terminal</h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (panes.length === 0) {
    return (
      <div className="pane-grid-empty" ref={containerRef}>
        <div className="pane-grid-empty-content">
          <h2>GM Terminal</h2>
          <p>Start by typing a command in the CLI below</p>
          <p className="pane-grid-examples">
            Try <code>AAPL US G</code>, <code>BTCUSD G</code>, <code>HC BTCUSD QQQ</code>, <code>H</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="draggable-pane-grid-container" ref={containerRef}>
      {panes.map((pane, index) => {
        const zIndex = paneZIndices[pane.id] || index + 1;
        const position = getPixelPosition(pane, index);

        return (
          <Rnd
            key={pane.id}
            default={{
              x: position.x,
              y: position.y,
              width: position.width,
              height: position.height,
            }}
            position={{
              x: position.x,
              y: position.y,
            }}
            size={{
              width: position.width,
              height: position.height,
            }}
            minWidth={MIN_PANE_WIDTH}
            minHeight={MIN_PANE_HEIGHT}
            bounds="parent"
            dragHandleClassName="pane-header"
            onDragStart={() => handlePaneMouseDown(pane.id)}
            onDragStop={(_e, d) => handleDragStop(pane.id, d)}
            onResizeStart={() => handlePaneMouseDown(pane.id)}
            onResizeStop={(_e, direction, ref, delta, position) => 
              handleResizeStop(pane.id, direction, ref, delta, position)
            }
            onMouseDown={() => handlePaneMouseDown(pane.id)}
            style={{
              zIndex,
              position: 'absolute',
            }}
            className="rnd-pane-wrapper"
            enableResizing={{
              top: true,
              right: true,
              bottom: true,
              left: true,
              topRight: true,
              bottomRight: true,
              bottomLeft: true,
              topLeft: true,
            }}
          >
            <div 
              className="pane-grid-item"
              style={{ width: '100%', height: '100%' }}
            >
              <Pane pane={pane} />
            </div>
          </Rnd>
        );
      })}
    </div>
  );
}
