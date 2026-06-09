import React, { useEffect, useState } from 'react';
import type { Pane } from '@shared/types';
import { marketDataApi } from '../../services/api';

interface FinancialStatement {
  period: string;
  periodType: 'quarterly' | 'annual';
  incomeStatement?: IncomeStatement;
  balanceSheet?: BalanceSheet;
  cashFlow?: CashFlow;
}

interface IncomeStatement {
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  interestExpense: number;
  incomeBeforeTax: number;
  incomeTaxExpense: number;
  netIncome: number;
  eps: number;
  sharesOutstanding: number;
}

interface BalanceSheet {
  cashAndCashEquivalents: number;
  shortTermInvestments: number;
  accountsReceivable: number;
  inventory: number;
  currentAssets: number;
  propertyPlantEquipment: number;
  longTermInvestments: number;
  totalAssets: number;
  accountsPayable: number;
  shortTermDebt: number;
  currentLiabilities: number;
  longTermDebt: number;
  totalLiabilities: number;
  commonStock: number;
  retainedEarnings: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
}

interface CashFlow {
  netIncome: number;
  depreciation: number;
  changesInWorkingCapital: number;
  operatingCashFlow: number;
  capitalExpenditures: number;
  investments: number;
  investingCashFlow: number;
  debtIssuance: number;
  dividendsPaid: number;
  financingCashFlow: number;
  freeCashFlow: number;
  netChangeInCash: number;
}

interface FinancialsPaneProps {
  pane: Pane;
}

type StatementType = 'income' | 'balance' | 'cashflow';

export function FinancialsPane({ pane }: FinancialsPaneProps) {
  const [statements, setStatements] = useState<FinancialStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatement, setActiveStatement] = useState<StatementType>('income');
  const [periodType, setPeriodType] = useState<'quarterly' | 'annual'>('quarterly');

  useEffect(() => {
    if (!pane.ticker) return;

    const fetchFinancials = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await marketDataApi.getFinancialStatements(
          pane.ticker!,
          pane.config?.countryCode,
          periodType
        );
        setStatements(data.statements || []);
      } catch (err: any) {
        console.error('Error fetching financial statements:', err);
        setError(err.message || 'Failed to load financial statements.');
      } finally {
        setLoading(false);
      }
    };

    fetchFinancials();
  }, [pane.ticker, pane.config?.countryCode, periodType]);

  const formatNumber = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) return '-';
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
  };

  const formatChange = (current: number | undefined, previous: number | undefined): string => {
    if (!current || !previous || previous === 0) return '-';
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  if (loading) {
    return <div className="pane-loading">Loading financial statements...</div>;
  }

  if (error) {
    return <div className="pane-error">{error}</div>;
  }

  if (statements.length === 0) {
    return <div className="pane-empty">No financial data available for {pane.ticker}.</div>;
  }

  return (
    <div className="financials-pane">
      <div className="financials-controls">
        <div className="financials-tabs">
          <button
            className={`financials-tab ${activeStatement === 'income' ? 'active' : ''}`}
            onClick={() => setActiveStatement('income')}
          >
            Income Statement
          </button>
          <button
            className={`financials-tab ${activeStatement === 'balance' ? 'active' : ''}`}
            onClick={() => setActiveStatement('balance')}
          >
            Balance Sheet
          </button>
          <button
            className={`financials-tab ${activeStatement === 'cashflow' ? 'active' : ''}`}
            onClick={() => setActiveStatement('cashflow')}
          >
            Cash Flow
          </button>
        </div>
        <div className="financials-period-toggle">
          <button
            className={`period-btn ${periodType === 'quarterly' ? 'active' : ''}`}
            onClick={() => setPeriodType('quarterly')}
          >
            QoQ
          </button>
          <button
            className={`period-btn ${periodType === 'annual' ? 'active' : ''}`}
            onClick={() => setPeriodType('annual')}
          >
            Annual
          </button>
        </div>
      </div>

      <div className="financials-content">
        <div className="financials-table-container">
          <table className="financials-table">
            <thead>
              <tr>
                <th className="financials-label-col">(in millions)</th>
                {statements.map((stmt, idx) => (
                  <th key={idx} className="financials-period-col">
                    <div>{stmt.period}</div>
                    {idx > 0 && (
                      <div className="financials-change">
                        {activeStatement === 'income' && stmt.incomeStatement && statements[idx - 1]?.incomeStatement
                          ? formatChange(stmt.incomeStatement.revenue, statements[idx - 1].incomeStatement?.revenue)
                          : activeStatement === 'balance' && stmt.balanceSheet && statements[idx - 1]?.balanceSheet
                          ? formatChange(stmt.balanceSheet.totalAssets, statements[idx - 1].balanceSheet?.totalAssets)
                          : activeStatement === 'cashflow' && stmt.cashFlow && statements[idx - 1]?.cashFlow
                          ? formatChange(stmt.cashFlow.operatingCashFlow, statements[idx - 1].cashFlow?.operatingCashFlow)
                          : ''}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeStatement === 'income' && statements[0]?.incomeStatement && (
                <>
                  <tr>
                    <td className="financials-label">Revenue</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.incomeStatement?.revenue)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Cost of Revenue</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.incomeStatement?.costOfRevenue)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-subtotal">
                    <td className="financials-label">Gross Profit</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.incomeStatement?.grossProfit)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Operating Expenses</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.incomeStatement?.operatingExpenses)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-subtotal">
                    <td className="financials-label">Operating Income</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.incomeStatement?.operatingIncome)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Interest Expense</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.incomeStatement?.interestExpense)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Income Before Tax</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.incomeStatement?.incomeBeforeTax)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Income Tax Expense</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.incomeStatement?.incomeTaxExpense)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-total">
                    <td className="financials-label">Net Income</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.incomeStatement?.netIncome)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">EPS</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {stmt.incomeStatement?.eps?.toFixed(2) || '-'}
                      </td>
                    ))}
                  </tr>
                </>
              )}

              {activeStatement === 'balance' && statements[0]?.balanceSheet && (
                <>
                  <tr>
                    <td className="financials-label">Cash & Cash Equivalents</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.cashAndCashEquivalents)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Short-Term Investments</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.shortTermInvestments)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Accounts Receivable</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.accountsReceivable)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Inventory</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.inventory)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-subtotal">
                    <td className="financials-label">Current Assets</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.currentAssets)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Property, Plant & Equipment</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.propertyPlantEquipment)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Long-Term Investments</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.longTermInvestments)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-total">
                    <td className="financials-label">Total Assets</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.totalAssets)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-section-break">
                    <td colSpan={statements.length + 1}></td>
                  </tr>
                  <tr>
                    <td className="financials-label">Accounts Payable</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.accountsPayable)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Short-Term Debt</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.shortTermDebt)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-subtotal">
                    <td className="financials-label">Current Liabilities</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.currentLiabilities)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Long-Term Debt</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.longTermDebt)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-subtotal">
                    <td className="financials-label">Total Liabilities</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.totalLiabilities)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Common Stock</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.commonStock)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Retained Earnings</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.retainedEarnings)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-total">
                    <td className="financials-label">Total Equity</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.totalEquity)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-total">
                    <td className="financials-label">Total Liabilities & Equity</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.balanceSheet?.totalLiabilitiesAndEquity)}
                      </td>
                    ))}
                  </tr>
                </>
              )}

              {activeStatement === 'cashflow' && statements[0]?.cashFlow && (
                <>
                  <tr>
                    <td className="financials-label">Net Income</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.cashFlow?.netIncome)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Depreciation</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.cashFlow?.depreciation)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Changes in Working Capital</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.cashFlow?.changesInWorkingCapital)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-total">
                    <td className="financials-label">Operating Cash Flow</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.cashFlow?.operatingCashFlow)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-section-break">
                    <td colSpan={statements.length + 1}></td>
                  </tr>
                  <tr>
                    <td className="financials-label">Capital Expenditures</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.cashFlow?.capitalExpenditures)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Investments</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.cashFlow?.investments)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-total">
                    <td className="financials-label">Investing Cash Flow</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.cashFlow?.investingCashFlow)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-section-break">
                    <td colSpan={statements.length + 1}></td>
                  </tr>
                  <tr>
                    <td className="financials-label">Debt Issuance</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.cashFlow?.debtIssuance)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="financials-label">Dividends Paid</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.cashFlow?.dividendsPaid)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-total">
                    <td className="financials-label">Financing Cash Flow</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.cashFlow?.financingCashFlow)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-section-break">
                    <td colSpan={statements.length + 1}></td>
                  </tr>
                  <tr className="financials-total">
                    <td className="financials-label">Free Cash Flow</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.cashFlow?.freeCashFlow)}
                      </td>
                    ))}
                  </tr>
                  <tr className="financials-total">
                    <td className="financials-label">Net Change in Cash</td>
                    {statements.map((stmt, idx) => (
                      <td key={idx} className="financials-value">
                        {formatNumber(stmt.cashFlow?.netChangeInCash)}
                      </td>
                    ))}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

