import { useState } from 'react';
import { useTerminalStore } from '../../store/useTerminalStore';
import type { Pane } from '../../../shared/src/types';

interface PaneLinkMenuProps {
  pane: Pane;
  onClose: () => void;
}

export function PaneLinkMenu({ pane, onClose }: PaneLinkMenuProps) {
  const { panes, linkPanes, updatePane } = useTerminalStore();
  const [selectedPanes, setSelectedPanes] = useState<string[]>([]);

  const togglePane = (paneId: string) => {
    setSelectedPanes((prev) =>
      prev.includes(paneId)
        ? prev.filter((id) => id !== paneId)
        : [...prev, paneId]
    );
  };

  const handleLink = () => {
    if (pane.ticker && selectedPanes.length > 0) {
      linkPanes([pane.id, ...selectedPanes], pane.ticker);
      // Update linked panes to sync ticker
      selectedPanes.forEach((id) => {
        const targetPane = panes.find((p) => p.id === id);
        if (targetPane && pane.ticker) {
          updatePane(id, {
            ticker: pane.ticker,
            countryCode: pane.config?.countryCode,
            linkedTickers: [...(targetPane.linkedTickers || []), pane.ticker],
          });
        }
      });
      onClose();
    }
  };

  const linkablePanes = panes.filter((p) => p.id !== pane.id && (p.type === 'chart' || p.type === 'quote' || p.type === 'news'));

  if (linkablePanes.length === 0) {
    return (
      <div className="pane-link-menu">
        <div className="pane-link-menu-header">Link Panes</div>
        <div className="pane-link-menu-empty">No linkable panes available</div>
        <button className="pane-link-menu-close" onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <div className="pane-link-menu">
      <div className="pane-link-menu-header">Link Panes by Ticker</div>
      <div className="pane-link-menu-list">
        {linkablePanes.map((p) => (
          <label key={p.id} className="pane-link-menu-item">
            <input
              type="checkbox"
              checked={selectedPanes.includes(p.id)}
              onChange={() => togglePane(p.id)}
            />
            <span>{p.title}</span>
          </label>
        ))}
      </div>
      <div className="pane-link-menu-actions">
        <button className="pane-link-menu-btn" onClick={handleLink} disabled={selectedPanes.length === 0}>
          Link Selected
        </button>
        <button className="pane-link-menu-btn" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

