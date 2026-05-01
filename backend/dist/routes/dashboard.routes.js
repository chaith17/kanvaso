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
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.userId;
    try {
        const tasks = yield app_1.prisma.task.findMany({
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
        const overdueTasks = tasks.filter(t => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < new Date()).length;
        res.json({
            totalTasks,
            tasksByStatus,
            overdueTasks,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
}));
exports.default = router;
