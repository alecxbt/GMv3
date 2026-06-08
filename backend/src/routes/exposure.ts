import { Router } from 'express';
import type { Exposure } from '../../../shared/src/types';

const router = Router();

// Get ETF/fund exposures
router.get('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;

    // Mock exposure data - replace with ETFdb/Yahoo Finance API
    const mockExposures: Exposure[] = [
      {
        sector: 'Technology',
        weight: 28.5,
        topHoldings: [
          { ticker: 'MSFT', weight: 6.2 },
          { ticker: 'AAPL', weight: 5.8 },
          { ticker: 'NVDA', weight: 4.1 },
        ],
      },
      {
        sector: 'Financial',
        weight: 13.2,
        topHoldings: [
          { ticker: 'JPM', weight: 2.1 },
          { ticker: 'BAC', weight: 1.8 },
          { ticker: 'WFC', weight: 1.5 },
        ],
      },
      {
        sector: 'Healthcare',
        weight: 12.8,
        topHoldings: [
          { ticker: 'JNJ', weight: 2.3 },
          { ticker: 'UNH', weight: 2.0 },
          { ticker: 'PFE', weight: 1.5 },
        ],
      },
      {
        sector: 'Consumer Discretionary',
        weight: 10.5,
        topHoldings: [
          { ticker: 'AMZN', weight: 3.2 },
          { ticker: 'TSLA', weight: 2.8 },
          { ticker: 'HD', weight: 1.4 },
        ],
      },
    ];

    res.json({ ticker, exposures: mockExposures, totalHoldings: 3500 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exposures' });
  }
});

export { router as exposureRoutes };

