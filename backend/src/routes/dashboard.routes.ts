import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../app';

const router = Router();
router.use(authenticate);

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  try {
    const tasks = await prisma.task.findMany({
      where: {
        project: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } }
          ]
        }
      },
      include: { assignee: true }
    });

    const totalTasks = tasks.length;
    const tasksByStatus = {
      TODO: tasks.filter(t => t.status === 'TODO').length,
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      DONE: tasks.filter(t => t.status === 'DONE').length,
    };

    const overdueTasks = tasks.filter(
      t => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < new Date()
    ).length;

    res.json({
      totalTasks,
      tasksByStatus,
      overdueTasks,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
