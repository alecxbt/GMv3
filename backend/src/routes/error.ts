import { Router } from 'express';

const router = Router();

// Report error
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    // Log error (in production, send to Slack/monitoring service)
    console.error('[ERROR REPORT]', {
      message,
      timestamp: new Date().toISOString(),
      userAgent: req.get('user-agent'),
    });

    // TODO: Send to Slack webhook or error tracking service
    // await sendToSlack({ message, ... });

    res.json({ success: true, message: 'Error reported' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to report error' });
  }
});

export { router as errorRoutes };

