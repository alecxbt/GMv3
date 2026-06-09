import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

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

// --- Kanban Routes ---

// GET /api/kanban - Fetch the user's entire Kanban board
router.get('/', authenticateToken, async (c) => {
  try {
    const userId = c.get('user').userId;

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
    }, {} as Record<string, any>);

    const organizedColumns = kanbanBoard.columns.map(col => ({
      ...col,
      taskIds: col.taskIds.filter((taskId: string) => tasksById[taskId]),
    }));

    return c.json({ ...kanbanBoard, columns: organizedColumns, tasks: tasksById });

  } catch (error: any) {
    console.error('Error fetching Kanban board:', error);
    return c.json({ error: 'Failed to fetch Kanban board data' }, 500);
  }
});

// POST /api/kanban/tasks - Add a new task
router.post('/tasks', authenticateToken, async (c) => {
  try {
    const userId = c.get('user').userId;
    const body = await c.req.parseBody();
    const validatedData = taskSchema.parse(body);

    const userBoard = await prisma.kanbanBoard.findUnique({
      where: { userId },
      include: { columns: true },
    });

    if (!userBoard) {
      return c.json({ error: 'Kanban board not found for user' }, 404);
    }

    const targetColumn = userBoard.columns.find(col => col.id === validatedData.columnId);
    if (!targetColumn) {
      return c.json({ error: `Column with ID '${validatedData.columnId}' not found.` }, 400);
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

    return c.json(newTask, 201);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    console.error('Error adding task:', error);
    return c.json({ error: 'Failed to add task' }, 500);
  }
});

// PUT /api/kanban/tasks/:taskId - Update an existing task (including moving columns)
router.put('/tasks/:taskId', authenticateToken, async (c) => {
  try {
    const userId = c.get('user').userId;
    const { taskId } = c.req.param();
    const body = await c.req.parseBody();
    // Allow updating specific fields, including columnId and projectLabel
    const validatedUpdates = z.object({
      content: z.string().min(1).optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      estimatedEffort: z.string().optional(),
      reason: z.string().optional(),
      columnId: z.string().optional(), // New column ID if moved
      projectLabel: z.string().min(1).optional(), // New project label
    }).parse(body);

    const userBoard = await prisma.kanbanBoard.findUnique({
      where: { userId },
      include: {
        columns: true,
        tasks: true,
      },
    });

    if (!userBoard) {
      return c.json({ error: 'Kanban board not found for user' }, 404);
    }

    const taskToUpdate = userBoard.tasks.find(task => task.id === taskId);
    if (!taskToUpdate) {
      return c.json({ error: 'Task not found' }, 404);
    }

    let newColumnId = taskToUpdate.columnId;
    const updatedTaskData: any = {};

    // Handle column change
    if (validatedUpdates.columnId && validatedUpdates.columnId !== taskToUpdate.columnId) {
      newColumnId = validatedUpdates.columnId;
      
      // Remove task from old column
      const oldColumn = userBoard.columns.find(col => col.id === taskToUpdate.columnId);
      if (oldColumn) {
        await prisma.kanbanColumn.update({
          where: { id: taskToUpdate.columnId },
          data: { taskIds: oldColumn.taskIds.filter((id: string) => id !== taskId) },
        });
      }
      // Add task to new column
      const newColumn = userBoard.columns.find(col => col.id === newColumnId);
      if (!newColumn) {
        return c.json({ error: `Target column with ID '${newColumnId}' not found.` }, 400);
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
      return c.json(taskToUpdate); // Return original task if no updates
    }

    const updatedTask = await prisma.kanbanTask.update({
      where: { id: taskId },
      data: updatedTaskData,
    });

    return c.json(updatedTask);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    console.error('Error updating task:', error);
    return c.json({ error: 'Failed to update task' }, 500);
  }
});

// DELETE /api/kanban/tasks/:taskId - Delete a task
router.delete('/tasks/:taskId', authenticateToken, async (c) => {
  try {
    const userId = c.get('user').userId;
    const { taskId } = c.req.param();

    const userBoard = await prisma.kanbanBoard.findUnique({
      where: { userId },
      include: {
        columns: true,
        tasks: true,
      },
    });

    if (!userBoard) {
      return c.json({ error: 'Kanban board not found for user' }, 404);
    }

    const taskToDelete = userBoard.tasks.find(task => task.id === taskId);
    if (!taskToDelete) {
      return c.json({ error: 'Task not found' }, 404);
    }

    // Remove task from its column's taskIds array
    const columnWithTask = userBoard.columns.find(col => col.taskIds.includes(taskId));
    if (columnWithTask) {
      await prisma.kanbanColumn.update({
        where: { id: columnWithTask.id },
        data: {
          taskIds: columnWithTask.taskIds.filter((id: string) => id !== taskId),
        },
      });
    }

    await prisma.kanbanTask.delete({ where: { id: taskId } });

    return c.body(null, 204); // No Content

  } catch (error: any) {
    console.error('Error deleting task:', error);
    return c.json({ error: 'Failed to delete task' }, 500);
  }
});

// PUT /api/kanban - Save the entire Kanban board state (columns, tasks, order)
router.put('/', authenticateToken, async (c) => {
  try {
    const userId = c.get('user').userId;
    const body = await c.req.parseBody();
    const validatedKanbanData = kanbanStateSchema.parse(body);

    const userBoard = await prisma.kanbanBoard.findUnique({ where: { userId }, include: { columns: true, tasks: true } });
    if (!userBoard) {
      return c.json({ error: 'Kanban board not found for user' }, 404);
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

      // Update tasks
      for (const taskId in validatedKanbanData.tasks) {
        const taskData = validatedKanbanData.tasks[taskId];
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

    return c.json({ message: 'Kanban board saved successfully' });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    console.error('Error saving Kanban board:', error);
    return c.json({ error: 'Failed to save Kanban board' }, 500);
  }
});

export { router as kanbanRoutes };