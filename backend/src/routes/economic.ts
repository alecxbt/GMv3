import { Hono } from 'hono';
import { logger } from '../utils/logger.js';
import {
  getEconomicCalendar,
  getEarningsCalendar,
  getTreasuryYields,
  getMacroIndicators,
  getFedMeetings,
  getFearGreedIndex,
} from '../services/economicData.js';

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  Bindings: Env;
};

const router = new Hono<{ Bindings: Env }>();

// Get economic calendar
router.get('/calendar', async (c) => {
  try {
    const { days } = c.req.query();
    logger.info('GET /economic/calendar');
    
    const events = await getEconomicCalendar(parseInt(days as string) || 7);
    return c.json({ events });
  } catch (error: any) {
    logger.error('Get economic calendar error:', error);
    return c.json({
      error: 'Failed to fetch economic calendar',
      message: error.message,
    }, 500);
  }
});

// Get earnings calendar
router.get('/earnings', async (c) => {
  try {
    const { days } = c.req.query();
    logger.info('GET /economic/earnings');
    
    const earnings = await getEarningsCalendar(parseInt(days as string) || 7);
    return c.json({ earnings });
  } catch (error: any) {
    logger.error('Get earnings calendar error:', error);
    return c.json({
      error: 'Failed to fetch earnings calendar',
      message: error.message,
    }, 500);
  }
});

// Get Treasury yields
router.get('/treasury', async (c) => {
  try {
    logger.info('GET /economic/treasury');
    const yields = await getTreasuryYields();
    return c.json({ yields });
  } catch (error: any) {
    logger.error('Get Treasury yields error:', error);
    return c.json({
      error: 'Failed to fetch Treasury yields',
      message: error.message,
    }, 500);
  }
});

// Get macro indicators
router.get('/macro', async (c) => {
  try {
    logger.info('GET /economic/macro');
    const indicators = await getMacroIndicators();
    return c.json({ indicators });
  } catch (error: any) {
    logger.error('Get macro indicators error:', error);
    return c.json({
      error: 'Failed to fetch macro indicators',
      message: error.message,
    }, 500);
  }
});

// Get Fed meetings
router.get('/fed', async (c) => {
  try {
    logger.info('GET /economic/fed');
    const meetings = await getFedMeetings();
    return c.json({ meetings });
  } catch (error: any) {
    logger.error('Get Fed meetings error:', error);
    return c.json({
      error: 'Failed to fetch Fed meetings',
      message: error.message,
    }, 500);
  }
});

// Get Fear & Greed index
router.get('/fear-greed', async (c) => {
  try {
    logger.info('GET /economic/fear-greed');
    const data = await getFearGreedIndex();
    return c.json(data);
  } catch (error: any) {
    logger.error('Get Fear & Greed error:', error);
    return c.json({
      error: 'Failed to fetch Fear & Greed index',
      message: error.message,
    }, 500);
  }
});

// Get combined economic overview
router.get('/overview', async (c) => {
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

    return c.json({
      calendar: calendar.slice(0, 10),
      earnings: earnings.slice(0, 10),
      yields,
      macro,
      fed: fed.slice(0, 3),
      fearGreed,
    });
  } catch (error: any) {
    logger.error('Get economic overview error:', error);
    return c.json({
      error: 'Failed to fetch economic overview',
      message: error.message,
    }, 500);
  }
});

export { router as economicRoutes };