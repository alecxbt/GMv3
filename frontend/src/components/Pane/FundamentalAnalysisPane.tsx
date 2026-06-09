import { useEffect, useState } from 'react';
import type { Pane } from '@shared/types';
import { marketDataApi } from '../../services/api';

interface FundamentalAnalysisPaneProps {
  pane: Pane;
}

interface FundamentalAnalysis {
  ticker: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  description?: string;
  valuation: {
    peRatio?: number;
    pegRatio?: number;
    pbRatio?: number;
    evToRevenue?: number;
    evToEbitda?: number;
    priceToSales?: number;
    priceToCashFlow?: number;
  };
  profitability: {
    roe?: number;
    roa?: number;
    roic?: number;
    profitMargin?: number;
    grossMargin?: number;
    operatingMargin?: number;
    ebitdaMargin?: number;
  };
  debt: {
    debtToEquity?: number;
    debtToAssets?: number;
    currentRatio?: number;
    quickRatio?: number;
    interestCoverage?: number;
  };
  growth: {
    revenueGrowth?: number;
    earningsGrowth?: number;
    epsGrowth?: number;
    bookValueGrowth?: number;
  };
  market: {
    marketCap?: number;
    enterpriseValue?: number;
    sharesOutstanding?: number;
    floatShares?: number;
    dividendYield?: number;
    payoutRatio?: number;
    beta?: number;
  };
  analystEstimates?: {
    targetPrice?: number;
    recommendation?: string;
    numberOfAnalysts?: number;
    earningsEstimate?: number;
    revenueEstimate?: number;
  };
}

export function FundamentalAnalysisPane({ pane }: FundamentalAnalysisPaneProps) {
  const [analysis, setAnalysis] = useState<FundamentalAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pane.ticker) {
      setLoading(false);
      return;
    }

    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await marketDataApi.getFundamentalAnalysis(
          pane.ticker!,
          pane.config?.countryCode
        );
        console.log('Fundamental analysis data received:', data);
        setAnalysis(data);
      } catch (err: any) {
        console.error('Error fetching fundamental analysis:', err);
        setError(err.message || 'Failed to load fundamental analysis');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [pane.ticker, pane.config?.countryCode]);

  const formatNumber = (value?: number, decimals: number = 2): string => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(decimals) + 'B';
    }
    if (value >= 1_000) {
      return (value / 1_000).toFixed(decimals) + 'M';
    }
    return value.toFixed(decimals);
  };

  const formatPercent = (value?: number): string => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return value.toFixed(2) + '%';
  };

  const formatRatio = (value?: number): string => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return value.toFixed(2);
  };

  if (loading) {
    return <div className="pane-loading">Loading fundamental analysis...</div>;
  }

  if (error) {
    return (
      <div className="pane-error" style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--terminal-error)', marginBottom: '8px' }}>{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="pane-error" style={{ padding: '20px', textAlign: 'center' }}>
        <p>No fundamental analysis data available for {pane.ticker}</p>
      </div>
    );
  }

  // Check if we have any data at all
  const hasAnyData = 
    analysis.companyName ||
    analysis.sector ||
    analysis.industry ||
    Object.values(analysis.valuation).some(v => v !== undefined) ||
    Object.values(analysis.profitability).some(v => v !== undefined) ||
    Object.values(analysis.debt).some(v => v !== undefined) ||
    Object.values(analysis.market).some(v => v !== undefined) ||
    analysis.analystEstimates;

  if (!hasAnyData) {
    return (
      <div className="pane-error" style={{ padding: '20px', textAlign: 'center' }}>
        <p>No fundamental analysis data available for {pane.ticker}</p>
        <p style={{ fontSize: '11px', color: 'var(--terminal-dim)', marginTop: '8px' }}>
          Try checking your API keys or the ticker symbol
        </p>
      </div>
    );
  }

  return (
    <div className="fundamental-analysis-pane" style={{ 
      height: '100%', 
      overflowY: 'auto',
      padding: '16px',
      fontSize: '12px',
    }}>
      {/* Company Overview */}
      {(analysis.companyName || analysis.sector || analysis.industry) && (
        <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--terminal-border)' }}>
          {analysis.companyName && (
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: 'var(--terminal-text)',
              marginBottom: '8px',
            }}>
              {analysis.companyName}
            </h2>
          )}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: 'var(--terminal-dim)' }}>
            {analysis.sector && (
              <div>
                <span style={{ fontWeight: 'bold' }}>Sector:</span> {analysis.sector}
              </div>
            )}
            {analysis.industry && (
              <div>
                <span style={{ fontWeight: 'bold' }}>Industry:</span> {analysis.industry}
              </div>
            )}
          </div>
          {analysis.description && (
            <p style={{ 
              marginTop: '12px', 
              color: 'var(--terminal-dim)', 
              fontSize: '11px',
              lineHeight: '1.5',
            }}>
              {analysis.description.substring(0, 300)}
              {analysis.description.length > 300 ? '...' : ''}
            </p>
          )}
        </div>
      )}

      {/* Valuation Ratios */}
      {Object.values(analysis.valuation).some(v => v !== undefined) && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: 'var(--terminal-text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--terminal-border)',
          }}>
            Valuation Ratios
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '12px',
          }}>
            {analysis.valuation.peRatio !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>P/E Ratio</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatRatio(analysis.valuation.peRatio)}
                </div>
              </div>
            )}
            {analysis.valuation.pegRatio !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>PEG Ratio</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatRatio(analysis.valuation.pegRatio)}
                </div>
              </div>
            )}
            {analysis.valuation.pbRatio !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>P/B Ratio</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatRatio(analysis.valuation.pbRatio)}
                </div>
              </div>
            )}
            {analysis.valuation.evToRevenue !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>EV/Revenue</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatRatio(analysis.valuation.evToRevenue)}
                </div>
              </div>
            )}
            {analysis.valuation.evToEbitda !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>EV/EBITDA</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatRatio(analysis.valuation.evToEbitda)}
                </div>
              </div>
            )}
            {analysis.valuation.priceToSales !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Price/Sales</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatRatio(analysis.valuation.priceToSales)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profitability Ratios */}
      {Object.values(analysis.profitability).some(v => v !== undefined) && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: 'var(--terminal-text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--terminal-border)',
          }}>
            Profitability Ratios
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '12px',
          }}>
            {analysis.profitability.roe !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>ROE</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatPercent(analysis.profitability.roe)}
                </div>
              </div>
            )}
            {analysis.profitability.roa !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>ROA</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatPercent(analysis.profitability.roa)}
                </div>
              </div>
            )}
            {analysis.profitability.profitMargin !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Profit Margin</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatPercent(analysis.profitability.profitMargin)}
                </div>
              </div>
            )}
            {analysis.profitability.grossMargin !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Gross Margin</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatPercent(analysis.profitability.grossMargin)}
                </div>
              </div>
            )}
            {analysis.profitability.operatingMargin !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Operating Margin</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatPercent(analysis.profitability.operatingMargin)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debt Ratios */}
      {Object.values(analysis.debt).some(v => v !== undefined) && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: 'var(--terminal-text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--terminal-border)',
          }}>
            Debt Ratios
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '12px',
          }}>
            {analysis.debt.debtToEquity !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Debt/Equity</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatRatio(analysis.debt.debtToEquity)}
                </div>
              </div>
            )}
            {analysis.debt.currentRatio !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Current Ratio</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatRatio(analysis.debt.currentRatio)}
                </div>
              </div>
            )}
            {analysis.debt.quickRatio !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Quick Ratio</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatRatio(analysis.debt.quickRatio)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Market Metrics */}
      {Object.values(analysis.market).some(v => v !== undefined) && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: 'var(--terminal-text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--terminal-border)',
          }}>
            Market Metrics
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '12px',
          }}>
            {analysis.market.marketCap !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Market Cap</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  ${formatNumber(analysis.market.marketCap)}
                </div>
              </div>
            )}
            {analysis.market.enterpriseValue !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Enterprise Value</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  ${formatNumber(analysis.market.enterpriseValue)}
                </div>
              </div>
            )}
            {analysis.market.sharesOutstanding !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Shares Outstanding</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatNumber(analysis.market.sharesOutstanding)}M
                </div>
              </div>
            )}
            {analysis.market.dividendYield !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Dividend Yield</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatPercent(analysis.market.dividendYield)}
                </div>
              </div>
            )}
            {analysis.market.beta !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Beta</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {formatRatio(analysis.market.beta)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analyst Estimates */}
      {analysis.analystEstimates && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: 'var(--terminal-text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--terminal-border)',
          }}>
            Analyst Estimates
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '12px',
          }}>
            {analysis.analystEstimates.targetPrice !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Target Price</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  ${formatRatio(analysis.analystEstimates.targetPrice)}
                </div>
              </div>
            )}
            {analysis.analystEstimates.recommendation && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Recommendation</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {analysis.analystEstimates.recommendation}
                </div>
              </div>
            )}
            {analysis.analystEstimates.numberOfAnalysts !== undefined && (
              <div style={{ padding: '8px', background: 'var(--terminal-bg-secondary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '4px' }}>Analysts</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--terminal-text)' }}>
                  {analysis.analystEstimates.numberOfAnalysts}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fallback message if no sections rendered */}
      {!hasAnyData && (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          color: 'var(--terminal-dim)',
        }}>
          <p>No fundamental analysis data available for {pane.ticker}</p>
          <p style={{ fontSize: '11px', marginTop: '8px' }}>
            The API may not have data for this ticker, or API keys may need to be configured.
          </p>
        </div>
      )}
    </div>
  );
}

