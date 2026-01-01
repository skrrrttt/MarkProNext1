'use client';

import { useState } from 'react';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, Wrench, Truck, Clock, CheckCircle, AlertTriangle, Calendar, User, Edit2, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { Database } from '@/types/database';

const taskTypeConfig: Record<string, { label: string; color: string; icon: any }> = {
  maintenance: { label: 'Maintenance', color: '#3b82f6', icon: Wrench },
  repair: { label: 'Repair', color: '#ef4444', icon: AlertTriangle },
  inspection: { label: 'Inspection', color: '#8b5cf6', icon: CheckCircle },
  other: { label: 'Other', color: '#64748b', icon: Clock },
};

const equipmentTypes = ['vehicle', 'tool', 'machinery', 'other'];
const equipmentStatuses = ['active', 'in_shop', 'retired'];

export default function AdminShopPage() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'equipment'>('tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);

  const supabase = createClient();

  const { data: tasks, mutate: mutateTasks } = useSupabaseQuery('shop-tasks', async (supabase) => {
    const { data } = await supabase.from('shop_tasks').select(`*, equipment(id, name, type), assigned_to:user_profiles(id, full_name)`).order('due_date', { ascending: true });
    return data || [];
  });

  const { data: equipment, mutate: mutateEquipment } = useSupabaseQuery('equipment', async (supabase) => {
    const { data } = await supabase.from('equipment').select('*').order('name');
    return data || [];
  });

  const { data: users } = useSupabaseQuery('users', async (supabase) => {
    const { data } = await supabase.from('user_profiles').select('id, full_name, user_role').order('full_name');
    return data || [];
  });

  const filteredTasks = tasks?.filter((task: any) => !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase()) || task.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase())) || [];
  const filteredEquipment = equipment?.filter((eq: any) => !searchQuery || eq.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  const pendingTasks = filteredTasks.filter((t: any) => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter((t: any) => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter((t: any) => t.status === 'completed');

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    const { error } = await supabase.from('shop_tasks').delete().eq('id', taskId);

    if (error) {
      toast.error('Failed to delete task');
      console.error(error);
    } else {
      toast.success('Task deleted successfully');
      mutateTasks();
    }
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;

    const { error } = await supabase.from('equipment').delete().eq('id', equipmentId);

    if (error) {
      toast.error('Failed to delete equipment');
      console.error(error);
    } else {
      toast.success('Equipment deleted successfully');
      mutateEquipment();
    }
  };

  const openTaskModal = (task: any = null) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const openEquipmentModal = (eq: any = null) => {
    setEditingEquipment(eq);
    setEquipmentModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Shop</h1><p className="text-white/60 mt-1">Equipment & maintenance</p></div>
        <div className="flex gap-2">
          <button onClick={() => openEquipmentModal()} className="btn-secondary"><Truck className="w-4 h-4" />Add Equipment</button>
          <button onClick={() => openTaskModal()} className="btn-primary"><Plus className="w-4 h-4" />New Task</button>
        </div>
      </div>
      <div className="flex gap-1 bg-dark-card rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'tasks' ? 'bg-brand-500 text-black' : 'text-white/60 hover:text-white'}`}>Tasks ({tasks?.length || 0})</button>
        <button onClick={() => setActiveTab('equipment')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'equipment' ? 'bg-brand-500 text-black' : 'text-white/60 hover:text-white'}`}>Equipment ({equipment?.length || 0})</button>
      </div>
      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" /><input type="text" placeholder={activeTab === 'tasks' ? 'Search tasks...' : 'Search equipment...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" /></div>

      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div><h3 className="flex items-center gap-2 font-semibold text-white mb-4"><Clock className="w-4 h-4 text-amber-400" />Pending ({pendingTasks.length})</h3><div className="space-y-3">{pendingTasks.map((task: any) => <TaskCard key={task.id} task={task} onEdit={() => openTaskModal(task)} onDelete={() => handleDeleteTask(task.id)} />)}{pendingTasks.length === 0 && <p className="text-white/40 text-sm text-center py-8">No pending</p>}</div></div>
          <div><h3 className="flex items-center gap-2 font-semibold text-white mb-4"><Wrench className="w-4 h-4 text-purple-400" />In Progress ({inProgressTasks.length})</h3><div className="space-y-3">{inProgressTasks.map((task: any) => <TaskCard key={task.id} task={task} onEdit={() => openTaskModal(task)} onDelete={() => handleDeleteTask(task.id)} />)}{inProgressTasks.length === 0 && <p className="text-white/40 text-sm text-center py-8">None in progress</p>}</div></div>
          <div><h3 className="flex items-center gap-2 font-semibold text-white mb-4"><CheckCircle className="w-4 h-4 text-green-400" />Completed ({completedTasks.length})</h3><div className="space-y-3">{completedTasks.slice(0, 5).map((task: any) => <TaskCard key={task.id} task={task} onEdit={() => openTaskModal(task)} onDelete={() => handleDeleteTask(task.id)} />)}{completedTasks.length === 0 && <p className="text-white/40 text-sm text-center py-8">No completed</p>}</div></div>
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
              <div className="mt-4 pt-4 border-t border-dark-border flex gap-2">
                <button onClick={() => openEquipmentModal(eq)} className="btn-secondary text-xs flex-1"><Edit2 className="w-3 h-3" />Edit</button>
                <button onClick={() => openTaskModal({ equipment_id: eq.id })} className="btn-primary text-xs flex-1"><Plus className="w-3 h-3" />New Task</button>
                <button onClick={() => handleDeleteEquipment(eq.id)} className="btn-icon text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {filteredEquipment.length === 0 && <div className="col-span-full card p-12 text-center"><Truck className="w-16 h-16 text-white/20 mx-auto mb-4" /><h3 className="text-lg font-semibold text-white mb-2">No equipment</h3><button onClick={() => openEquipmentModal()} className="btn-primary mt-4"><Plus className="w-4 h-4" />Add Equipment</button></div>}
        </div>
      )}

      {taskModalOpen && <TaskModal task={editingTask} equipment={equipment} users={users} onClose={() => { setTaskModalOpen(false); setEditingTask(null); }} onSave={() => { mutateTasks(); setTaskModalOpen(false); setEditingTask(null); }} />}
      {equipmentModalOpen && <EquipmentModal equipment={editingEquipment} onClose={() => { setEquipmentModalOpen(false); setEditingEquipment(null); }} onSave={() => { mutateEquipment(); setEquipmentModalOpen(false); setEditingEquipment(null); }} />}
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete }: { task: any; onEdit: () => void; onDelete: () => void }) {
  const typeConfig = taskTypeConfig[task.task_type] || taskTypeConfig.other;
  const TypeIcon = typeConfig.icon;
  return (
    <div className="card p-4 group">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${typeConfig.color}20` }}><TypeIcon className="w-4 h-4" style={{ color: typeConfig.color }} /></div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">{task.title}</h4>
          {task.equipment && <p className="text-sm text-white/60">{task.equipment.name}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
            {task.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(task.due_date), 'MMM d')}</span>}
            {task.assigned_to && <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.assigned_to.full_name}</span>}
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button onClick={onEdit} className="btn-icon text-white/60 hover:text-white"><Edit2 className="w-4 h-4" /></button>
          <button onClick={onDelete} className="btn-icon text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

function TaskModal({ task, equipment, users, onClose, onSave }: { task: any; equipment: any[]; users: any[]; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    equipment_id: task?.equipment_id || '',
    task_type: task?.task_type || 'maintenance',
    assigned_to: task?.assigned_to?.id || '',
    due_date: task?.due_date || '',
    status: task?.status || 'pending',
    priority: task?.priority || 0,
    parts_cost: task?.parts_cost || '',
    labor_hours: task?.labor_hours || '',
    notes: task?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: Database['public']['Tables']['shop_tasks']['Insert'] = {
      title: formData.title,
      description: formData.description || null,
      equipment_id: formData.equipment_id || null,
      task_type: formData.task_type as 'maintenance' | 'repair' | 'inspection' | 'other',
      assigned_to: formData.assigned_to || null,
      due_date: formData.due_date || null,
      completed_at: null,
      completed_by: null,
      status: formData.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
      priority: formData.priority,
      parts_cost: formData.parts_cost ? parseFloat(formData.parts_cost as string) : null,
      labor_hours: formData.labor_hours ? parseFloat(formData.labor_hours as string) : null,
      notes: formData.notes || null,
      created_by: null,
    };

    let error;
    if (task) {
      const updatePayload: Database['public']['Tables']['shop_tasks']['Update'] = payload;
      ({ error } = await supabase.from('shop_tasks').update(updatePayload).eq('id', task.id));
    } else {
      ({ error } = await supabase.from('shop_tasks').insert([payload]));
    }

    setSaving(false);

    if (error) {
      toast.error('Failed to save task');
      console.error(error);
    } else {
      toast.success(task ? 'Task updated successfully' : 'Task created successfully');
      onSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card rounded-xl border border-dark-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-dark-card border-b border-dark-border p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Title *</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Equipment</label>
              <select value={formData.equipment_id} onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })} className="input">
                <option value="">None</option>
                {equipment?.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Task Type</label>
              <select value={formData.task_type} onChange={(e) => setFormData({ ...formData, task_type: e.target.value })} className="input">
                {Object.entries(taskTypeConfig).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Assigned To</label>
              <select value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })} className="input">
                <option value="">Unassigned</option>
                {users?.map((user: any) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Due Date</label>
              <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input">
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Parts Cost</label>
              <input type="number" step="0.01" value={formData.parts_cost} onChange={(e) => setFormData({ ...formData, parts_cost: e.target.value })} className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Labor Hours</label>
              <input type="number" step="0.1" value={formData.labor_hours} onChange={(e) => setFormData({ ...formData, labor_hours: e.target.value })} className="input" placeholder="0.0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input" rows={2} />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EquipmentModal({ equipment, onClose, onSave }: { equipment: any; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    name: equipment?.name || '',
    type: equipment?.type || 'vehicle',
    status: equipment?.status || 'active',
    vin: equipment?.vin || '',
    serial_number: equipment?.serial_number || '',
    make: equipment?.make || '',
    model: equipment?.model || '',
    year: equipment?.year || '',
    license_plate: equipment?.license_plate || '',
    current_miles: equipment?.current_miles || '',
    next_service_date: equipment?.next_service_date || '',
    service_interval_miles: equipment?.service_interval_miles || '',
    notes: equipment?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: Database['public']['Tables']['equipment']['Insert'] = {
      name: formData.name,
      type: formData.type || null,
      status: formData.status as 'active' | 'in_shop' | 'retired',
      vin: formData.vin || null,
      serial_number: formData.serial_number || null,
      make: formData.make || null,
      model: formData.model || null,
      year: formData.year ? parseInt(formData.year as string) : null,
      license_plate: formData.license_plate || null,
      current_miles: formData.current_miles ? parseInt(formData.current_miles as string) : null,
      current_hours: null,
      last_service_date: null,
      next_service_date: formData.next_service_date || null,
      service_interval_miles: formData.service_interval_miles ? parseInt(formData.service_interval_miles as string) : null,
      service_interval_hours: null,
      notes: formData.notes || null,
    };

    let error;
    if (equipment) {
      const updatePayload: Database['public']['Tables']['equipment']['Update'] = payload;
      ({ error } = await supabase.from('equipment').update(updatePayload).eq('id', equipment.id));
    } else {
      ({ error } = await supabase.from('equipment').insert([payload]));
    }

    setSaving(false);

    if (error) {
      toast.error('Failed to save equipment');
      console.error(error);
    } else {
      toast.success(equipment ? 'Equipment updated successfully' : 'Equipment created successfully');
      onSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card rounded-xl border border-dark-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-dark-card border-b border-dark-border p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{equipment ? 'Edit Equipment' : 'New Equipment'}</h2>
          <button onClick={onClose} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Type</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="input">
                {equipmentTypes.map((type) => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input">
              {equipmentStatuses.map((status) => <option key={status} value={status}>{status === 'in_shop' ? 'In Shop' : status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">VIN</label>
              <input type="text" value={formData.vin} onChange={(e) => setFormData({ ...formData, vin: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Serial Number</label>
              <input type="text" value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">License Plate</label>
              <input type="text" value={formData.license_plate} onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Year</label>
              <input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Make</label>
              <input type="text" value={formData.make} onChange={(e) => setFormData({ ...formData, make: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Model</label>
              <input type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Current Miles</label>
              <input type="number" value={formData.current_miles} onChange={(e) => setFormData({ ...formData, current_miles: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Next Service Date</label>
              <input type="date" value={formData.next_service_date} onChange={(e) => setFormData({ ...formData, next_service_date: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Service Interval (miles)</label>
              <input type="number" value={formData.service_interval_miles} onChange={(e) => setFormData({ ...formData, service_interval_miles: e.target.value })} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input" rows={3} />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : equipment ? 'Update Equipment' : 'Create Equipment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
