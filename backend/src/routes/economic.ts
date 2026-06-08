import { Router } from 'express';
import { logger } from '../utils/logger.js';
import {
  getEconomicCalendar,
  getEarningsCalendar,
  getTreasuryYields,
  getMacroIndicators,
  getFedMeetings,
  getFearGreedIndex,
} from '../services/economicData.js';

const router = Router();

// Get economic calendar
router.get('/calendar', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    logger.info('GET /economic/calendar');
    
    const events = await getEconomicCalendar(parseInt(days as string));
    res.json({ events });
  } catch (error: any) {
    logger.error('Get economic calendar error:', error);
    res.status(500).json({
      error: 'Failed to fetch economic calendar',
      message: error.message,
    });
  }
});

// Get earnings calendar
router.get('/earnings', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    logger.info('GET /economic/earnings');
    
    const earnings = await getEarningsCalendar(parseInt(days as string));
    res.json({ earnings });
  } catch (error: any) {
    logger.error('Get earnings calendar error:', error);
    res.status(500).json({
      error: 'Failed to fetch earnings calendar',
      message: error.message,
    });
  }
});

// Get Treasury yields
router.get('/treasury', async (req, res) => {
  try {
    logger.info('GET /economic/treasury');
    const yields = await getTreasuryYields();
    res.json({ yields });
  } catch (error: any) {
    logger.error('Get Treasury yields error:', error);
    res.status(500).json({
      error: 'Failed to fetch Treasury yields',
      message: error.message,
    });
  }
});

// Get macro indicators
router.get('/macro', async (req, res) => {
  try {
    logger.info('GET /economic/macro');
    const indicators = await getMacroIndicators();
    res.json({ indicators });
  } catch (error: any) {
    logger.error('Get macro indicators error:', error);
    res.status(500).json({
      error: 'Failed to fetch macro indicators',
      message: error.message,
    });
  }
});

// Get Fed meetings
router.get('/fed', async (req, res) => {
  try {
    logger.info('GET /economic/fed');
    const meetings = await getFedMeetings();
    res.json({ meetings });
  } catch (error: any) {
    logger.error('Get Fed meetings error:', error);
    res.status(500).json({
      error: 'Failed to fetch Fed meetings',
      message: error.message,
    });
  }
});

// Get Fear & Greed index
router.get('/fear-greed', async (req, res) => {
  try {
    logger.info('GET /economic/fear-greed');
    const data = await getFearGreedIndex();
    res.json(data);
  } catch (error: any) {
    logger.error('Get Fear & Greed error:', error);
    res.status(500).json({
      error: 'Failed to fetch Fear & Greed index',
      message: error.message,
    });
  }
});

// Get combined economic overview
router.get('/overview', async (req, res) => {
  try {
    logger.info('GET /economic/overview');
    
    const [calendar, earnings, yields, macro, fed, fearGreed] = await Promise.all([
      getEconomicCalendar(7),
      getEarningsCalendar(7),
      getTreasuryYields(),
      getMacroIndicators(),
      getFedMeetings(),
      getFearGreedIndex(),
    ]);

    res.json({
      calendar: calendar.slice(0, 10),
      earnings: earnings.slice(0, 10),
      yields,
      macro,
      fed: fed.slice(0, 3),
      fearGreed,
    });
  } catch (error: any) {
    logger.error('Get economic overview error:', error);
    res.status(500).json({
      error: 'Failed to fetch economic overview',
      message: error.message,
    });
  }
});

export { router as economicRoutes };

