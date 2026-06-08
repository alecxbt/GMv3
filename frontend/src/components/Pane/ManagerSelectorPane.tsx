import { useEffect, useState } from 'react';
import type { Pane } from '../../../shared/src/types';
import { marketDataApi } from '../../services/api';
import { useTerminalStore } from '../../store/useTerminalStore';

interface ManagerSelectorPaneProps {
  pane: Pane;
}

interface Manager {
  name: string;
  cik: string;
  displayName: string;
}

export function ManagerSelectorPane({ pane }: ManagerSelectorPaneProps) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addPane } = useTerminalStore();

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await marketDataApi.getAllManagers();
        setManagers(response.managers || []);
      } catch (err: any) {
        console.error('Error fetching managers:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load managers');
      } finally {
        setLoading(false);
      }
    };

    fetchManagers();
  }, []);

  const handleManagerSelect = async (displayName: string) => {
    if (!displayName) return;

    try {
      // Extract the primary name from display name (e.g., "Bill Ackman (Pershing Square Capital Management)" -> "Bill Ackman")
      const primaryName = displayName.split(' (')[0];
      
      // Create a new Form13F pane with the selected manager
      const newPane = {
        id: `form13f-${primaryName}-${Date.now()}`,
        type: 'form13f' as const,
        title: `${primaryName} 13-F`,
        ticker: primaryName,
        config: { managerName: primaryName },
      };

      addPane(newPane);
    } catch (err) {
      console.error('Error opening manager 13-F:', err);
    }
  };

  if (loading) {
    return <div className="pane-loading">Loading managers...</div>;
  }

  if (error) {
    return (
      <div className="pane-loading" style={{ color: 'var(--terminal-error)' }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div className="manager-selector-pane" style={{
      height: '100%',
      padding: '20px',
      color: 'var(--terminal-text)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: 'var(--terminal-text)',
        }}>
          Select Manager
        </h3>
        <p style={{
          fontSize: '12px',
          color: 'var(--terminal-dim)',
          marginBottom: '16px',
        }}>
          Choose a manager to view their 13-F filings and holdings
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <select
          value={selectedManager}
          onChange={(e) => setSelectedManager(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            background: 'var(--terminal-bg-secondary)',
            color: 'var(--terminal-text)',
            border: '1px solid var(--terminal-border)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <option value="">-- Select a Manager --</option>
          {managers.map((manager) => (
            <option key={manager.cik} value={manager.displayName}>
              {manager.displayName}
            </option>
          ))}
        </select>
      </div>

      {selectedManager && (
        <button
          onClick={() => handleManagerSelect(selectedManager)}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 'bold',
            background: 'var(--terminal-accent)',
            color: 'var(--terminal-bg)',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          View 13-F Filings →
        </button>
      )}

      <div style={{
        marginTop: '24px',
        paddingTop: '20px',
        borderTop: '1px solid var(--terminal-border)',
      }}>
        <div style={{
          fontSize: '12px',
          color: 'var(--terminal-dim)',
          marginBottom: '12px',
        }}>
          Tracked Managers ({managers.length}):
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '8px',
          fontSize: '11px',
        }}>
          {managers.map((manager) => (
            <div
              key={manager.cik}
              onClick={() => {
                setSelectedManager(manager.displayName);
                handleManagerSelect(manager.displayName);
              }}
              style={{
                padding: '8px 12px',
                background: 'var(--terminal-bg-secondary)',
                border: '1px solid var(--terminal-border)',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--terminal-accent)';
                e.currentTarget.style.color = 'var(--terminal-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--terminal-bg-secondary)';
                e.currentTarget.style.color = 'var(--terminal-text)';
              }}
            >
              {manager.displayName}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

