import { Hono } from 'hono';

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  Bindings: Env;
};

const router = new Hono<{ Bindings: Env }>();

// Report error
router.post('/', async (c) => {
  try {
    const body = await c.req.parseBody();
    const { message } = body as { message?: string };

    // Log error (in production, send to Slack/monitoring service)
    console.error('[ERROR REPORT]', {
      message,
      timestamp: new Date().toISOString(),
      userAgent: c.req.header('user-agent'),
    });

    // TODO: Send to Slack webhook or error tracking service
    // await sendToSlack({ message, ... });

    return c.json({ success: true, message: 'Error reported' });
  } catch (error) {
    return c.json({ error: 'Failed to report error' }, 500);
  }
});

export { router as errorRoutes };