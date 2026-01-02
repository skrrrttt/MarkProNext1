'use client';

import { useState } from 'react';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Building2, Tag, Flag, ClipboardList, CreditCard, Save, Plus, Trash2, X, GripVertical, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [editingChecklist, setEditingChecklist] = useState<any>(null);

  const { data: tags, mutate: mutateTags } = useSupabaseQuery('all-tags', async (supabase) => {
    const { data } = await supabase.from('custom_tags').select('*').order('name');
    return data || [];
  });

  const { data: flags, mutate: mutateFlags } = useSupabaseQuery('all-flags', async (supabase) => {
    const { data } = await supabase.from('custom_flags').select('*').order('name');
    return data || [];
  });

  const { data: stages, mutate: mutateStages } = useSupabaseQuery('all-stages', async (supabase) => {
    const { data } = await supabase.from('job_stages').select('*').order('sort_order');
    return data || [];
  });

  const { data: checklistTemplates, mutate: mutateChecklists } = useSupabaseQuery('checklist-templates', async (supabase) => {
    const { data } = await supabase.from('checklist_templates').select('*, items:checklist_template_items(*)').order('name');
    return data || [];
  });

  // Tag handlers
  const handleAddTag = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supabase = getSupabaseClient();
    const { error } = await (supabase.from('custom_tags') as any).insert({
      name: formData.get('name') as string,
      color: formData.get('color') as string || '#3b82f6',
      category: 'customer',
    });
    if (error) toast.error('Failed to add tag');
    else { toast.success('Tag added'); setShowAddModal(null); mutateTags(); }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Delete this tag?')) return;
    const supabase = getSupabaseClient();
    const { error } = await (supabase.from('custom_tags') as any).delete().eq('id', id);
    if (error) toast.error('Failed to delete'); else { toast.success('Deleted'); mutateTags(); }
  };

  // Flag handlers
  const handleAddFlag = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supabase = getSupabaseClient();
    const { error } = await (supabase.from('custom_flags') as any).insert({
      name: formData.get('name') as string,
      color: formData.get('color') as string || '#ef4444',
      icon: 'flag',
    });
    if (error) toast.error('Failed to add flag');
    else { toast.success('Flag added'); setShowAddModal(null); mutateFlags(); }
  };

  const handleDeleteFlag = async (id: string) => {
    if (!confirm('Delete this flag?')) return;
    const supabase = getSupabaseClient();
    const { error } = await (supabase.from('custom_flags') as any).delete().eq('id', id);
    if (error) toast.error('Failed to delete'); else { toast.success('Deleted'); mutateFlags(); }
  };

  // Stage handlers
  const handleToggleStageVisibility = async (id: string, currentValue: boolean) => {
    const supabase = getSupabaseClient();
    const { error } = await (supabase.from('job_stages') as any).update({ is_field_visible: !currentValue }).eq('id', id);
    if (error) toast.error('Failed to update'); else mutateStages();
  };

  // Checklist handlers
  const handleAddChecklist = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supabase = getSupabaseClient();
    const { error } = await (supabase.from('checklist_templates') as any).insert({
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
    });
    if (error) toast.error('Failed to add checklist');
    else { toast.success('Checklist created'); setShowAddModal(null); mutateChecklists(); }
  };

  const handleDeleteChecklist = async (id: string) => {
    if (!confirm('Delete this checklist template?')) return;
    const supabase = getSupabaseClient();
    // Delete items first
    await (supabase.from('checklist_template_items') as any).delete().eq('template_id', id);
    const { error } = await (supabase.from('checklist_templates') as any).delete().eq('id', id);
    if (error) toast.error('Failed to delete'); else { toast.success('Deleted'); mutateChecklists(); }
  };

  const handleAddChecklistItem = async (templateId: string, itemName: string) => {
    if (!itemName.trim()) return;
    const supabase = getSupabaseClient();
    const template = checklistTemplates?.find((t: any) => t.id === templateId);
    const sortOrder = template?.items?.length || 0;

    const { error } = await (supabase.from('checklist_template_items') as any).insert({
      template_id: templateId,
      name: itemName,
      sort_order: sortOrder,
    });
    if (error) toast.error('Failed to add item');
    else { toast.success('Item added'); mutateChecklists(); }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    const supabase = getSupabaseClient();
    const { error } = await (supabase.from('checklist_template_items') as any).delete().eq('id', itemId);
    if (error) toast.error('Failed to delete'); else { mutateChecklists(); }
  };

  const tabs = [
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'tags', label: 'Tags', icon: Tag },
    { id: 'flags', label: 'Job Flags', icon: Flag },
    { id: 'stages', label: 'Job Stages', icon: ClipboardList },
    { id: 'checklists', label: 'Checklists', icon: ClipboardList },
    { id: 'integrations', label: 'Integrations', icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Settings</h1><p className="text-white/60 mt-1">Manage your workspace</p></div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-64 flex-shrink-0 card p-2 space-y-1 h-fit">
          {tabs.map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${activeTab === tab.id ? 'bg-brand-500/10 text-brand-500' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              <tab.icon className="w-5 h-5" /><span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="flex-1 card p-6">
          {activeTab === 'company' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Company Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">Company Name</label><input type="text" className="input" defaultValue="MarkPro" /></div>
                <div><label className="label">Phone</label><input type="tel" className="input" placeholder="(555) 123-4567" /></div>
                <div><label className="label">Email</label><input type="email" className="input" placeholder="contact@company.com" /></div>
                <div><label className="label">Address</label><input type="text" className="input" placeholder="123 Main St" /></div>
              </div>
              <button className="btn-primary" onClick={() => toast.success('Saved')}><Save className="w-4 h-4" />Save</button>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Customer Tags</h2>
                <button onClick={() => setShowAddModal('tag')} className="btn-secondary"><Plus className="w-4 h-4" />Add Tag</button>
              </div>
              <div className="space-y-2">
                {tags?.filter((t: any) => t.category === 'customer').map((tag: any) => (
                  <div key={tag.id} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }} />
                      <span className="text-white">{tag.name}</span>
                    </div>
                    <button onClick={() => handleDeleteTag(tag.id)} className="btn-icon text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {tags?.filter((t: any) => t.category === 'customer').length === 0 && <p className="text-white/40 text-center py-4">No tags yet</p>}
              </div>
            </div>
          )}

          {activeTab === 'flags' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Job Flags</h2>
                <button onClick={() => setShowAddModal('flag')} className="btn-secondary"><Plus className="w-4 h-4" />Add Flag</button>
              </div>
              <p className="text-white/60 text-sm">Mark jobs that need attention (e.g. "Needs Site Visit", "Waiting on Call Back")</p>
              <div className="space-y-2">
                {flags?.map((flag: any) => (
                  <div key={flag.id} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                    <div className="flex items-center gap-3">
                      <Flag className="w-4 h-4" style={{ color: flag.color }} />
                      <span className="text-white">{flag.name}</span>
                    </div>
                    <button onClick={() => handleDeleteFlag(flag.id)} className="btn-icon text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {flags?.length === 0 && <p className="text-white/40 text-center py-4">No flags yet</p>}
              </div>
            </div>
          )}

          {activeTab === 'stages' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Job Pipeline Stages</h2>
              <p className="text-white/60 text-sm">Toggle which stages are visible to field workers</p>
              <div className="space-y-2">
                {stages?.map((stage: any) => (
                  <div key={stage.id} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-white">{stage.name}</span>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                      <input type="checkbox" checked={stage.is_field_visible} onChange={() => handleToggleStageVisibility(stage.id, stage.is_field_visible)} className="rounded" />
                      Field visible
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'checklists' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Checklist Templates</h2>
                  <p className="text-white/60 text-sm mt-1">Create reusable checklists to assign to jobs</p>
                </div>
                <button onClick={() => setShowAddModal('checklist')} className="btn-secondary"><Plus className="w-4 h-4" />New Checklist</button>
              </div>
              
              <div className="space-y-4">
                {checklistTemplates?.map((template: any) => (
                  <div key={template.id} className="bg-dark-bg rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-dark-border">
                      <div>
                        <h3 className="font-semibold text-white">{template.name}</h3>
                        {template.description && <p className="text-sm text-white/60">{template.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingChecklist(editingChecklist === template.id ? null : template.id)} className="btn-icon text-white/40 hover:text-white">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteChecklist(template.id)} className="btn-icon text-white/40 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-2">
                      {template.items?.sort((a: any, b: any) => a.sort_order - b.sort_order).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-dark-card rounded">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-white/20" />
                            <span className="text-white/80">{item.name}</span>
                          </div>
                          {editingChecklist === template.id && (
                            <button onClick={() => handleDeleteChecklistItem(item.id)} className="btn-icon text-white/40 hover:text-red-400">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {template.items?.length === 0 && <p className="text-white/40 text-sm text-center py-2">No items yet</p>}
                      
                      {editingChecklist === template.id && (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const input = e.currentTarget.querySelector('input') as HTMLInputElement;
                          handleAddChecklistItem(template.id, input.value);
                          input.value = '';
                        }} className="flex gap-2 mt-2">
                          <input type="text" className="input flex-1" placeholder="Add new item..." />
                          <button type="submit" className="btn-secondary"><Plus className="w-4 h-4" /></button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
                
                {checklistTemplates?.length === 0 && (
                  <div className="text-center py-8 bg-dark-bg rounded-lg">
                    <ClipboardList className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/60">No checklist templates yet</p>
                    <p className="text-white/40 text-sm">Create one to start adding to jobs</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Integrations</h2>
              <div className="space-y-4">
                <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-white">Stripe Payments</h3>
                    <span className="badge bg-amber-500/20 text-amber-400">Coming Soon</span>
                  </div>
                  <p className="text-white/60 text-sm">Accept payments on invoices</p>
                </div>
                <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-white">Microsoft Outlook</h3>
                    <span className="badge bg-amber-500/20 text-amber-400">Coming Soon</span>
                  </div>
                  <p className="text-white/60 text-sm">Send invoices via email</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Tag Modal */}
      {showAddModal === 'tag' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <h2 className="text-lg font-semibold text-white">Add Tag</h2>
              <button onClick={() => setShowAddModal(null)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddTag} className="p-4 space-y-4">
              <div><label className="label">Tag Name *</label><input type="text" name="name" required className="input" placeholder="e.g. VIP Customer" /></div>
              <div><label className="label">Color</label><input type="color" name="color" className="input h-10 p-1" defaultValue="#3b82f6" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Add Tag</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Flag Modal */}
      {showAddModal === 'flag' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <h2 className="text-lg font-semibold text-white">Add Flag</h2>
              <button onClick={() => setShowAddModal(null)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddFlag} className="p-4 space-y-4">
              <div><label className="label">Flag Name *</label><input type="text" name="name" required className="input" placeholder="e.g. Needs Site Visit" /></div>
              <div><label className="label">Color</label><input type="color" name="color" className="input h-10 p-1" defaultValue="#ef4444" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Add Flag</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Checklist Modal */}
      {showAddModal === 'checklist' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <h2 className="text-lg font-semibold text-white">New Checklist</h2>
              <button onClick={() => setShowAddModal(null)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddChecklist} className="p-4 space-y-4">
              <div><label className="label">Checklist Name *</label><input type="text" name="name" required className="input" placeholder="e.g. Pre-Job Safety Check" /></div>
              <div><label className="label">Description</label><textarea name="description" className="input" rows={2} placeholder="What is this checklist for?" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
