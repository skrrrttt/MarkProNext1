'use client';

import { useState } from 'react';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { Plus, Search, Wrench, Truck, Clock, CheckCircle, AlertTriangle, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

const taskTypeConfig: Record<string, { label: string; color: string; icon: any }> = {
  maintenance: { label: 'Maintenance', color: '#3b82f6', icon: Wrench },
  repair: { label: 'Repair', color: '#ef4444', icon: AlertTriangle },
  inspection: { label: 'Inspection', color: '#8b5cf6', icon: CheckCircle },
  other: { label: 'Other', color: '#64748b', icon: Clock },
};

export default function AdminShopPage() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'equipment'>('tasks');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: tasks } = useSupabaseQuery('shop-tasks', async (supabase) => {
    const { data } = await supabase.from('shop_tasks').select(`*, equipment(id, name, type), assigned_to:user_profiles(id, full_name)`).order('due_date', { ascending: true });
    return data || [];
  });

  const { data: equipment } = useSupabaseQuery('equipment', async (supabase) => {
    const { data } = await supabase.from('equipment').select('*').order('name');
    return data || [];
  });

  const filteredTasks = tasks?.filter((task: any) => !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase()) || task.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase())) || [];
  const filteredEquipment = equipment?.filter((eq: any) => !searchQuery || eq.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  const pendingTasks = filteredTasks.filter((t: any) => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter((t: any) => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter((t: any) => t.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Shop</h1><p className="text-white/60 mt-1">Equipment & maintenance</p></div>
        <div className="flex gap-2"><button className="btn-secondary"><Truck className="w-4 h-4" />Add Equipment</button><button className="btn-primary"><Plus className="w-4 h-4" />New Task</button></div>
      </div>
      <div className="flex gap-1 bg-dark-card rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'tasks' ? 'bg-brand-500 text-black' : 'text-white/60 hover:text-white'}`}>Tasks ({tasks?.length || 0})</button>
        <button onClick={() => setActiveTab('equipment')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'equipment' ? 'bg-brand-500 text-black' : 'text-white/60 hover:text-white'}`}>Equipment ({equipment?.length || 0})</button>
      </div>
      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" /><input type="text" placeholder={activeTab === 'tasks' ? 'Search tasks...' : 'Search equipment...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" /></div>

      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div><h3 className="flex items-center gap-2 font-semibold text-white mb-4"><Clock className="w-4 h-4 text-amber-400" />Pending ({pendingTasks.length})</h3><div className="space-y-3">{pendingTasks.map((task: any) => <TaskCard key={task.id} task={task} />)}{pendingTasks.length === 0 && <p className="text-white/40 text-sm text-center py-8">No pending</p>}</div></div>
          <div><h3 className="flex items-center gap-2 font-semibold text-white mb-4"><Wrench className="w-4 h-4 text-purple-400" />In Progress ({inProgressTasks.length})</h3><div className="space-y-3">{inProgressTasks.map((task: any) => <TaskCard key={task.id} task={task} />)}{inProgressTasks.length === 0 && <p className="text-white/40 text-sm text-center py-8">None in progress</p>}</div></div>
          <div><h3 className="flex items-center gap-2 font-semibold text-white mb-4"><CheckCircle className="w-4 h-4 text-green-400" />Completed ({completedTasks.length})</h3><div className="space-y-3">{completedTasks.slice(0, 5).map((task: any) => <TaskCard key={task.id} task={task} />)}{completedTasks.length === 0 && <p className="text-white/40 text-sm text-center py-8">No completed</p>}</div></div>
        </div>
      )}

      {activeTab === 'equipment' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map((eq: any) => (
            <div key={eq.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-dark-bg flex items-center justify-center"><Truck className="w-6 h-6 text-white/40" /></div><div><h3 className="font-semibold text-white">{eq.name}</h3><p className="text-sm text-white/40 capitalize">{eq.type}</p></div></div>
                <span className={`badge ${eq.status === 'active' ? 'badge-completed' : eq.status === 'in_shop' ? 'badge-pending' : 'bg-slate-500/20 text-slate-400'}`}>{eq.status === 'in_shop' ? 'In Shop' : eq.status}</span>
              </div>
              {eq.next_service_date && <div className="flex items-center gap-2 text-sm text-white/60"><Calendar className="w-4 h-4" />Next service: {format(new Date(eq.next_service_date), 'MMM d, yyyy')}</div>}
              <div className="mt-4 pt-4 border-t border-dark-border flex gap-2"><button className="btn-secondary text-xs flex-1">History</button><button className="btn-primary text-xs flex-1">New Task</button></div>
            </div>
          ))}
          {filteredEquipment.length === 0 && <div className="col-span-full card p-12 text-center"><Truck className="w-16 h-16 text-white/20 mx-auto mb-4" /><h3 className="text-lg font-semibold text-white mb-2">No equipment</h3><button className="btn-primary mt-4"><Plus className="w-4 h-4" />Add Equipment</button></div>}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: any }) {
  const typeConfig = taskTypeConfig[task.task_type] || taskTypeConfig.other;
  const TypeIcon = typeConfig.icon;
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${typeConfig.color}20` }}><TypeIcon className="w-4 h-4" style={{ color: typeConfig.color }} /></div>
        <div className="flex-1 min-w-0"><h4 className="font-medium text-white truncate">{task.title}</h4>{task.equipment && <p className="text-sm text-white/60">{task.equipment.name}</p>}<div className="flex items-center gap-3 mt-2 text-xs text-white/40">{task.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(task.due_date), 'MMM d')}</span>}{task.assigned_to && <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.assigned_to.full_name}</span>}</div></div>
      </div>
    </div>
  );
}
