import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

type User = {
  userId: string;
  email: string;
};

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  Bindings: Env;
  Variables: {
    user: User;
  };
};

const router = new Hono<{ Bindings: Env; Variables: { user: User } }>();
const prisma = new PrismaClient();

// Schema for validating watchlist data
const watchlistSchema = z.object({
  name: z.string().min(1),
  symbols: z.array(z.string().min(1)).min(1), // Array of symbols, must have at least one
});

// Auth middleware
const authenticateToken = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return c.json({ error: 'Access token required' }, 401);
  }

  try {
    const env = c.env;
    const jwt = await import('jsonwebtoken');
    const payload = jwt.verify(
      token,
      env.JWT_SECRET || 'your-secret-key'
    ) as { userId: string; email: string };

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }

    c.user = {
      userId: payload.userId,
      email: payload.email,
    };

    return next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return c.json({ error: 'Token expired' }, 401);
    }
    return c.json({ error: 'Invalid token' }, 403);
  }
};

// Pro feature check middleware
const requirePro = async (c: any, next: any) => {
  if (!c.user) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  // TODO: Check user subscription status
  // For now, we'll implement this later with Stripe
  return next();
};

// GET /api/watchlists - Get all watchlists for the authenticated user
router.get('/', authenticateToken, async (c) => {
  try {
    const userId = c.get('user').userId;
    const watchlists = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return c.json(watchlists);
  } catch (error: any) {
    console.error('Error fetching watchlists:', error);
    return c.json({ error: 'Failed to fetch watchlists' }, 500);
  }
});

// POST /api/watchlists - Create a new watchlist for the authenticated user
router.post('/', authenticateToken, async (c) => {
  try {
    const userId = c.get('user').userId;
    const body = await c.req.parseBody();
    const validatedData = watchlistSchema.parse(body);

    // Check if a watchlist with the same name already exists for this user
    const existingWatchlist = await prisma.watchlist.findFirst({
      where: { userId, name: validatedData.name },
    });
    if (existingWatchlist) {
      return c.json({ error: 'Watchlist with this name already exists' }, 409);
    }

    const newWatchlist = await prisma.watchlist.create({
      data: {
        userId,
        name: validatedData.name,
        symbols: validatedData.symbols,
      },
    });
    return c.json(newWatchlist, 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    console.error('Error creating watchlist:', error);
    return c.json({ error: 'Failed to create watchlist' }, 500);
  }
});

// GET /api/watchlists/:id - Get a specific watchlist by ID
router.get('/:id', authenticateToken, async (c) => {
  try {
    const userId = c.get('user').userId;
    const { id } = c.req.param();

    const watchlist = await prisma.watchlist.findUnique({
      where: { id, userId },
    });

    if (!watchlist) {
      return c.json({ error: 'Watchlist not found' }, 404);
    }
    return c.json(watchlist);
  } catch (error: any) {
    console.error('Error fetching watchlist:', error);
    return c.json({ error: 'Failed to fetch watchlist' }, 500);
  }
});

// PUT /api/watchlists/:id - Update a specific watchlist
// This route is protected by requirePro - watchlists are a Pro feature
router.put('/:id', authenticateToken, requirePro, async (c) => {
  try {
    const userId = c.get('user').userId;
    const { id } = c.req.param();
    const body = await c.req.parseBody();
    const validatedData = watchlistSchema.parse(body);

    // Check if watchlist belongs to the user
    const existingWatchlist = await prisma.watchlist.findUnique({ where: { id, userId } });
    if (!existingWatchlist) {
      return c.json({ error: 'Watchlist not found' }, 404);
    }

    // Prevent changing name to one that already exists for the user
    if (validatedData.name !== existingWatchlist.name) {
      const nameConflict = await prisma.watchlist.findFirst({
        where: { userId, name: validatedData.name, id: { not: id } },
      });
      if (nameConflict) {
        return c.json({ error: 'Watchlist with this name already exists' }, 409);
      }
    }

    const updatedWatchlist = await prisma.watchlist.update({
      where: { id },
      data: {
        name: validatedData.name,
        symbols: validatedData.symbols,
      },
    });
    return c.json(updatedWatchlist);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    console.error('Error updating watchlist:', error);
    return c.json({ error: 'Failed to update watchlist' }, 500);
  }
});

// DELETE /api/watchlists/:id - Delete a specific watchlist
// This route is protected by requirePro - watchlists are a Pro feature
router.delete('/:id', authenticateToken, requirePro, async (c) => {
  try {
    const userId = c.get('user').userId;
    const { id } = c.req.param();

    // Check if watchlist belongs to the user
    const watchlistToDelete = await prisma.watchlist.findUnique({ where: { id, userId } });
    if (!watchlistToDelete) {
      return c.json({ error: 'Watchlist not found' }, 404);
    }

    await prisma.watchlist.delete({ where: { id } });
    return c.body(null, 204); // No content on successful deletion
  } catch (error: any) {
    console.error('Error deleting watchlist:', error);
    return c.json({ error: 'Failed to delete watchlist' }, 500);
  }
});

export { router as watchlistRoutes };