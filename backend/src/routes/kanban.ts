import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

// --- Schemas ---

const taskSchema = z.object({
  id: z.string(), // ID is required for updates and identifying tasks
  content: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  estimatedEffort: z.string().optional(),
  reason: z.string().optional(),
  columnId: z.string(),
  projectLabel: z.string().min(1).optional().default('General'),
});

const columnSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  taskIds: z.array(z.string()).min(1),
});

const kanbanStateSchema = z.object({
  columns: z.record(z.string(), columnSchema),
  columnOrder: z.array(z.string()).min(1),
  tasks: z.record(z.string(), taskSchema),
});

// --- Middleware ---
router.use(authenticateToken);

// --- Kanban Routes ---

// GET /api/kanban - Fetch the user's entire Kanban board
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    let kanbanBoard = await prisma.kanbanBoard.findUnique({
      where: { userId },
      include: {
        columns: { orderBy: { id: 'asc' } },
        tasks: true,
      },
    });

    if (!kanbanBoard) {
      const defaultBoard = await prisma.kanbanBoard.create({
        data: {
          userId,
          columns: {
            create: [
              { id: 'backlog', title: 'Backlog', taskIds: [] },
              { id: 'today', title: "Today's Focus", taskIds: [] },
              { id: 'in-progress', title: 'In Progress', taskIds: [] },
              { id: 'blocked', title: 'Blocked', taskIds: [] },
              { id: 'done', title: 'Done', taskIds: [] },
            ],
          },
          tasks: {
            create: [],
          },
          columnOrder: ['backlog', 'today', 'in-progress', 'blocked', 'done'],
        },
        include: {
          columns: true,
          tasks: true,
        },
      });
      kanbanBoard = defaultBoard;
    }

    const tasksById = kanbanBoard.tasks.reduce((acc, task) => {
      acc[task.id] = task;
      return acc;
    }, {} as Record<string, PrismaKanbanTask>);

    const organizedColumns = kanbanBoard.columns.map(col => ({
      ...col,
      taskIds: col.taskIds.filter(taskId => tasksById[taskId]),
    }));

    res.json({ ...kanbanBoard, columns: organizedColumns, tasks: tasksById });

  } catch (error: any) {
    console.error('Error fetching Kanban board:', error);
    res.status(500).json({ error: 'Failed to fetch Kanban board data' });
  }
});

// POST /api/kanban/tasks - Add a new task
router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validatedData = taskSchema.parse(req.body);

    const userBoard = await prisma.kanbanBoard.findUnique({
      where: { userId },
      include: { columns: true },
    });

    if (!userBoard) {
      return res.status(404).json({ error: 'Kanban board not found for user' });
    }

    const targetColumn = userBoard.columns.find(col => col.id === validatedData.columnId);
    if (!targetColumn) {
      return res.status(400).json({ error: `Column with ID '${validatedData.columnId}' not found.` });
    }

    const newTask = await prisma.kanbanTask.create({
      data: {
        id: uuidv4(),
        boardId: userBoard.id,
        content: validatedData.content,
        priority: validatedData.priority,
        estimatedEffort: validatedData.estimatedEffort,
        reason: validatedData.reason,
        columnId: validatedData.columnId,
        projectLabel: validatedData.projectLabel || 'General', // Default if not provided
      },
    });

    await prisma.kanbanColumn.update({
      where: { id: validatedData.columnId },
      data: {
        taskIds: { push: newTask.id },
      },
    });

    res.status(201).json(newTask);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error adding task:', error);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// PUT /api/kanban/tasks/:taskId - Update an existing task (including moving columns)
router.put('/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    // Allow updating specific fields, including columnId and projectLabel
    const validatedUpdates = z.object({
      content: z.string().min(1).optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      estimatedEffort: z.string().optional(),
      reason: z.string().optional(),
      columnId: z.string().optional(), // New column ID if moved
      projectLabel: z.string().min(1).optional(), // New project label
    }).parse(req.body);

    const userBoard = await prisma.kanbanBoard.findUnique({
      where: { userId },
      include: {
        columns: true,
        tasks: true,
      },
    });

    if (!userBoard) {
      return res.status(404).json({ error: 'Kanban board not found for user' });
    }

    const taskToUpdate = userBoard.tasks.find(task => task.id === taskId);
    if (!taskToUpdate) {
      return res.status(404).json({ error: 'Task not found' });
    }

    let newColumnId = taskToUpdate.columnId;
    let updatedTaskData: any = {};

    // Handle column change
    if (validatedUpdates.columnId && validatedUpdates.columnId !== taskToUpdate.columnId) {
      newColumnId = validatedUpdates.columnId;
      
      // Remove task from old column
      const oldColumn = userBoard.columns.find(col => col.id === taskToUpdate.columnId);
      if (oldColumn) {
        await prisma.kanbanColumn.update({
          where: { id: taskToUpdate.columnId },
          data: { taskIds: oldColumn.taskIds.filter(id => id !== taskId) },
        });
      }
      // Add task to new column
      const newColumn = userBoard.columns.find(col => col.id === newColumnId);
      if (!newColumn) {
        return res.status(400).json({ error: `Target column with ID '${newColumnId}' not found.` });
      }
      await prisma.kanbanColumn.update({
        where: { id: newColumnId },
        data: { taskIds: { push: taskId } },
      });
    }

    // Prepare data for task update, only including fields that were provided
    if (validatedUpdates.content !== undefined) updatedTaskData.content = validatedUpdates.content;
    if (validatedUpdates.priority !== undefined) updatedTaskData.priority = validatedUpdates.priority;
    if (validatedUpdates.estimatedEffort !== undefined) updatedTaskData.estimatedEffort = validatedUpdates.estimatedEffort;
    if (validatedUpdates.reason !== undefined) updatedTaskData.reason = validatedUpdates.reason;
    updatedTaskData.columnId = newColumnId; // Always update columnId
    if (validatedUpdates.projectLabel !== undefined) updatedTaskData.projectLabel = validatedUpdates.projectLabel;

    // If no fields were updated, return early to avoid unnecessary DB call
    if (Object.keys(updatedTaskData).length === 0) {
      return res.status(200).json(taskToUpdate); // Return original task if no updates
    }

    const updatedTask = await prisma.kanbanTask.update({
      where: { id: taskId },
      data: updatedTaskData,
    });

    res.json(updatedTask);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/kanban/tasks/:taskId - Delete a task
router.delete('/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params;

    const userBoard = await prisma.kanbanBoard.findUnique({
      where: { userId },
      include: {
        columns: true,
        tasks: true,
      },
    });

    if (!userBoard) {
      return res.status(404).json({ error: 'Kanban board not found for user' });
    }

    const taskToDelete = userBoard.tasks.find(task => task.id === taskId);
    if (!taskToDelete) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Remove task from its column's taskIds array
    const columnWithTask = userBoard.columns.find(col => col.taskIds.includes(taskId));
    if (columnWithTask) {
      await prisma.kanbanColumn.update({
        where: { id: columnWithTask.id },
        data: {
          taskIds: columnWithTask.taskIds.filter(id => id !== taskId),
        },
      });
    }

    await prisma.kanbanTask.delete({ where: { id: taskId } });

    res.status(204).send(); // No Content

  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// PUT /api/kanban - Save the entire Kanban board state (columns, tasks, order)
router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validatedKanbanData = kanbanStateSchema.parse(req.body);

    const userBoard = await prisma.kanbanBoard.findUnique({ where: { userId }, include: { columns: true, tasks: true } });
    if (!userBoard) {
      return res.status(404).json({ error: 'Kanban board not found for user' });
    }

    await prisma.$transaction(async (tx) => {
      // Update columns and their task order
      for (const column of Object.values(validatedKanbanData.columns)) {
        await tx.kanbanColumn.update({
          where: { id: column.id },
          data: { taskIds: column.taskIds },
        });
      }

      // Update the board's column order
      await tx.kanbanBoard.update({
        where: { id: userBoard.id },
        data: { columnOrder: validatedKanbanData.columnOrder },
      });

      // Update tasks - This is more complex as it involves potentially creating new tasks or updating existing ones.
      // For simplicity in this PUT, we'll assume task IDs are stable and we are updating existing tasks.
      // A more robust solution might involve comparing current tasks with new tasks to determine create/update/delete operations.
      for (const taskId in validatedKanbanData.tasks) {
        const taskData = validatedUpdates.tasks[taskId]; // Use validated task data
        if (taskData) {
           await tx.kanbanTask.update({
             where: { id: taskId },
             data: {
               content: taskData.content,
               priority: taskData.priority,
               estimatedEffort: taskData.estimatedEffort,
               reason: taskData.reason,
               columnId: taskData.columnId,
               projectLabel: taskData.projectLabel,
             },
           });
        }
      }
    });

    res.json({ message: 'Kanban board saved successfully' });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error saving Kanban board:', error);
    res.status(500).json({ error: 'Failed to save Kanban board' });
  }
});

export { router as kanbanRoutes };
