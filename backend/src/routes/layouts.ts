import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, requirePro } from '../middleware/auth';

const router = Router();
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

// Middleware to ensure user is authenticated for layout operations
router.use(authenticateToken);

// GET /api/layouts - Get all layouts for the authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const layouts = await prisma.layout.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(layouts);
  } catch (error: any) {
    console.error('Error fetching layouts:', error);
    res.status(500).json({ error: 'Failed to fetch layouts' });
  }
});

// POST /api/layouts - Create a new layout for the authenticated user
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validatedData = layoutSchema.parse(req.body);

    // Ensure a default layout doesn't overwrite if it already exists with that name
    const existingLayout = await prisma.layout.findFirst({
      where: { userId, name: validatedData.name },
    });
    if (existingLayout) {
      return res.status(409).json({ error: 'Layout with this name already exists' });
    }

    const newLayout = await prisma.layout.create({
      data: {
        userId,
        name: validatedData.name,
        panes: validatedData.panes,
        grid: validatedData.grid,
      },
    });
    res.status(201).json(newLayout);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating layout:', error);
    res.status(500).json({ error: 'Failed to create layout' });
  }
});

// GET /api/layouts/:id - Get a specific layout by ID for the authenticated user
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const layout = await prisma.layout.findUnique({
      where: { id, userId },
    });

    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }
    res.json(layout);
  } catch (error: any) {
    console.error('Error fetching layout:', error);
    res.status(500).json({ error: 'Failed to fetch layout' });
  }
});

// PUT /api/layouts/:id - Update a specific layout
// This route is protected by requirePro - layouts are a Pro feature
router.put('/:id', requirePro, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const validatedData = layoutSchema.parse(req.body);

    // Check if layout belongs to the user
    const existingLayout = await prisma.layout.findUnique({ where: { id, userId } });
    if (!existingLayout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Prevent changing layout name to one that already exists for the user
    if (validatedData.name !== existingLayout.name) {
      const nameConflict = await prisma.layout.findFirst({
        where: { userId, name: validatedData.name, id: { not: id } },
      });
      if (nameConflict) {
        return res.status(409).json({ error: 'Layout with this name already exists' });
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
    res.json(updatedLayout);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating layout:', error);
    res.status(500).json({ error: 'Failed to update layout' });
  }
});

// DELETE /api/layouts/:id - Delete a specific layout
// This route is protected by requirePro - layouts are a Pro feature
router.delete('/:id', requirePro, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Check if layout belongs to the user
    const layoutToDelete = await prisma.layout.findUnique({ where: { id, userId } });
    if (!layoutToDelete) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    await prisma.layout.delete({ where: { id } });
    res.status(204).send(); // No content on successful deletion
  } catch (error: any) {
    console.error('Error deleting layout:', error);
    res.status(500).json({ error: 'Failed to delete layout' });
  }
});

export { router as layoutRoutes };