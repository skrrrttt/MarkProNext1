'use client';

import { useState } from 'react';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { useAuth } from '@/lib/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Search, Wrench, Clock, CheckCircle, AlertTriangle, Calendar, Truck, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const taskTypeConfig: Record<string, { label: string; color: string; icon: any }> = {
  maintenance: { label: 'Maintenance', color: '#3b82f6', icon: Wrench },
  repair: { label: 'Repair', color: '#ef4444', icon: AlertTriangle },
  inspection: { label: 'Inspection', color: '#8b5cf6', icon: CheckCircle },
  other: { label: 'Other', color: '#64748b', icon: Clock },
};

export default function FieldTasksPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const { user } = useAuth();
  const supabase = createClient();

  const { data: tasks, mutate: mutateTasks } = useSupabaseQuery('my-shop-tasks', async (supabase) => {
    console.log('=== SHOP TASKS DEBUG ===');
    console.log('User ID:', user?.id);
    console.log('User object:', user);

    if (!user?.id) {
      console.error('No user ID available - user might not be authenticated');
      return [];
    }

    const { data, error: queryError } = await supabase
      .from('shop_tasks')
      .select(`
        *,
        equipment!left(id, name, type),
        assigned_user:user_profiles!assigned_to!left(id, full_name)
      `)
      .or(`assigned_to.eq.${user.id},assigned_to.is.null`)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (queryError) {
      console.error('Shop tasks query error:', queryError);
      console.error('Error details:', JSON.stringify(queryError, null, 2));
    } else {
      console.log('Shop tasks data received:', data);
      console.log('Number of tasks:', data?.length || 0);
    }
    console.log('=== END SHOP TASKS DEBUG ===');

    return data || [];
  });

  const filteredTasks = tasks?.filter((task: any) =>
    !searchQuery ||
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const pendingTasks = filteredTasks.filter((t: any) => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter((t: any) => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter((t: any) => t.status === 'completed');

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    const { error } = await (supabase.from('shop_tasks') as any)
      .update({
        status: newStatus,
        ...(newStatus === 'completed' ? { completed_at: new Date().toISOString(), completed_by: user?.id } : {})
      })
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to update task');
      console.error(error);
    } else {
      toast.success('Task updated successfully');
      mutateTasks();
      setSelectedTask(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Shop Tasks</h1>
        <p className="text-white/60 mt-1">Your assigned tasks and available work</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-white mb-4">
            <Clock className="w-4 h-4 text-amber-400" />
            Pending ({pendingTasks.length})
          </h3>
          <div className="space-y-3">
            {pendingTasks.map((task: any) => (
              <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
            {pendingTasks.length === 0 && (
              <p className="text-white/40 text-sm text-center py-8">No pending tasks</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="flex items-center gap-2 font-semibold text-white mb-4">
            <Wrench className="w-4 h-4 text-purple-400" />
            In Progress ({inProgressTasks.length})
          </h3>
          <div className="space-y-3">
            {inProgressTasks.map((task: any) => (
              <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
            {inProgressTasks.length === 0 && (
              <p className="text-white/40 text-sm text-center py-8">None in progress</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="flex items-center gap-2 font-semibold text-white mb-4">
            <CheckCircle className="w-4 h-4 text-green-400" />
            Completed ({completedTasks.length})
          </h3>
          <div className="space-y-3">
            {completedTasks.slice(0, 5).map((task: any) => (
              <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
            {completedTasks.length === 0 && (
              <p className="text-white/40 text-sm text-center py-8">No completed tasks</p>
            )}
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}

interface TaskCardProps {
  task: any;
  onClick: () => void;
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const typeConfig = taskTypeConfig[task.task_type] || taskTypeConfig.other;
  const TypeIcon = typeConfig.icon;

  return (
    <button
      onClick={onClick}
      className="card p-4 w-full text-left hover:bg-dark-bg/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${typeConfig.color}20` }}
        >
          <TypeIcon className="w-4 h-4" style={{ color: typeConfig.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">{task.title}</h4>
          {task.assigned_user && (
            <p className="text-xs text-white/40 mt-1">
              Assigned to {task.assigned_user.full_name}
            </p>
          )}
          {!task.assigned_user && task.assigned_to === null && (
            <p className="text-xs text-amber-400 mt-1">Available</p>
          )}
          {task.equipment && (
            <p className="text-sm text-white/60 flex items-center gap-1 mt-1">
              <Truck className="w-3 h-3" />
              {task.equipment.name}
            </p>
          )}
          {task.due_date && (
            <div className="flex items-center gap-1 mt-2 text-xs text-white/40">
              <Calendar className="w-3 h-3" />
              {format(new Date(task.due_date), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

interface TaskDetailModalProps {
  task: any;
  onClose: () => void;
  onStatusUpdate: (taskId: string, status: string) => void;
}

function TaskDetailModal({ task, onClose, onStatusUpdate }: TaskDetailModalProps) {
  const typeConfig = taskTypeConfig[task.task_type] || taskTypeConfig.other;
  const TypeIcon = typeConfig.icon;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-dark-card rounded-xl border border-dark-border max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-dark-border">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${typeConfig.color}20` }}
            >
              <TypeIcon className="w-6 h-6" style={{ color: typeConfig.color }} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{task.title}</h2>
              <p className="text-white/60 mt-1">{typeConfig.label}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {task.description && (
            <div>
              <h3 className="text-sm font-medium text-white/80 mb-2">Description</h3>
              <p className="text-white/60">{task.description}</p>
            </div>
          )}

          {task.assigned_user && (
            <div>
              <h3 className="text-sm font-medium text-white/80 mb-2">Assigned To</h3>
              <p className="text-white/60">{task.assigned_user.full_name}</p>
            </div>
          )}

          {task.equipment && (
            <div>
              <h3 className="text-sm font-medium text-white/80 mb-2">Equipment</h3>
              <div className="flex items-center gap-2 text-white/60">
                <Truck className="w-4 h-4" />
                {task.equipment.name} {task.equipment.type && <span className="text-white/40">({task.equipment.type})</span>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {task.due_date && (
              <div>
                <h3 className="text-sm font-medium text-white/80 mb-2">Due Date</h3>
                <p className="text-white/60">{format(new Date(task.due_date), 'MMM d, yyyy')}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-white/80 mb-2">Status</h3>
              <span className={`badge ${
                task.status === 'pending' ? 'badge-pending' :
                task.status === 'in_progress' ? 'bg-purple-500/20 text-purple-400' :
                'badge-completed'
              }`}>
                {task.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {(task.parts_cost || task.labor_hours) && (
            <div className="grid grid-cols-2 gap-4">
              {task.parts_cost && (
                <div>
                  <h3 className="text-sm font-medium text-white/80 mb-2">Parts Cost</h3>
                  <p className="text-white/60">${parseFloat(task.parts_cost).toFixed(2)}</p>
                </div>
              )}
              {task.labor_hours && (
                <div>
                  <h3 className="text-sm font-medium text-white/80 mb-2">Labor Hours</h3>
                  <p className="text-white/60">{task.labor_hours} hrs</p>
                </div>
              )}
            </div>
          )}

          {task.notes && (
            <div>
              <h3 className="text-sm font-medium text-white/80 mb-2">Notes</h3>
              <p className="text-white/60">{task.notes}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-dark-border flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Close</button>
          {task.status === 'pending' && (
            <button
              onClick={() => onStatusUpdate(task.id, 'in_progress')}
              className="btn-primary flex-1"
            >
              <Edit2 className="w-4 h-4" />
              Start Task
            </button>
          )}
          {task.status === 'in_progress' && (
            <button
              onClick={() => onStatusUpdate(task.id, 'completed')}
              className="btn-primary flex-1"
            >
              <CheckCircle className="w-4 h-4" />
              Mark Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
