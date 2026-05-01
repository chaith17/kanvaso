import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import api from '../lib/api';
import Column from '../components/board/Column';
import TaskCard from '../components/board/TaskCard';
import { Button } from '../components/ui/button';
import { Plus, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee?: { name: string; id: string };
  dueDate?: string;
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'DONE', title: 'Done' },
];

export default function BoardView() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('MEDIUM');

  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setProject(data);
      setTasks(data.tasks);
    } catch (e) {
      toast({ title: 'Failed to load project', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const overColumnId = COLUMNS.find(c => c.id === overId)?.id || tasks.find(t => t.id === overId)?.status;
    if (!overColumnId || activeTask.status === overColumnId) return;

    // Optimistic update
    const previousTasks = [...tasks];
    setTasks(tasks.map(t => t.id === activeId ? { ...t, status: overColumnId as TaskStatus } : t));

    try {
      await api.patch(`/tasks/${activeId}`, { status: overColumnId });
    } catch (e) {
      setTasks(previousTasks); // Revert
      toast({ title: 'Failed to update task status', variant: 'destructive' });
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/tasks', {
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        projectId: id,
      });
      setTasks([data, ...tasks]);
      setIsTaskDialogOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('MEDIUM');
      toast({ title: 'Task created' });
    } catch (e) {
      toast({ title: 'Failed to create task', variant: 'destructive' });
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${id}/members`, { email: memberEmail });
      toast({ title: 'Member added successfully' });
      setMemberEmail('');
      setIsMemberDialogOpen(false);
      fetchProject();
    } catch (e: any) {
      toast({ title: e.response?.data?.error || 'Failed to add member', variant: 'destructive' });
    }
  };

  if (!project) return <div className="p-8">Loading project...</div>;

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="p-6 border-b border-border/40 glass-panel flex items-center justify-between z-10 m-4 rounded-2xl mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{project.description || 'No description provided.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-4">
            <div className="h-8 w-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-bold text-primary" title={project.owner.name}>
              {project.owner.name.charAt(0)}
            </div>
            {project.members.map((m: any) => (
              <div key={m.id} className="h-8 w-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-xs font-bold" title={m.user.name}>
                {m.user.name.charAt(0)}
              </div>
            ))}
          </div>

          <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Users size={16} className="mr-2" /> Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={memberEmail} onChange={e => setMemberEmail(e.target.value)} placeholder="user@example.com" required />
                </div>
                <Button type="submit" className="w-full">Send Invite</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus size={16} className="mr-2" /> New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newTaskPriority} onValueChange={(v: Priority) => setNewTaskPriority(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-6 h-full min-w-max">
            {COLUMNS.map(col => (
              <Column key={col.id} column={col} tasks={tasks.filter(t => t.status === col.id)} />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
