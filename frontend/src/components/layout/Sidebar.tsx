import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Plus, LogOut, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '../../hooks/use-toast';

interface Project {
  id: string;
  title: string;
}

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );
  
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/projects', { title: newProjectTitle });
      setProjects([data, ...projects]);
      setIsDialogOpen(false);
      setNewProjectTitle('');
      toast({ title: 'Project created successfully' });
      navigate(`/projects/${data.id}`);
    } catch (e) {
      toast({ title: 'Failed to create project', variant: 'destructive' });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-64 glass-panel border-r flex flex-col h-full z-10">
      <div className="p-4 border-b border-border/40 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm flex-shrink-0">
          <img src="/logo.png" alt="Kanvaso Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="font-kanvaso font-bold text-2xl tracking-tight text-foreground/90">Kanvaso</h1>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <nav className="space-y-1 mb-8">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'
              }`
            }
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
        </nav>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Projects
          </h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus size={16} />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    placeholder="E.g. Website Redesign"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Create Project</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-1">
          {projects.map((p) => (
            <NavLink
              key={p.id}
              to={`/projects/${p.id}`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'
                }`
              }
            >
              <div className="w-2 h-2 rounded-full bg-primary/50" />
              {p.title}
            </NavLink>
          ))}
          {projects.length === 0 && (
            <p className="text-xs text-muted-foreground px-3">No projects yet.</p>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/20 text-primary">
                {user?.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">{user?.name}</span>
              <span className="text-xs text-muted-foreground mt-1">{user?.role}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
        </div>
        <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
          <LogOut size={18} className="mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
