import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '../../pages/BoardView';
import TaskCard from './TaskCard';

interface ColumnProps {
  column: { id: TaskStatus; title: string };
  tasks: Task[];
}

export default function Column({ column, tasks }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex flex-col glass-panel rounded-2xl w-[320px] max-h-full border border-white/20 dark:border-white/10 shadow-lg">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-background/20 backdrop-blur-md rounded-t-2xl">
        <h3 className="font-semibold text-sm tracking-wide text-foreground/90">{column.title}</h3>
        <span className="bg-background/80 text-xs font-medium px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm border border-white/20">
          {tasks.length}
        </span>
      </div>
      
      <div
        ref={setNodeRef}
        className={`flex-1 p-3 overflow-y-auto space-y-3 transition-colors ${
          isOver ? 'bg-primary/10' : ''
        }`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="h-full min-h-[100px] border-2 border-dashed border-foreground/10 rounded-xl flex items-center justify-center text-sm text-foreground/40 font-medium">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}
