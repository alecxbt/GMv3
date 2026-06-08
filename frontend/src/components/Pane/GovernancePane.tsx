import { useEffect, useState } from 'react';
import type { Pane } from '../../../shared/src/types';
import api from '../../services/api';

interface Proposal {
  id: string;
  title: string;
  description?: string;
  protocol: string;
  protocolLogo?: string;
  state: string;
  author: string;
  created: number;
  start: number;
  end: number;
  choices: string[];
  scores: number[];
  scoresTotal: number;
  voters: number;
  link?: string;
}

interface DAO {
  id: string;
  name: string;
  symbol?: string;
  network: string;
  members?: number;
  proposals: number;
  activeProposals: number;
  logo?: string;
}

interface GovernancePaneProps {
  pane: Pane;
}

export function GovernancePane({ pane }: GovernancePaneProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'ending' | 'daos'>('active');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [endingSoon, setEndingSoon] = useState<Proposal[]>([]);
  const [daos, setDAOs] = useState<DAO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDAO, setSelectedDAO] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (activeTab === 'active') {
          const response = selectedDAO
            ? await api.get(`/governance/dao/${selectedDAO}/proposals`, { params: { state: 'active' } })
            : await api.get('/governance/proposals/active', { params: { limit: 50 } });
          setProposals(response.data.proposals || []);
        } else if (activeTab === 'ending') {
          const response = await api.get('/governance/summary');
          setEndingSoon(response.data.endingSoon || []);
        } else if (activeTab === 'daos') {
          const response = searchQuery
            ? await api.get('/governance/search', { params: { q: searchQuery } })
            : await api.get('/governance/daos', { params: { limit: 30 } });
          setDAOs(response.data.daos || []);
        }
      } catch (err: any) {
        console.error('Failed to fetch governance data:', err);
        setError(err.response?.data?.error || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, [activeTab, selectedDAO, searchQuery]);

  const formatTimeRemaining = (endTime: number) => {
    const diff = endTime - Date.now();
    if (diff < 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    return 'Ending soon';
  };

  const getTimeColor = (endTime: number) => {
    const hoursLeft = (endTime - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft < 24) return 'var(--terminal-error)';
    if (hoursLeft < 72) return 'var(--terminal-warning)';
    return 'var(--terminal-success)';
  };

  const formatNumber = (num: number) => {
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '8px 16px',
    background: isActive ? 'var(--terminal-accent)' : 'transparent',
    border: '1px solid var(--terminal-border)',
    borderRadius: '4px',
    color: 'var(--terminal-text)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: isActive ? 'bold' : 'normal',
  });

  const ProposalCard = ({ proposal }: { proposal: Proposal }) => {
    const totalVotes = proposal.scoresTotal || proposal.scores.reduce((a, b) => a + b, 0);
    const leadingChoice = proposal.scores.indexOf(Math.max(...proposal.scores));
    const leadingPercent = totalVotes > 0 ? (proposal.scores[leadingChoice] / totalVotes) * 100 : 0;

    return (
      <div style={{
        padding: '16px',
        background: 'var(--terminal-bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--terminal-border)',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: 'var(--terminal-dim)', marginBottom: '4px' }}>
              {proposal.protocol}
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
              {proposal.title.length > 80 ? `${proposal.title.slice(0, 80)}...` : proposal.title}
            </div>
          </div>
          <div style={{
            padding: '4px 8px',
            background: getTimeColor(proposal.end),
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            color: 'white',
            whiteSpace: 'nowrap',
            marginLeft: '12px',
          }}>
            {formatTimeRemaining(proposal.end)}
          </div>
        </div>

        {/* Voting Progress */}
        {proposal.choices.length > 0 && proposal.scores.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
              <span>{proposal.choices[0] || 'Yes'}</span>
              <span>{proposal.choices[1] || 'No'}</span>
            </div>
            <div style={{ height: '8px', background: 'var(--terminal-border)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
              {proposal.choices.map((_, idx) => {
                const percent = totalVotes > 0 ? (proposal.scores[idx] / totalVotes) * 100 : 0;
                if (percent === 0) return null;
                return (
                  <div
                    key={idx}
                    style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: idx === 0 ? 'var(--terminal-success)' : idx === 1 ? 'var(--terminal-error)' : 'var(--terminal-accent)',
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--terminal-dim)' }}>
          <div>
            <span style={{ marginRight: '4px' }}>👥</span>
            {formatNumber(proposal.voters)} voters
          </div>
          <div>
            <span style={{ marginRight: '4px' }}>📊</span>
            {formatNumber(totalVotes)} votes
          </div>
          {leadingPercent > 0 && (
            <div>
              <span style={{ marginRight: '4px' }}>🏆</span>
              {proposal.choices[leadingChoice]}: {leadingPercent.toFixed(1)}%
            </div>
          )}
        </div>

        {/* Link */}
        {proposal.link && (
          <a
            href={proposal.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              marginTop: '8px',
              fontSize: '11px',
              color: 'var(--terminal-accent)',
              textDecoration: 'none',
            }}
          >
            View on Snapshot →
          </a>
        )}
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--terminal-text)' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid var(--terminal-border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => { setActiveTab('active'); setSelectedDAO(null); }} style={tabStyle(activeTab === 'active')}>🗳️ Active Votes</button>
        <button onClick={() => setActiveTab('ending')} style={tabStyle(activeTab === 'ending')}>⏰ Ending Soon</button>
        <button onClick={() => setActiveTab('daos')} style={tabStyle(activeTab === 'daos')}>🏛️ DAOs</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--terminal-dim)' }}>Loading...</div>}
        {error && <div style={{ padding: '12px', background: 'var(--terminal-error)', color: 'white', borderRadius: '4px' }}>{error}</div>}

        {activeTab === 'active' && !loading && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', margin: 0 }}>
                🗳️ {selectedDAO ? `${selectedDAO} Proposals` : 'Active Governance Proposals'}
              </h3>
              {selectedDAO && (
                <button
                  onClick={() => setSelectedDAO(null)}
                  style={{
                    padding: '4px 8px',
                    background: 'transparent',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '4px',
                    color: 'var(--terminal-text)',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  ← All Proposals
                </button>
              )}
            </div>
            {proposals.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--terminal-dim)', padding: '20px' }}>No active proposals</div>
            ) : (
              proposals.map(proposal => <ProposalCard key={proposal.id} proposal={proposal} />)
            )}
          </div>
        )}

        {activeTab === 'ending' && !loading && (
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '16px' }}>⏰ Proposals Ending Soon</h3>
            {endingSoon.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--terminal-dim)', padding: '20px' }}>No proposals ending soon</div>
            ) : (
              endingSoon.map(proposal => <ProposalCard key={proposal.id} proposal={proposal} />)
            )}
          </div>
        )}

        {activeTab === 'daos' && !loading && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Search DAOs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--terminal-bg-secondary)',
                  border: '1px solid var(--terminal-border)',
                  borderRadius: '4px',
                  color: 'var(--terminal-text)',
                  fontSize: '12px',
                }}
              />
            </div>
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>🏛️ Top DAOs</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {daos.map((dao, idx) => (
                <div
                  key={idx}
                  onClick={() => { setSelectedDAO(dao.id); setActiveTab('active'); }}
                  style={{
                    padding: '16px',
                    background: 'var(--terminal-bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--terminal-border)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--terminal-accent)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--terminal-border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    {dao.logo && (
                      <img
                        src={dao.logo.startsWith('ipfs://') ? `https://cloudflare-ipfs.com/ipfs/${dao.logo.slice(7)}` : dao.logo}
                        alt={dao.name}
                        style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                        onError={(e) => e.currentTarget.style.display = 'none'}
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{dao.name}</div>
                      {dao.symbol && <div style={{ fontSize: '10px', color: 'var(--terminal-dim)' }}>{dao.symbol}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: 'var(--terminal-dim)' }}>
                    <div>
                      <span style={{ color: dao.activeProposals > 0 ? 'var(--terminal-success)' : 'var(--terminal-dim)' }}>●</span>
                      {' '}{dao.activeProposals} active
                    </div>
                    <div>{formatNumber(dao.proposals)} total</div>
                  </div>
                  {dao.members && (
                    <div style={{ fontSize: '10px', color: 'var(--terminal-dim)', marginTop: '4px' }}>
                      {formatNumber(dao.members)} members
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

