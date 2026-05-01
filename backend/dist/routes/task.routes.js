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
const taskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    dueDate: zod_1.z.string().optional().nullable(),
    projectId: zod_1.z.string(),
    assigneeId: zod_1.z.string().optional().nullable(),
});
// Create task
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsed = taskSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
        return;
    }
    const userId = req.user.userId;
    const { projectId } = parsed.data;
    try {
        const project = yield app_1.prisma.project.findUnique({
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
        const task = yield app_1.prisma.task.create({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create task' });
    }
}));
// Update task
router.patch('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const taskId = req.params.id;
    const updateSchema = zod_1.z.object({
        title: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        status: zod_1.z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
        priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
        dueDate: zod_1.z.string().optional().nullable(),
        assigneeId: zod_1.z.string().optional().nullable(),
    });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
        return;
    }
    try {
        const task = yield app_1.prisma.task.findUnique({
            where: { id: taskId },
            include: { project: { include: { members: true } } }
        });
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        const userId = req.user.userId;
        const project = task.project;
        if (project.ownerId !== userId && !project.members.some(m => m.userId === userId)) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
        const updatedTask = yield app_1.prisma.task.update({
            where: { id: taskId },
            data: Object.assign(Object.assign({}, parsed.data), { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined }),
            include: { assignee: { select: { id: true, name: true, email: true, role: true } } }
        });
        res.json(updatedTask);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update task' });
    }
}));
// Delete task
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const task = yield app_1.prisma.task.findUnique({
            where: { id: req.params.id },
            include: { project: true }
        });
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        if (task.project.ownerId !== req.user.userId && req.user.role !== 'ADMIN') {
            res.status(403).json({ error: 'Only project owner or admin can delete tasks' });
            return;
        }
        yield app_1.prisma.task.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Task deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete task' });
    }
}));
exports.default = router;
