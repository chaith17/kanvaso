import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../app';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().optional().nullable(),
  projectId: z.string(),
  assigneeId: z.string().optional().nullable(),
});

// Create task
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    return;
  }

  const userId = req.user!.userId;
  const { projectId } = parsed.data;

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.ownerId !== userId && !project.members.some(m => m.userId === userId)) {
      res.status(403).json({ error: 'Access denied to this project' });
      return;
    }

    const task = await prisma.task.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status || 'TODO',
        priority: parsed.data.priority || 'MEDIUM',
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        projectId,
        assigneeId: parsed.data.assigneeId,
      },
      include: { assignee: { select: { id: true, name: true, email: true, role: true } } }
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const taskId = req.params.id;
  const updateSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    dueDate: z.string().optional().nullable(),
    assigneeId: z.string().optional().nullable(),
  });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    return;
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId as string },
      include: { project: { include: { members: true } } }
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const userId = req.user!.userId;
    const project = task.project;

    if (project.ownerId !== userId && !project.members.some(m => m.userId === userId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId as string },
      data: {
        ...parsed.data,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      },
      include: { assignee: { select: { id: true, name: true, email: true, role: true } } }
    });

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id as string },
      include: { project: true }
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (task.project.ownerId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only project owner or admin can delete tasks' });
      return;
    }

    await prisma.task.delete({ where: { id: req.params.id as string } });
    res.status(200).json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
