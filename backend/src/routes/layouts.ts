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

// Schema for validating layout data
const layoutSchema = z.object({
  name: z.string().min(1),
  panes: z.array(z.any()).optional(), // JSON structure for panes
  grid: z.object({
    cols: z.number().optional(),
    rowHeight: z.number().optional(),
    layouts: z.object({}).passthrough().optional(), // Store layouts object
  }).passthrough(),
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

// GET /api/layouts - Get all layouts for the authenticated user
router.get('/', authenticateToken, async (c) => {
  try {
    const userId = c.get('user').userId;
    const layouts = await prisma.layout.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return c.json(layouts);
  } catch (error: any) {
    console.error('Error fetching layouts:', error);
    return c.json({ error: 'Failed to fetch layouts' }, 500);
  }
});

// POST /api/layouts - Create a new layout for the authenticated user
router.post('/', authenticateToken, async (c) => {
  try {
    const userId = c.get('user').userId;
    const body = await c.req.parseBody();
    const validatedData = layoutSchema.parse(body);

    // Ensure a default layout doesn't overwrite if it already exists with that name
    const existingLayout = await prisma.layout.findFirst({
      where: { userId, name: validatedData.name },
    });
    if (existingLayout) {
      return c.json({ error: 'Layout with this name already exists' }, 409);
    }

    const newLayout = await prisma.layout.create({
      data: {
        userId,
        name: validatedData.name,
        panes: validatedData.panes,
        grid: validatedData.grid,
      },
    });
    return c.json(newLayout, 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    console.error('Error creating layout:', error);
    return c.json({ error: 'Failed to create layout' }, 500);
  }
});

// GET /api/layouts/:id - Get a specific layout by ID for the authenticated user
router.get('/:id', authenticateToken, async (c) => {
  try {
    const userId = c.get('user').userId;
    const { id } = c.req.param();

    const layout = await prisma.layout.findUnique({
      where: { id, userId },
    });

    if (!layout) {
      return c.json({ error: 'Layout not found' }, 404);
    }
    return c.json(layout);
  } catch (error: any) {
    console.error('Error fetching layout:', error);
    return c.json({ error: 'Failed to fetch layout' }, 500);
  }
});

// PUT /api/layouts/:id - Update a specific layout
// This route is protected by requirePro - layouts are a Pro feature
router.put('/:id', authenticateToken, requirePro, async (c) => {
  try {
    const userId = c.get('user').userId;
    const { id } = c.req.param();
    const body = await c.req.parseBody();
    const validatedData = layoutSchema.parse(body);

    // Check if layout belongs to the user
    const existingLayout = await prisma.layout.findUnique({ where: { id, userId } });
    if (!existingLayout) {
      return c.json({ error: 'Layout not found' }, 404);
    }

    // Prevent changing layout name to one that already exists for the user
    if (validatedData.name !== existingLayout.name) {
      const nameConflict = await prisma.layout.findFirst({
        where: { userId, name: validatedData.name, id: { not: id } },
      });
      if (nameConflict) {
        return c.json({ error: 'Layout with this name already exists' }, 409);
      }
    }

    const updatedLayout = await prisma.layout.update({
      where: { id },
      data: {
        name: validatedData.name,
        panes: validatedData.panes,
        grid: validatedData.grid,
      },
    });
    return c.json(updatedLayout);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    console.error('Error updating layout:', error);
    return c.json({ error: 'Failed to update layout' }, 500);
  }
});

// DELETE /api/layouts/:id - Delete a specific layout
// This route is protected by requirePro - layouts are a Pro feature
router.delete('/:id', authenticateToken, requirePro, async (c) => {
  try {
    const userId = c.get('user').userId;
    const { id } = c.req.param();

    // Check if layout belongs to the user
    const layoutToDelete = await prisma.layout.findUnique({ where: { id, userId } });
    if (!layoutToDelete) {
      return c.json({ error: 'Layout not found' }, 404);
    }

    await prisma.layout.delete({ where: { id } });
    return c.body(null, 204); // No content on successful deletion
  } catch (error: any) {
    console.error('Error deleting layout:', error);
    return c.json({ error: 'Failed to delete layout' }, 500);
  }
});

export { router as layoutRoutes };