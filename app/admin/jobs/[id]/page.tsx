'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ArrowLeft, Edit2, Trash2, Save, X, MapPin, Calendar, DollarSign, User, Phone, Mail, Flag, Plus, ClipboardList, CheckSquare, Square, Camera, Download, ZoomIn, Upload, FileText, File, Image as ImageIcon } from 'lucide-react';
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
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingFile, setDeletingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

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

  const { data: photos, mutate: mutatePhotos } = useSupabaseQuery(`job-photos-${jobId}`, async (supabase) => {
    const { data } = await supabase.from('job_photos').select('*').eq('job_id', jobId).order('created_at', { ascending: false });
    return data || [];
  });

  const { data: files, mutate: mutateFiles } = useSupabaseQuery(`job-files-${jobId}`, async (supabase) => {
    const { data } = await supabase.from('job_files').select('*').eq('job_id', jobId).order('created_at', { ascending: false });
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

    const { error } = await supabase.from('jobs').update({
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
    }).eq('id', jobId);
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
    if (error) {
      console.error('Remove flag error:', error);
      toast.error('Failed to remove: ' + (error.message || 'Unknown error'));
    } else {
      toast.success('Removed');
      mutateFlags();
    }
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

  const getPhotoUrl = (storagePath: string) => {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/job-photos/${storagePath}`;
  };

  const getPhotoTypeLabel = (type: string) => {
    const labels: Record<string, string> = { before: 'Before', after: 'After', progress: 'Progress', other: 'Other' };
    return labels[type] || type;
  };

  const getPhotoTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      before: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      after: 'bg-green-500/20 text-green-400 border-green-500/30',
      progress: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      other: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[type] || colors.other;
  };

  const handleDownloadPhoto = async (photo: any) => {
    setDownloadingPhoto(true);
    try {
      const photoUrl = getPhotoUrl(photo.storage_path);
      const response = await fetch(photoUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const timestamp = format(new Date(photo.created_at), 'yyyyMMdd-HHmmss');
      const fileExt = photo.storage_path.split('.').pop() || 'jpg';
      a.download = `${jobId}-${photo.photo_type}-${timestamp}.${fileExt}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Photo downloaded');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error?.message || 'Failed to download photo');
    } finally {
      setDownloadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photo: any) => {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    setDeletingPhoto(true);
    try {
      const supabase = getSupabaseClient();
      // Delete from storage
      await supabase.storage.from('job-photos').remove([photo.storage_path]);
      // Delete from database
      await supabase.from('job_photos').delete().eq('id', photo.id);
      toast.success('Photo deleted');
      mutatePhotos();
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete photo');
    } finally {
      setDeletingPhoto(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    event.target.value = '';

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

    setUploadingFile(true);
    try {
      const supabase = getSupabaseClient();
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${jobId}/${timestamp}-${sanitizedFileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('job-files')
        .upload(storagePath, file);

      if (uploadError) throw new Error(uploadError.message);

      // Save metadata to database
      const { error: dbError } = await supabase.from('job_files').insert({
        job_id: jobId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath
      });

      if (dbError) {
        // Rollback storage upload if DB insert fails
        await supabase.storage.from('job-files').remove([storagePath]);
        throw new Error(dbError.message);
      }

      toast.success('File uploaded');
      mutateFiles();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.message || 'Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const getFileUrl = (storagePath: string) => {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/job-files/${storagePath}`;
  };

  const handleFileClick = (file: any) => {
    if (file.file_type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      handleDownloadFile(file);
    }
  };

  const handleDownloadFile = async (file: any) => {
    try {
      const fileUrl = getFileUrl(file.storage_path);
      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('File downloaded');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error?.message || 'Failed to download file');
    }
  };

  const handleDeleteFile = async (file: any) => {
    if (!confirm('Delete this file? This cannot be undone.')) return;
    setDeletingFile(true);
    try {
      const supabase = getSupabaseClient();
      // Delete from storage
      await supabase.storage.from('job-files').remove([file.storage_path]);
      // Delete from database
      await supabase.from('job_files').delete().eq('id', file.id);
      toast.success('File deleted');
      mutateFiles();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    } finally {
      setDeletingFile(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType === 'application/pdf') return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
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

          {/* Photos Section */}
          <div className="card p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5" />Job Photos
            </h2>

            {(photos?.length ?? 0) > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-white/60">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {photos.map((photo: any) => (
                    <div key={photo.id} className="relative group">
                      <button
                        onClick={() => setSelectedPhoto(photo)}
                        className="w-full aspect-square rounded-lg overflow-hidden bg-dark-bg relative"
                      >
                        {!imageErrors.has(photo.id) ? (
                          <img
                            src={getPhotoUrl(photo.storage_path)}
                            alt={getPhotoTypeLabel(photo.photo_type)}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={() => setImageErrors(prev => new Set(prev).add(photo.id))}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center">
                            <Camera className="w-8 h-8 text-white/20 mb-2" />
                            <p className="text-xs text-white/40">Failed to load</p>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-2 left-2">
                          <span className={`text-xs px-2 py-1 rounded-md border ${getPhotoTypeBadgeColor(photo.photo_type)}`}>
                            {getPhotoTypeLabel(photo.photo_type)}
                          </span>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-xs text-white/90 drop-shadow-lg">
                            {format(new Date(photo.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="w-5 h-5 text-white drop-shadow-lg" />
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(photo);
                        }}
                        disabled={deletingPhoto}
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">
                <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No photos uploaded yet</p>
                <p className="text-sm mt-1">Photos will appear here once field workers upload them</p>
              </div>
            )}
          </div>

          {/* Files Section */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />Job Files
              </h2>
              <label className="btn-primary cursor-pointer">
                <Upload className="w-4 h-4" />
                {uploadingFile ? 'Uploading...' : 'Upload File'}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                />
              </label>
            </div>

            {(files?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {files.map((file: any) => {
                  const FileIcon = getFileIcon(file.file_type);
                  const isPdf = file.file_type === 'application/pdf';
                  return (
                    <div key={file.id} className="bg-dark-bg rounded-lg overflow-hidden hover:bg-dark-card-hover transition-colors">
                      <button
                        onClick={() => handleFileClick(file)}
                        className="w-full p-4 flex items-center gap-4 text-left"
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-brand-500/20 rounded-lg flex items-center justify-center">
                          <FileIcon className="w-5 h-5 text-brand-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{file.file_name}</p>
                          <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                            <span>{formatFileSize(file.file_size)}</span>
                            <span>•</span>
                            <span>{format(new Date(file.created_at), 'MMM d, yyyy')}</span>
                            {isPdf && <span className="text-brand-500">• Click to view</span>}
                          </div>
                        </div>
                        {!isPdf && <Download className="w-5 h-5 text-white/40 flex-shrink-0" />}
                        {isPdf && <ZoomIn className="w-5 h-5 text-white/40 flex-shrink-0" />}
                      </button>
                      <div className="px-4 pb-4 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(file);
                          }}
                          className="btn-icon text-white/60 hover:text-white"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file);
                          }}
                          disabled={deletingFile}
                          className="btn-icon text-white/60 hover:text-red-400 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No files uploaded yet</p>
                <p className="text-sm mt-1">Upload PDFs, images, or documents for this job</p>
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

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`text-sm px-3 py-1.5 rounded-lg border ${getPhotoTypeBadgeColor(selectedPhoto.photo_type)}`}>
                  {getPhotoTypeLabel(selectedPhoto.photo_type)}
                </span>
                <span className="text-sm text-white/60">
                  {format(new Date(selectedPhoto.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Image */}
            <div className="relative bg-dark-bg rounded-xl overflow-hidden mb-4">
              {!imageErrors.has(selectedPhoto.id) ? (
                <img
                  src={getPhotoUrl(selectedPhoto.storage_path)}
                  alt={getPhotoTypeLabel(selectedPhoto.photo_type)}
                  className="w-full max-h-[70vh] object-contain"
                  onError={() => setImageErrors(prev => new Set(prev).add(selectedPhoto.id))}
                />
              ) : (
                <div className="w-full h-64 flex flex-col items-center justify-center p-4">
                  <Camera className="w-16 h-16 text-white/20 mb-4" />
                  <p className="text-white/40 mb-2">Failed to load image</p>
                  <p className="text-xs text-white/30 break-all text-center">{selectedPhoto.storage_path}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownloadPhoto(selectedPhoto)}
                  disabled={downloadingPhoto}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  {downloadingPhoto ? 'Downloading...' : 'Download Full Size'}
                </button>
                <button
                  onClick={() => handleDeletePhoto(selectedPhoto)}
                  disabled={deletingPhoto}
                  className="flex-1 btn-secondary bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-5 h-5" />
                  {deletingPhoto ? 'Deleting...' : 'Delete'}
                </button>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="w-full btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setSelectedFile(null)}>
          <div className="relative max-w-6xl w-full h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-brand-500" />
                <span className="text-white font-medium">{selectedFile.file_name}</span>
                <span className="text-sm text-white/60">
                  {formatFileSize(selectedFile.file_size)} • {format(new Date(selectedFile.created_at), 'MMM d, yyyy')}
                </span>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 bg-dark-bg rounded-xl overflow-hidden mb-4">
              <iframe
                src={getFileUrl(selectedFile.storage_path)}
                className="w-full h-full"
                title={selectedFile.file_name}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleDownloadFile(selectedFile)}
                className="flex-1 btn-primary"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
              <button
                onClick={() => {
                  handleDeleteFile(selectedFile);
                  setSelectedFile(null);
                }}
                disabled={deletingFile}
                className="flex-1 btn-secondary bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                {deletingFile ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setSelectedFile(null)}
                className="flex-1 btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
