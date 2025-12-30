'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ArrowLeft, Edit2, Trash2, Save, X, MapPin, Calendar, DollarSign, User, Phone, Mail, Flag, Plus, ClipboardList, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function AdminJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);
  const [showAddFlagModal, setShowAddFlagModal] = useState(false);
  const [showAddChecklistModal, setShowAddChecklistModal] = useState(false);

  const { data: job, mutate } = useSupabaseQuery(`admin-job-${jobId}`, async (supabase) => {
    const { data } = await supabase.from('jobs').select('*').eq('id', jobId).single();
    return data;
  });

  const { data: stages } = useSupabaseQuery('job-stages', async (supabase) => {
    const { data } = await supabase.from('job_stages').select('*').order('sort_order');
    return data || [];
  });

  const { data: customers } = useSupabaseQuery('customers-list', async (supabase) => {
    const { data } = await supabase.from('customers').select('*').order('name');
    return data || [];
  });

  const { data: allFlags } = useSupabaseQuery('all-flags', async (supabase) => {
    const { data } = await supabase.from('custom_flags').select('*').order('name');
    return data || [];
  });

  const { data: jobFlags, mutate: mutateFlags } = useSupabaseQuery(`job-flags-${jobId}`, async (supabase) => {
    const { data } = await supabase.from('job_flags_junction').select('*, flag:custom_flags(*)').eq('job_id', jobId);
    return data || [];
  });

  const { data: checklistTemplates } = useSupabaseQuery('checklist-templates', async (supabase) => {
    const { data } = await supabase.from('checklist_templates').select('*, items:checklist_template_items(*)').order('name');
    return data || [];
  });

  const { data: jobChecklists, mutate: mutateJobChecklists } = useSupabaseQuery(`job-checklists-${jobId}`, async (supabase) => {
    const { data } = await supabase.from('job_checklists').select('*, items:job_checklist_items(*)').eq('job_id', jobId);
    return data || [];
  });

  const customer = customers?.find((c: any) => c.id === job?.customer_id);
  const stage = stages?.find((s: any) => s.id === job?.stage_id);

  const handleStageChange = async (newStageId: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('jobs').update({ stage_id: newStageId }).eq('id', jobId);
    if (error) toast.error('Failed to update stage');
    else { toast.success('Stage updated'); mutate(); }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supabase = getSupabaseClient();

    const updates = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      customer_id: formData.get('customer_id') as string || null,
      stage_id: formData.get('stage_id') as string || null,
      job_address_street: formData.get('address_street') as string || null,
      job_address_city: formData.get('address_city') as string || null,
      job_address_state: formData.get('address_state') as string || null,
      job_address_zip: formData.get('address_zip') as string || null,
      scheduled_date: formData.get('scheduled_date') as string || null,
      quote_amount: formData.get('quote_amount') ? parseFloat(formData.get('quote_amount') as string) : null,
      internal_notes: formData.get('internal_notes') as string || null,
    };

    const { error } = await supabase.from('jobs').update(updates).eq('id', jobId);
    if (error) toast.error('Failed to update job');
    else { toast.success('Job updated'); setIsEditing(false); mutate(); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this job?')) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    if (error) toast.error('Failed to delete');
    else { toast.success('Deleted'); router.push('/admin/jobs'); }
  };

  const handleAddFlag = async (flagId: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('job_flags_junction').insert({ job_id: jobId, flag_id: flagId });
    if (error) {
      if (error.code === '23505') toast.error('Flag already added');
      else toast.error('Failed to add flag');
    } else {
      toast.success('Flag added');
      setShowAddFlagModal(false);
      mutateFlags();
    }
  };

  const handleRemoveFlag = async (junctionId: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('job_flags_junction').delete().eq('id', junctionId);
    if (error) toast.error('Failed to remove');
    else { toast.success('Removed'); mutateFlags(); }
  };

  const handleAddChecklist = async (templateId: string) => {
    const supabase = getSupabaseClient();
    const template = checklistTemplates?.find((t: any) => t.id === templateId);
    if (!template) return;

    // First, fetch the template items directly from DB to ensure we have them
    const { data: templateItems, error: fetchError } = await supabase
      .from('checklist_template_items')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order');

    console.log('Template items fetched:', templateItems, 'Error:', fetchError);

    // Create the job checklist
    const { data: checklist, error: checklistError } = await supabase
      .from('job_checklists')
      .insert({ job_id: jobId, name: template.name, template_id: templateId })
      .select()
      .single();

    console.log('Created checklist:', checklist, 'Error:', checklistError);

    if (checklistError) {
      toast.error('Failed to add checklist');
      return;
    }

    // Create the checklist items from template items
    if (templateItems && templateItems.length > 0) {
      const items = templateItems.map((item: any, index: number) => ({
        checklist_id: checklist.id,
        text: item.name,
        sort_order: item.sort_order ?? index,
        is_checked: false,
      }));
      console.log('Inserting items:', items);
      const { data: insertedItems, error: itemsError } = await supabase.from('job_checklist_items').insert(items).select();
      console.log('Inserted items:', insertedItems, 'Error:', itemsError);
      if (itemsError) {
        toast.error('Failed to create checklist items: ' + itemsError.message);
        return;
      }
    } else {
      console.log('No template items found for template:', templateId);
      toast.error('No items in this checklist template');
    }

    toast.success('Checklist added');
    setShowAddChecklistModal(false);
    mutateJobChecklists();
  };

  const handleToggleChecklistItem = async (itemId: string, isChecked: boolean) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('job_checklist_items').update({ 
      is_checked: !isChecked,
      checked_at: !isChecked ? new Date().toISOString() : null 
    }).eq('id', itemId);
    if (error) toast.error('Failed to update');
    else mutateJobChecklists();
  };

  const handleDeleteJobChecklist = async (checklistId: string) => {
    if (!confirm('Remove this checklist from the job?')) return;
    const supabase = getSupabaseClient();
    await supabase.from('job_checklist_items').delete().eq('checklist_id', checklistId);
    const { error } = await supabase.from('job_checklists').delete().eq('id', checklistId);
    if (error) toast.error('Failed to remove');
    else { toast.success('Removed'); mutateJobChecklists(); }
  };

  if (!job) return <div className="text-center py-12 text-white/60">Loading...</div>;

  const existingFlagIds = jobFlags?.map((f: any) => f.flag_id) || [];
  const availableFlags = allFlags?.filter((f: any) => !existingFlagIds.includes(f.id)) || [];

  const existingTemplateIds = jobChecklists?.map((c: any) => c.template_id) || [];
  const availableTemplates = checklistTemplates?.filter((t: any) => !existingTemplateIds.includes(t.id)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/admin/jobs')} className="btn-secondary"><ArrowLeft className="w-4 h-4" />Back</button>
        <div className="flex gap-2">
          <button onClick={() => setIsEditing(!isEditing)} className="btn-secondary">
            {isEditing ? <><X className="w-4 h-4" />Cancel</> : <><Edit2 className="w-4 h-4" />Edit</>}
          </button>
          <button onClick={handleDelete} className="btn-secondary text-red-400"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Job Details</h2>
            <div><label className="label">Job Name *</label><input type="text" name="name" required className="input" defaultValue={job.name} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Customer</label>
                <select name="customer_id" className="input" defaultValue={job.customer_id || ''}>
                  <option value="">No customer</option>
                  {customers?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="label">Stage</label>
                <select name="stage_id" className="input" defaultValue={job.stage_id || ''}>
                  {stages?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div><label className="label">Description</label><textarea name="description" rows={3} className="input" defaultValue={job.description || ''} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Scheduled Date</label><input type="date" name="scheduled_date" className="input" defaultValue={job.scheduled_date || ''} /></div>
              <div><label className="label">Quote Amount</label><input type="number" name="quote_amount" step="0.01" className="input" defaultValue={job.quote_amount || ''} /></div>
            </div>
            <div><label className="label">Address</label>
              <input type="text" name="address_street" className="input mb-2" defaultValue={job.job_address_street || ''} placeholder="Street" />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" name="address_city" className="input" defaultValue={job.job_address_city || ''} placeholder="City" />
                <input type="text" name="address_state" className="input" defaultValue={job.job_address_state || ''} placeholder="State" />
                <input type="text" name="address_zip" className="input" defaultValue={job.job_address_zip || ''} placeholder="ZIP" />
              </div>
            </div>
            <div><label className="label">Internal Notes</label><textarea name="internal_notes" rows={3} className="input" defaultValue={job.internal_notes || ''} /></div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1"><Save className="w-4 h-4" />Save</button>
          </div>
        </form>
      ) : (
        <>
          <div className="card p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">{job.name}</h1>
                {customer && (
                  <Link href={`/admin/customers/${customer.id}`} className="text-white/60 hover:text-brand-500 flex items-center gap-2">
                    <User className="w-4 h-4" />{customer.name}{customer.company && ` • ${customer.company}`}
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-sm">Stage:</span>
                <select value={job.stage_id || ''} onChange={(e) => handleStageChange(e.target.value)} className="input py-1.5 px-3 text-sm" style={{ backgroundColor: stage ? `${stage.color}20` : undefined, color: stage?.color }}>
                  {stages?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {job.description && <p className="text-white/70 mb-4">{job.description}</p>}

            {/* Flags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {jobFlags?.map((f: any) => f.flag && (
                <span key={f.id} className="tag flex items-center gap-1" style={{ backgroundColor: `${f.flag.color}20`, color: f.flag.color }}>
                  <Flag className="w-3 h-3" />{f.flag.name}
                  <button onClick={() => handleRemoveFlag(f.id)} className="hover:bg-white/20 rounded p-0.5"><X className="w-3 h-3" /></button>
                </span>
              ))}
              {availableFlags.length > 0 && (
                <button onClick={() => setShowAddFlagModal(true)} className="tag bg-dark-bg text-white/60 hover:text-white">
                  <Plus className="w-3 h-3" />Add Flag
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-dark-border">
              <div><p className="text-white/40 text-sm">Scheduled</p><p className="text-white font-medium flex items-center gap-2"><Calendar className="w-4 h-4 text-white/40" />{job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM d, yyyy') : '—'}</p></div>
              <div><p className="text-white/40 text-sm">Quote</p><p className="text-white font-medium flex items-center gap-2"><DollarSign className="w-4 h-4 text-white/40" />{job.quote_amount ? `$${job.quote_amount.toLocaleString()}` : '—'}</p></div>
            </div>
          </div>

          {/* Checklists */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2"><ClipboardList className="w-5 h-5" />Checklists</h2>
              {availableTemplates.length > 0 && (
                <button onClick={() => setShowAddChecklistModal(true)} className="btn-secondary text-sm"><Plus className="w-4 h-4" />Add Checklist</button>
              )}
            </div>

            {(jobChecklists?.length ?? 0) > 0 ? (
              <div className="space-y-4">
                {jobChecklists?.map((checklist: any) => {
                  const items = checklist.items?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [];
                  const completed = items.filter((i: any) => i.is_checked).length;
                  const total = items.length;
                  const progress = total > 0 ? (completed / total) * 100 : 0;

                  return (
                    <div key={checklist.id} className="bg-dark-bg rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3 border-b border-dark-border">
                        <div>
                          <h3 className="font-medium text-white">{checklist.name}</h3>
                          <p className="text-xs text-white/40">{completed}/{total} completed</p>
                        </div>
                        <button onClick={() => handleDeleteJobChecklist(checklist.id)} className="btn-icon text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="h-1 bg-dark-border">
                        <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="p-3 space-y-2">
                        {items.map((item: any) => (
                          <button key={item.id} onClick={() => handleToggleChecklistItem(item.id, item.is_checked)} className="w-full flex items-center gap-3 p-2 rounded hover:bg-dark-card transition-colors text-left">
                            {item.is_checked ? <CheckSquare className="w-5 h-5 text-green-500" /> : <Square className="w-5 h-5 text-white/30" />}
                            <span className={item.is_checked ? 'text-white/50 line-through' : 'text-white'}>{item.text || item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-white/40">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No checklists assigned</p>
                {availableTemplates.length > 0 && <p className="text-sm">Click "Add Checklist" to assign one</p>}
                {availableTemplates.length === 0 && <p className="text-sm">Create templates in Settings → Checklists</p>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><MapPin className="w-5 h-5" />Job Address</h2>
              {job.job_address_street ? (
                <div>
                  <p className="text-white">{job.job_address_street}</p>
                  <p className="text-white/60">{job.job_address_city}, {job.job_address_state} {job.job_address_zip}</p>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(`${job.job_address_street}, ${job.job_address_city}, ${job.job_address_state}`)}`} target="_blank" className="btn-secondary mt-4 inline-flex">Open in Maps</a>
                </div>
              ) : <p className="text-white/40">No address set</p>}
            </div>

            {customer && (
              <div className="card p-6">
                <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><User className="w-5 h-5" />Customer</h2>
                <p className="text-white font-medium mb-2">{customer.name}</p>
                {customer.company && <p className="text-white/60 mb-3">{customer.company}</p>}
                <div className="space-y-2">
                  {customer.phone && <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-white/70 hover:text-white"><Phone className="w-4 h-4" />{customer.phone}</a>}
                  {customer.email && <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-white/70 hover:text-white"><Mail className="w-4 h-4" />{customer.email}</a>}
                </div>
              </div>
            )}
          </div>

          {job.internal_notes && (
            <div className="card p-6 border-amber-500/30 bg-amber-500/5">
              <h2 className="font-semibold text-white mb-2">Internal Notes</h2>
              <p className="text-white/70">{job.internal_notes}</p>
            </div>
          )}
        </>
      )}

      {/* Add Flag Modal */}
      {showAddFlagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowAddFlagModal(false)}>
          <div className="bg-dark-card rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <h2 className="text-lg font-semibold text-white">Add Flag</h2>
              <button onClick={() => setShowAddFlagModal(false)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-2">
              {availableFlags.map((flag: any) => (
                <button key={flag.id} onClick={() => handleAddFlag(flag.id)} className="w-full p-3 rounded-lg bg-dark-bg hover:bg-dark-card-hover transition-colors flex items-center gap-3">
                  <Flag className="w-4 h-4" style={{ color: flag.color }} />
                  <span className="text-white">{flag.name}</span>
                </button>
              ))}
              {availableFlags.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-white/40 mb-2">No flags available</p>
                  <Link href="/admin/settings" className="text-brand-500 text-sm">Create flags in Settings</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Checklist Modal */}
      {showAddChecklistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowAddChecklistModal(false)}>
          <div className="bg-dark-card rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <h2 className="text-lg font-semibold text-white">Add Checklist</h2>
              <button onClick={() => setShowAddChecklistModal(false)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-2">
              {availableTemplates.map((template: any) => (
                <button key={template.id} onClick={() => handleAddChecklist(template.id)} className="w-full p-3 rounded-lg bg-dark-bg hover:bg-dark-card-hover transition-colors text-left">
                  <p className="text-white font-medium">{template.name}</p>
                  <p className="text-white/40 text-sm">{template.items?.length || 0} items</p>
                </button>
              ))}
              {availableTemplates.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-white/40 mb-2">No checklist templates available</p>
                  <Link href="/admin/settings" className="text-brand-500 text-sm">Create templates in Settings</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
