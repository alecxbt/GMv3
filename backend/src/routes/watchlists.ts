import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, requirePro } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Schema for validating watchlist data
const watchlistSchema = z.object({
  name: z.string().min(1),
  symbols: z.array(z.string().min(1)).min(1), // Array of symbols, must have at least one
});

// Middleware to ensure user is authenticated for watchlist operations
router.use(authenticateToken);

// GET /api/watchlists - Get all watchlists for the authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const watchlists = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(watchlists);
  } catch (error: any) {
    console.error('Error fetching watchlists:', error);
    res.status(500).json({ error: 'Failed to fetch watchlists' });
  }
});

// POST /api/watchlists - Create a new watchlist for the authenticated user
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validatedData = watchlistSchema.parse(req.body);

    // Check if a watchlist with the same name already exists for this user
    const existingWatchlist = await prisma.watchlist.findFirst({
      where: { userId, name: validatedData.name },
    });
    if (existingWatchlist) {
      return res.status(409).json({ error: 'Watchlist with this name already exists' });
    }

    const newWatchlist = await prisma.watchlist.create({
      data: {
        userId,
        name: validatedData.name,
        symbols: validatedData.symbols,
      },
    });
    res.status(201).json(newWatchlist);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating watchlist:', error);
    res.status(500).json({ error: 'Failed to create watchlist' });
  }
});

// GET /api/watchlists/:id - Get a specific watchlist by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const watchlist = await prisma.watchlist.findUnique({
      where: { id, userId },
    });

    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }
    res.json(watchlist);
  } catch (error: any) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// PUT /api/watchlists/:id - Update a specific watchlist
// This route is protected by requirePro - watchlists are a Pro feature
router.put('/:id', requirePro, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const validatedData = watchlistSchema.parse(req.body);

    // Check if watchlist belongs to the user
    const existingWatchlist = await prisma.watchlist.findUnique({ where: { id, userId } });
    if (!existingWatchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    // Prevent changing name to one that already exists for the user
    if (validatedData.name !== existingWatchlist.name) {
      const nameConflict = await prisma.watchlist.findFirst({
        where: { userId, name: validatedData.name, id: { not: id } },
      });
      if (nameConflict) {
        return res.status(409).json({ error: 'Watchlist with this name already exists' });
      }
    }

    const updatedWatchlist = await prisma.watchlist.update({
      where: { id },
      data: {
        name: validatedData.name,
        symbols: validatedData.symbols,
      },
    });
    res.json(updatedWatchlist);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating watchlist:', error);
    res.status(500).json({ error: 'Failed to update watchlist' });
  }
});

// DELETE /api/watchlists/:id - Delete a specific watchlist
// This route is protected by requirePro - watchlists are a Pro feature
router.delete('/:id', requirePro, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Check if watchlist belongs to the user
    const watchlistToDelete = await prisma.watchlist.findUnique({ where: { id, userId } });
    if (!watchlistToDelete) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    await prisma.watchlist.delete({ where: { id } });
    res.status(204).send(); // No content on successful deletion
  } catch (error: any) {
    console.error('Error deleting watchlist:', error);
    res.status(500).json({ error: 'Failed to delete watchlist' });
  }
});

export { router as watchlistRoutes };