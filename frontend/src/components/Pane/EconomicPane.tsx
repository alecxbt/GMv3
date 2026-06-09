import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { Pane } from '@shared/types';
import api from '../../services/api';

interface EconomicEvent {
  id: string;
  date: number;
  event: string;
  country: string;
  impact: 'high' | 'medium' | 'low';
  actual?: string;
  forecast?: string;
  previous?: string;
  category: string;
}

interface EarningsEvent {
  symbol: string;
  company: string;
  date: number;
  time: string;
  epsEstimate?: number;
  epsActual?: number;
}

interface TreasuryYield {
  maturity: string;
  yield: number;
  change: number;
}

interface FedMeeting {
  date: number;
  type: string;
  currentRate?: number;
}

interface FearGreed {
  value: number;
  classification: string;
  history: { value: number; timestamp: number; classification: string }[];
}

interface EconomicPaneProps {
  pane: Pane;
}

export function EconomicPane({ pane }: EconomicPaneProps) {
  // Determine initial tab from pane config
  const getInitialTab = () => {
    const configTab = pane.config?.tab;
    if (configTab === 'feargreed') return 'feargreed';
    if (configTab === 'earnings') return 'earnings';
    if (configTab === 'treasury') return 'treasury';
    if (configTab === 'fed') return 'fed';
    if (configTab === 'calendar') return 'calendar';
    return 'overview';
  };
  
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'earnings' | 'treasury' | 'fed' | 'feargreed'>(getInitialTab);
  const [calendar, setCalendar] = useState<EconomicEvent[]>([]);
  const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
  const [yields, setYields] = useState<TreasuryYield[]>([]);
  const [fedMeetings, setFedMeetings] = useState<FedMeeting[]>([]);
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (activeTab === 'overview') {
          const [calRes, earRes, yieldRes, fedRes, fgRes] = await Promise.all([
            api.get('/economic/calendar', { params: { days: 7 } }),
            api.get('/economic/earnings', { params: { days: 7 } }),
            api.get('/economic/treasury'),
            api.get('/economic/fed'),
            api.get('/economic/fear-greed'),
          ]);
          setCalendar(calRes.data.events?.slice(0, 5) || []);
          setEarnings(earRes.data.earnings?.slice(0, 5) || []);
          setYields(yieldRes.data.yields || []);
          setFedMeetings(fedRes.data.meetings?.slice(0, 3) || []);
          setFearGreed(fgRes.data);
        } else if (activeTab === 'calendar') {
          const response = await api.get('/economic/calendar', { params: { days: 30 } });
          setCalendar(response.data.events || []);
        } else if (activeTab === 'earnings') {
          const response = await api.get('/economic/earnings', { params: { days: 14 } });
          setEarnings(response.data.earnings || []);
        } else if (activeTab === 'treasury') {
          const response = await api.get('/economic/treasury');
          setYields(response.data.yields || []);
        } else if (activeTab === 'fed') {
          const response = await api.get('/economic/fed');
          setFedMeetings(response.data.meetings || []);
        } else if (activeTab === 'feargreed') {
          const response = await api.get('/economic/fear-greed');
          setFearGreed(response.data);
        }
      } catch (err: any) {
        console.error('Failed to fetch economic data:', err);
        setError(err.response?.data?.error || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, activeTab === 'feargreed' ? 60000 : 300000); // 1 min for F&G, 5 min for others
    return () => clearInterval(interval);
  }, [activeTab]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'var(--terminal-error)';
      case 'medium': return 'var(--terminal-warning)';
      default: return 'var(--terminal-dim)';
    }
  };

  const getFearGreedColor = (value: number) => {
    if (value <= 25) return '#FF4136'; // Extreme Fear
    if (value <= 45) return '#FF851B'; // Fear
    if (value <= 55) return '#FFDC00'; // Neutral
    if (value <= 75) return '#2ECC40'; // Greed
    return '#01FF70'; // Extreme Greed
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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--terminal-text)' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid var(--terminal-border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('overview')} style={tabStyle(activeTab === 'overview')}>📊 Overview</button>
        <button onClick={() => setActiveTab('feargreed')} style={tabStyle(activeTab === 'feargreed')}>😱 Fear & Greed</button>
        <button onClick={() => setActiveTab('calendar')} style={tabStyle(activeTab === 'calendar')}>📅 Economic</button>
        <button onClick={() => setActiveTab('earnings')} style={tabStyle(activeTab === 'earnings')}>💼 Earnings</button>
        <button onClick={() => setActiveTab('treasury')} style={tabStyle(activeTab === 'treasury')}>📈 Yields</button>
        <button onClick={() => setActiveTab('fed')} style={tabStyle(activeTab === 'fed')}>🏛️ Fed</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--terminal-dim)' }}>Loading...</div>}
        {error && <div style={{ padding: '12px', background: 'var(--terminal-error)', color: 'white', borderRadius: '4px' }}>{error}</div>}

        {activeTab === 'overview' && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Fear & Greed Index */}
            {fearGreed && (
              <div style={{ padding: '16px', background: 'var(--terminal-bg-secondary)', borderRadius: '8px', border: '1px solid var(--terminal-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--terminal-dim)', marginBottom: '8px' }}>Crypto Fear & Greed Index</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: `conic-gradient(${getFearGreedColor(fearGreed.value)} ${fearGreed.value}%, var(--terminal-border) 0)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'var(--terminal-bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{fearGreed.value}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: getFearGreedColor(fearGreed.value) }}>
                      {fearGreed.classification}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginTop: '4px' }}>
                      Updated: {new Date(fearGreed.history[0]?.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {fearGreed.history.length > 5 && (
                  <ResponsiveContainer width="100%" height={60}>
                    <AreaChart data={fearGreed.history.slice(0, 14).reverse()}>
                      <Area type="monotone" dataKey="value" stroke={getFearGreedColor(fearGreed.value)} fill={getFearGreedColor(fearGreed.value)} fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* Yield Curve */}
            {yields.length > 0 && (
              <div style={{ padding: '16px', background: 'var(--terminal-bg-secondary)', borderRadius: '8px', border: '1px solid var(--terminal-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--terminal-dim)', marginBottom: '8px' }}>Treasury Yield Curve</div>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={yields}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" />
                    <XAxis dataKey="maturity" stroke="var(--terminal-text)" tick={{ fill: 'var(--terminal-text)', fontSize: 9 }} />
                    <YAxis domain={['auto', 'auto']} stroke="var(--terminal-text)" tick={{ fill: 'var(--terminal-text)', fontSize: 9 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={{ background: 'var(--terminal-bg)', border: '1px solid var(--terminal-border)' }} formatter={(v: number) => `${v.toFixed(2)}%`} />
                    <Line type="monotone" dataKey="yield" stroke="var(--terminal-accent)" strokeWidth={2} dot={{ fill: 'var(--terminal-accent)', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Upcoming Events */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'var(--terminal-bg-secondary)', borderRadius: '8px', border: '1px solid var(--terminal-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--terminal-dim)', marginBottom: '8px' }}>📅 Economic Events</div>
                {calendar.slice(0, 4).map((event, idx) => (
                  <div key={idx} style={{ padding: '6px 0', borderBottom: idx < 3 ? '1px solid var(--terminal-border)' : 'none', fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold' }}>{event.event}</span>
                      <span style={{ color: getImpactColor(event.impact), fontWeight: 'bold' }}>●</span>
                    </div>
                    <div style={{ color: 'var(--terminal-dim)', fontSize: '10px' }}>
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '12px', background: 'var(--terminal-bg-secondary)', borderRadius: '8px', border: '1px solid var(--terminal-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--terminal-dim)', marginBottom: '8px' }}>💼 Earnings This Week</div>
                {earnings.slice(0, 4).map((earning, idx) => (
                  <div key={idx} style={{ padding: '6px 0', borderBottom: idx < 3 ? '1px solid var(--terminal-border)' : 'none', fontSize: '11px' }}>
                    <div style={{ fontWeight: 'bold' }}>{earning.symbol}</div>
                    <div style={{ color: 'var(--terminal-dim)', fontSize: '10px' }}>
                      {new Date(earning.date).toLocaleDateString()} {earning.time === 'bmo' ? '(Pre-Market)' : earning.time === 'amc' ? '(After Hours)' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && !loading && (
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>📅 Economic Calendar</h3>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Event</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Impact</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Forecast</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Previous</th>
                </tr>
              </thead>
              <tbody>
                {calendar.map((event, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                    <td style={{ padding: '8px', color: 'var(--terminal-dim)' }}>{new Date(event.date).toLocaleDateString()}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{event.event}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{ color: getImpactColor(event.impact), fontWeight: 'bold' }}>
                        {event.impact === 'high' ? '🔴' : event.impact === 'medium' ? '🟡' : '🟢'}
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{event.forecast || '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{event.previous || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'earnings' && !loading && (
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>💼 Earnings Calendar</h3>
            {earnings.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--terminal-dim)', padding: '20px' }}>No upcoming earnings</div>
            ) : (
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Symbol</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Time</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>EPS Est.</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>EPS Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((earning, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{earning.symbol}</td>
                      <td style={{ padding: '8px' }}>{new Date(earning.date).toLocaleDateString()}</td>
                      <td style={{ padding: '8px' }}>
                        {earning.time === 'bmo' ? '🌅 Pre-Market' : earning.time === 'amc' ? '🌙 After Hours' : '📊'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{earning.epsEstimate?.toFixed(2) || '-'}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{earning.epsActual?.toFixed(2) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'treasury' && !loading && (
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>📈 Treasury Yields</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={yields}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" />
                <XAxis dataKey="maturity" stroke="var(--terminal-text)" tick={{ fill: 'var(--terminal-text)', fontSize: 10 }} />
                <YAxis domain={['auto', 'auto']} stroke="var(--terminal-text)" tick={{ fill: 'var(--terminal-text)', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: 'var(--terminal-bg)', border: '1px solid var(--terminal-border)' }} formatter={(v: number) => `${v.toFixed(2)}%`} />
                <Line type="monotone" dataKey="yield" stroke="var(--terminal-accent)" strokeWidth={2} dot={{ fill: 'var(--terminal-accent)', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginTop: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Maturity</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Yield</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {yields.map((y, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{y.maturity}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{y.yield.toFixed(2)}%</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: y.change >= 0 ? 'var(--terminal-success)' : 'var(--terminal-error)' }}>
                      {y.change >= 0 ? '+' : ''}{y.change.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'fed' && !loading && (
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>🏛️ Federal Reserve</h3>

            <h4 style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--terminal-dim)' }}>Upcoming FOMC Meetings</h4>
            {fedMeetings.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--terminal-dim)', padding: '20px' }}>No upcoming meetings</div>
            ) : (
              fedMeetings.map((meeting, idx) => {
                const daysUntil = Math.ceil((meeting.date - Date.now()) / (24 * 60 * 60 * 1000));
                return (
                  <div key={idx} style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: 'var(--terminal-bg-secondary)',
                    borderRadius: '4px',
                    border: '1px solid var(--terminal-border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{meeting.type}</div>
                        <div style={{ fontSize: '11px', color: 'var(--terminal-dim)' }}>
                          {new Date(meeting.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 8px',
                        background: daysUntil <= 7 ? 'var(--terminal-error)' : 'var(--terminal-accent)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                      }}>
                        {daysUntil} days
                      </div>
                    </div>
                    {meeting.currentRate && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--terminal-dim)' }}>
                        Current Rate: {meeting.currentRate}%
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'feargreed' && !loading && (
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '16px' }}>😱 Crypto Fear & Greed Index</h3>
            
            {fearGreed && (
              <>
                {/* Main Gauge */}
                <div style={{ 
                  padding: '24px', 
                  background: 'var(--terminal-bg-secondary)', 
                  borderRadius: '12px', 
                  border: '1px solid var(--terminal-border)',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    width: '160px',
                    height: '160px',
                    borderRadius: '50%',
                    background: `conic-gradient(
                      #FF4136 0% 25%, 
                      #FF851B 25% 45%, 
                      #FFDC00 45% 55%, 
                      #2ECC40 55% 75%, 
                      #01FF70 75% 100%
                    )`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                    position: 'relative',
                  }}>
                    <div style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      background: 'var(--terminal-bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                    }}>
                      <div style={{ fontSize: '48px', fontWeight: 'bold', color: getFearGreedColor(fearGreed.value) }}>
                        {fearGreed.value}
                      </div>
                    </div>
                    {/* Needle indicator */}
                    <div style={{
                      position: 'absolute',
                      width: '4px',
                      height: '70px',
                      background: 'white',
                      borderRadius: '2px',
                      transformOrigin: 'bottom center',
                      transform: `rotate(${(fearGreed.value / 100) * 360 - 90}deg)`,
                      top: '10px',
                      boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                    }} />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: getFearGreedColor(fearGreed.value), marginBottom: '4px' }}>
                    {fearGreed.classification}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--terminal-dim)' }}>
                    Last updated: {new Date(fearGreed.history[0]?.timestamp).toLocaleDateString('en-US', { 
                      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Scale Legend */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '12px 16px', 
                  background: 'var(--terminal-bg-secondary)', 
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '11px',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#FF4136', fontWeight: 'bold' }}>0-25</div>
                    <div style={{ color: 'var(--terminal-dim)' }}>Extreme Fear</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#FF851B', fontWeight: 'bold' }}>26-45</div>
                    <div style={{ color: 'var(--terminal-dim)' }}>Fear</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#FFDC00', fontWeight: 'bold' }}>46-55</div>
                    <div style={{ color: 'var(--terminal-dim)' }}>Neutral</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#2ECC40', fontWeight: 'bold' }}>56-75</div>
                    <div style={{ color: 'var(--terminal-dim)' }}>Greed</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#01FF70', fontWeight: 'bold' }}>76-100</div>
                    <div style={{ color: 'var(--terminal-dim)' }}>Extreme Greed</div>
                  </div>
                </div>

                {/* Historical Chart */}
                {fearGreed.history.length > 5 && (
                  <div style={{ 
                    padding: '16px', 
                    background: 'var(--terminal-bg-secondary)', 
                    borderRadius: '8px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--terminal-dim)', marginBottom: '12px' }}>30-Day History</div>
                    <ResponsiveContainer width="100%" height={150}>
                      <AreaChart data={fearGreed.history.slice(0, 30).reverse()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" />
                        <XAxis 
                          dataKey="timestamp" 
                          stroke="var(--terminal-text)" 
                          tick={{ fill: 'var(--terminal-text)', fontSize: 9 }}
                          tickFormatter={(ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          stroke="var(--terminal-text)" 
                          tick={{ fill: 'var(--terminal-text)', fontSize: 9 }}
                        />
                        <Tooltip 
                          contentStyle={{ background: 'var(--terminal-bg)', border: '1px solid var(--terminal-border)' }}
                          labelFormatter={(ts) => new Date(ts).toLocaleDateString()}
                          formatter={(v: number) => [v, 'Fear & Greed']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke={getFearGreedColor(fearGreed.value)} 
                          fill={getFearGreedColor(fearGreed.value)} 
                          fillOpacity={0.3} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Recent Values Table */}
                <div style={{ 
                  padding: '12px', 
                  background: 'var(--terminal-bg-secondary)', 
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--terminal-dim)', marginBottom: '8px' }}>Recent Values</div>
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                        <th style={{ padding: '6px', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '6px', textAlign: 'center' }}>Value</th>
                        <th style={{ padding: '6px', textAlign: 'right' }}>Classification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fearGreed.history.slice(0, 7).map((h, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                          <td style={{ padding: '6px', color: 'var(--terminal-dim)' }}>
                            {new Date(h.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold', color: getFearGreedColor(h.value) }}>
                            {h.value}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'right', color: getFearGreedColor(h.value) }}>
                            {h.classification}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

