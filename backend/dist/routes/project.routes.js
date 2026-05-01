"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const app_1 = require("../app");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const projectSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
});
// Get all projects the user is part of or owns
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.userId;
    try {
        const projects = yield app_1.prisma.project.findMany({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
}));
// Create project
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
        return;
    }
    try {
        const project = yield app_1.prisma.project.create({
            data: {
                title: parsed.data.title,
                description: parsed.data.description,
                ownerId: req.user.userId,
                members: {
                    create: { userId: req.user.userId }
                }
            },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                members: { include: { user: { select: { id: true, name: true, email: true } } } },
                _count: { select: { tasks: true } }
            }
        });
        res.status(201).json(project);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create project' });
    }
}));
// Get project by ID
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.userId;
    try {
        const project = yield app_1.prisma.project.findUnique({
            where: { id: req.params.id },
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch project' });
    }
}));
// Add member to project
router.post('/:id/members', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
    }
    try {
        const project = yield app_1.prisma.project.findUnique({ where: { id: req.params.id } });
        if (!project || project.ownerId !== req.user.userId) {
            res.status(403).json({ error: 'Only owner can add members' });
            return;
        }
        const userToAdd = yield app_1.prisma.user.findUnique({ where: { email } });
        if (!userToAdd) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        yield app_1.prisma.projectMember.create({
            data: {
                projectId: project.id,
                userId: userToAdd.id
            }
        });
        res.status(200).json({ message: 'Member added successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to add member' });
    }
}));
// Delete project
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const project = yield app_1.prisma.project.findUnique({ where: { id: req.params.id } });
        if (!project || project.ownerId !== req.user.userId) {
            res.status(403).json({ error: 'Only owner can delete project' });
            return;
        }
        yield app_1.prisma.project.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Project deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
}));
exports.default = router;
