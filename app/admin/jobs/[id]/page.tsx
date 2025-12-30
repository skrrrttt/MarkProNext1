'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ArrowLeft, Edit2, Trash2, Save, X, MapPin, Calendar, Clock, DollarSign, User, Phone, Mail, Flag, CheckSquare, Camera } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function AdminJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);

  const { data: job, mutate } = useSupabaseQuery(`admin-job-${jobId}`, async (supabase) => {
    const { data } = await supabase
      .from('jobs')
      .select(`*, stage:job_stages(*), customer:customers(*), checklists:job_checklists(*, items:job_checklist_items(*)), photos:job_photos(*), flags:job_flags_junction(id, flag:custom_flags(*))`)
      .eq('id', jobId)
      .single();
    return data;
  });

  const { data: stages } = useSupabaseQuery('job-stages', async (supabase) => {
    const { data } = await supabase.from('job_stages').select('*').eq('is_active', true).order('sort_order');
    return data || [];
  });

  const { data: customers } = useSupabaseQuery('customers-list', async (supabase) => {
    const { data } = await supabase.from('customers').select('id, name, company').eq('is_active', true).order('name');
    return data || [];
  });

  const handleStageChange = async (newStageId: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('jobs').update({ stage_id: newStageId }).eq('id', jobId);
    if (error) {
      toast.error('Failed to update stage');
    } else {
      toast.success('Stage updated');
      mutate();
    }
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
      scheduled_time_start: formData.get('scheduled_time_start') as string || null,
      scheduled_time_end: formData.get('scheduled_time_end') as string || null,
      quote_amount: formData.get('quote_amount') ? parseFloat(formData.get('quote_amount') as string) : null,
      final_amount: formData.get('final_amount') ? parseFloat(formData.get('final_amount') as string) : null,
      internal_notes: formData.get('internal_notes') as string || null,
      photos_required_before: formData.get('photos_required_before') === 'on',
      photos_required_after: formData.get('photos_required_after') === 'on',
    };

    const { error } = await supabase.from('jobs').update(updates).eq('id', jobId);

    if (error) {
      toast.error('Failed to update job');
    } else {
      toast.success('Job updated');
      setIsEditing(false);
      mutate();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('jobs').delete().eq('id', jobId);

    if (error) {
      toast.error('Failed to delete job');
    } else {
      toast.success('Job deleted');
      router.push('/admin/jobs');
    }
  };

  if (!job) {
    return <div className="space-y-4"><div className="skeleton h-12 rounded-lg w-32" /><div className="skeleton h-64 rounded-xl" /></div>;
  }

  const checklistProgress = job.checklists?.reduce((acc: any, cl: any) => {
    const checked = cl.items?.filter((i: any) => i.is_checked).length || 0;
    const total = cl.items?.length || 0;
    return { checked: acc.checked + checked, total: acc.total + total };
  }, { checked: 0, total: 0 }) || { checked: 0, total: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/admin/jobs')} className="btn-secondary"><ArrowLeft className="w-4 h-4" />Back</button>
        <div className="flex gap-2">
          <button onClick={() => setIsEditing(!isEditing)} className="btn-secondary">
            {isEditing ? <><X className="w-4 h-4" />Cancel</> : <><Edit2 className="w-4 h-4" />Edit</>}
          </button>
          <button onClick={handleDelete} className="btn-secondary text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Job Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><label className="label">Job Name *</label><input type="text" name="name" required className="input" defaultValue={job.name} /></div>
              <div><label className="label">Customer</label><select name="customer_id" className="input" defaultValue={job.customer_id || ''}><option value="">No customer</option>{customers?.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}</select></div>
              <div><label className="label">Stage</label><select name="stage_id" className="input" defaultValue={job.stage_id || ''}>{stages?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div className="md:col-span-2"><label className="label">Description</label><textarea name="description" rows={3} className="input" defaultValue={job.description || ''} /></div>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Schedule & Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="label">Scheduled Date</label><input type="date" name="scheduled_date" className="input" defaultValue={job.scheduled_date || ''} /></div>
              <div><label className="label">Start Time</label><input type="time" name="scheduled_time_start" className="input" defaultValue={job.scheduled_time_start || ''} /></div>
              <div><label className="label">End Time</label><input type="time" name="scheduled_time_end" className="input" defaultValue={job.scheduled_time_end || ''} /></div>
              <div><label className="label">Quote Amount</label><input type="number" name="quote_amount" step="0.01" className="input" defaultValue={job.quote_amount || ''} /></div>
              <div><label className="label">Final Amount</label><input type="number" name="final_amount" step="0.01" className="input" defaultValue={job.final_amount || ''} /></div>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Job Address</h2>
            <div><label className="label">Street</label><input type="text" name="address_street" className="input" defaultValue={job.job_address_street || ''} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="label">City</label><input type="text" name="address_city" className="input" defaultValue={job.job_address_city || ''} /></div>
              <div><label className="label">State</label><input type="text" name="address_state" className="input" defaultValue={job.job_address_state || ''} /></div>
              <div><label className="label">ZIP</label><input type="text" name="address_zip" className="input" defaultValue={job.job_address_zip || ''} /></div>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Settings</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" name="photos_required_before" defaultChecked={job.photos_required_before} className="rounded" /><span className="text-white">Require before photos</span></label>
              <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" name="photos_required_after" defaultChecked={job.photos_required_after} className="rounded" /><span className="text-white">Require after photos</span></label>
            </div>
            <div><label className="label">Internal Notes</label><textarea name="internal_notes" rows={3} className="input" defaultValue={job.internal_notes || ''} placeholder="Notes only visible to admin..." /></div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1"><Save className="w-4 h-4" />Save Changes</button>
          </div>
        </form>
      ) : (
        <>
          <div className="card p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">{job.name}</h1>
                {job.customer && (
                  <Link href={`/admin/customers/${job.customer.id}`} className="text-white/60 hover:text-brand-500 flex items-center gap-2">
                    <User className="w-4 h-4" />{job.customer.name}{job.customer.company && ` • ${job.customer.company}`}
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-sm">Stage:</span>
                <select value={job.stage_id || ''} onChange={(e) => handleStageChange(e.target.value)} className="input py-1.5 px-3 text-sm" style={{ backgroundColor: job.stage ? `${job.stage.color}20` : undefined, color: job.stage?.color || 'white', borderColor: job.stage?.color || undefined }}>
                  {stages?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {job.description && <p className="text-white/70 mb-4">{job.description}</p>}

            {job.flags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {job.flags.map((f: any) => f.flag && <span key={f.id} className="tag" style={{ backgroundColor: `${f.flag.color}20`, color: f.flag.color }}><Flag className="w-3 h-3" />{f.flag.name}</span>)}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-dark-border">
              <div><p className="text-white/40 text-sm">Scheduled</p><p className="text-white font-medium flex items-center gap-2"><Calendar className="w-4 h-4 text-white/40" />{job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM d, yyyy') : '—'}</p></div>
              <div><p className="text-white/40 text-sm">Time</p><p className="text-white font-medium flex items-center gap-2"><Clock className="w-4 h-4 text-white/40" />{job.scheduled_time_start || '—'}</p></div>
              <div><p className="text-white/40 text-sm">Quote</p><p className="text-white font-medium flex items-center gap-2"><DollarSign className="w-4 h-4 text-white/40" />{job.quote_amount ? `$${job.quote_amount.toLocaleString()}` : '—'}</p></div>
              <div><p className="text-white/40 text-sm">Checklists</p><p className="text-white font-medium flex items-center gap-2"><CheckSquare className="w-4 h-4 text-white/40" />{checklistProgress.checked}/{checklistProgress.total}</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><MapPin className="w-5 h-5" />Job Address</h2>
              {job.job_address_street ? (
                <div>
                  <p className="text-white">{job.job_address_street}</p>
                  <p className="text-white/60">{job.job_address_city}, {job.job_address_state} {job.job_address_zip}</p>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(`${job.job_address_street}, ${job.job_address_city}, ${job.job_address_state} ${job.job_address_zip}`)}`} target="_blank" className="btn-secondary mt-4 inline-flex">Open in Maps</a>
                </div>
              ) : <p className="text-white/40">No address set</p>}
            </div>

            {job.customer && (
              <div className="card p-6">
                <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><User className="w-5 h-5" />Customer Contact</h2>
                <p className="text-white font-medium mb-2">{job.customer.name}</p>
                {job.customer.company && <p className="text-white/60 mb-3">{job.customer.company}</p>}
                <div className="space-y-2">
                  {job.customer.phone && <a href={`tel:${job.customer.phone}`} className="flex items-center gap-2 text-white/70 hover:text-white"><Phone className="w-4 h-4" />{job.customer.phone}</a>}
                  {job.customer.email && <a href={`mailto:${job.customer.email}`} className="flex items-center gap-2 text-white/70 hover:text-white"><Mail className="w-4 h-4" />{job.customer.email}</a>}
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Camera className="w-5 h-5" />Photos ({job.photos?.length || 0})</h2>
            {job.photos?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {job.photos.map((photo: any) => (
                  <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-dark-bg">
                    <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/job-photos/${photo.storage_path}`} alt={photo.photo_type} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : <p className="text-white/40">No photos uploaded yet</p>}
          </div>

          {job.internal_notes && (
            <div className="card p-6 border-amber-500/30 bg-amber-500/5">
              <h2 className="font-semibold text-white mb-2">Internal Notes</h2>
              <p className="text-white/70">{job.internal_notes}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
