import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../pages/BoardView';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock, GripVertical } from 'lucide-react';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
}

const priorityColors = {
  LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  MEDIUM: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  HIGH: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function TaskCard({ task }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-50 border-2 border-primary rounded-lg h-[120px] bg-background"
      />
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="glass-card cursor-default group relative overflow-hidden"
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/20 backdrop-blur-sm cursor-grab active:cursor-grabbing z-10 hover:bg-background/40"
      >
        <GripVertical size={14} className="text-muted-foreground" />
      </div>
      <CardHeader className="p-3 pb-0 pl-7 space-y-0">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-sm font-medium leading-tight">{task.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2 pl-7 flex flex-col gap-3">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex gap-2">
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority]}`}>
              {task.priority}
            </Badge>
          </div>
          {task.dueDate && (
            <div className="flex items-center text-xs text-muted-foreground gap-1 bg-muted px-1.5 py-0.5 rounded">
              <Clock size={12} />
              {format(new Date(task.dueDate), 'MMM d')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
