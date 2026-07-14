import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store/useStore';
import { CheckSquare, Plus, Trash2, ArrowRight, Clock, Users, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  dueDate: string;
}

const columns = [
  { id: 'todo', title: 'To Do', color: '#64748b' },
  { id: 'in-progress', title: 'In Progress', color: '#4F46E5' },
  { id: 'done', title: 'Done', color: '#10B981' },
];

const priorityColors: Record<string, string> = {
  high: 'bg-brand-danger/20 text-brand-danger',
  medium: 'bg-brand-warning/20 text-brand-warning',
  low: 'bg-brand-success/20 text-brand-success',
};

export default function Tasks() {
  const { restEndpoint, masterToken } = useStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [newTask, setNewTask] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  const headers = masterToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/tasks`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [restEndpoint]);

  const handleAddTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTask.trim()) {
      showToast('Task title cannot be empty', false);
      return;
    }
    setSaving(true);
    try {
      const task: Task = {
        id: Date.now().toString(),
        title: newTask.trim(),
        status: 'todo',
        priority: taskPriority as Task['priority'],
        assignee: 'Administrator',
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      };
      setTasks(prev => [task, ...prev]);
      setNewTask('');
      showToast('Task added', true);
    } catch (err: any) {
      showToast(err.message || 'Failed to add task', false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    showToast(`"${title}" removed`, true);
  };

  const handleCycleStatus = (id: string, currentStatus: string) => {
    const sequence = ['todo', 'in-progress', 'done'];
    const nextIdx = (sequence.indexOf(currentStatus) + 1) % 3;
    const nextStatus = sequence[nextIdx];
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus as Task['status'] } : t));
    const colTitle = columns.find(c => c.id === nextStatus)?.title || nextStatus;
    showToast(`Moved to ${colTitle}`, true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 md:pb-0">
      {toast && (
        <div className={cn("fixed top-20 right-6 z-50 px-4 py-2 rounded-xl border text-xs font-bold font-mono", toast.ok ? "bg-brand-success/10 text-brand-success border-brand-success/30" : "bg-brand-danger/10 text-brand-danger border-brand-danger/30")}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center">
            <CheckSquare className="w-8 h-8 mr-3 text-brand-primary" />
            Tasks
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">TASK MANAGEMENT & KANBAN BOARD</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchTasks} className="p-2.5 bg-brand-elevated border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-text">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <form onSubmit={handleAddTask} className="flex flex-wrap gap-2 items-center">
            <input type="text" placeholder="New task title..." value={newTask} onChange={e => setNewTask(e.target.value)}
              className="px-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-primary min-w-[200px]" />
            <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}
              className="px-3 py-2 bg-brand-surface border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-brand-primary text-white rounded-xl text-sm font-bold hover:bg-brand-primary/90 transition-colors shadow-glow-primary flex items-center gap-2 disabled:opacity-50">
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="bg-brand-surface border border-brand-border rounded-2xl p-4 animate-pulse space-y-3">
              <div className="h-6 bg-brand-elevated rounded w-24" />
              <div className="h-24 bg-brand-elevated rounded" />
              <div className="h-24 bg-brand-elevated rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <AlertCircle className="w-8 h-8 text-brand-danger mx-auto mb-3" />
          <p className="text-brand-text-muted font-mono text-sm">{error}</p>
          <button onClick={fetchTasks} className="mt-4 px-4 py-2 bg-brand-elevated border border-brand-border rounded-xl text-xs font-bold uppercase">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column, colIdx) => (
            <motion.div key={column.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + colIdx * 0.1 }}
              className="bg-brand-surface border border-brand-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-brand-text flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
                  {column.title}
                  <span className="text-brand-text-muted bg-brand-elevated px-2 py-0.5 rounded-lg text-xs font-mono">
                    {tasks.filter(t => t.status === column.id).length}
                  </span>
                </h2>
              </div>
              <div className="space-y-3 min-h-[300px]">
                {tasks.filter(task => task.status === column.id).map((task, idx) => (
                  <motion.div key={task.id} initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.3 + colIdx * 0.1 + idx * 0.06 }} whileHover={{ scale: 1.02, y: -2 }}
                    className="p-4 bg-brand-elevated rounded-xl border border-brand-border hover:border-brand-primary/30 transition-all cursor-pointer relative group">
                    <h3 className="text-sm font-bold text-brand-text mb-2 pr-6">{task.title}</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', priorityColors[task.priority])}>{task.priority}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-brand-text-muted font-mono mb-3">
                      <div className="flex items-center gap-1"><Users className="w-3 h-3" /><span>{task.assignee}</span></div>
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{task.dueDate}</span></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleCycleStatus(task.id, task.status)}
                        className="flex-1 px-2 py-1 text-xs font-bold text-brand-text bg-brand-surface rounded-lg hover:bg-brand-border/30 border border-brand-border transition-colors flex items-center justify-center gap-1">
                        <ArrowRight className="w-3 h-3 text-brand-primary" /> Progress
                      </button>
                      <button onClick={() => handleDelete(task.id, task.title)}
                        className="flex-1 px-2 py-1 text-xs font-bold text-brand-danger bg-brand-danger/10 rounded-lg hover:bg-brand-danger/20 transition-colors flex items-center justify-center gap-1">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
                {tasks.filter(task => task.status === column.id).length === 0 && (
                  <div className="h-24 flex items-center justify-center border border-dashed border-brand-border rounded-xl text-brand-text-muted text-xs font-mono uppercase tracking-wider">No Tasks</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
