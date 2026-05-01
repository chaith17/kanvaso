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

const projectSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

// Get all projects the user is part of or owns
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { tasks: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create project
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    return;
  }

  try {
    const project = await prisma.project.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        ownerId: req.user!.userId,
        members: {
          create: { userId: req.user!.userId }
        }
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { tasks: true } }
      }
    });
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get project by ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        tasks: { 
          include: { assignee: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check if user has access
    if (project.ownerId !== userId && !project.members.some(m => m.userId === userId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Add member to project
router.post('/:id/members', async (req: AuthRequest, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id as string } });
    if (!project || project.ownerId !== req.user!.userId) {
      res.status(403).json({ error: 'Only owner can add members' });
      return;
    }

    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: userToAdd.id
      }
    });

    res.status(200).json({ message: 'Member added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Delete project
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id as string } });
    if (!project || project.ownerId !== req.user!.userId) {
      res.status(403).json({ error: 'Only owner can delete project' });
      return;
    }

    await prisma.project.delete({ where: { id: req.params.id as string } });
    res.status(200).json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
