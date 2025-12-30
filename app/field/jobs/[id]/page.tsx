'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseQuery, optimisticUpdate } from '@/lib/offline/swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import { savePhotoOffline, updateJobOffline, isOnline } from '@/lib/offline/storage';
import { ArrowLeft, MapPin, Phone, Mail, Calendar, Clock, Camera, Check, ChevronDown, ChevronUp, Navigation, AlertTriangle, X, Trash2, ZoomIn } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';

export default function FieldJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set(['master']));
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const { data: job, mutate } = useSupabaseQuery(`field-job-${jobId}`, async (supabase) => {
    const { data } = await supabase.from('jobs').select(`*, stage:job_stages(*), customer:customers(*), checklists:job_checklists(*, items:job_checklist_items(*)), photos:job_photos(*)`).eq('id', jobId).single();
    return data;
  });

  const handleToggleItem = useCallback(async (checklistId: string, itemId: string, currentChecked: boolean) => {
    const newChecked = !currentChecked;
    await optimisticUpdate(`field-job-${jobId}`, (current: any) => {
      if (!current) return current;
      return { ...current, checklists: current.checklists.map((cl: any) => cl.id === checklistId ? { ...cl, items: cl.items.map((item: any) => item.id === itemId ? { ...item, is_checked: newChecked } : item) } : cl) };
    }, async () => {
      if (isOnline()) {
        const supabase = getSupabaseClient();
        await supabase.from('job_checklist_items').update({
          is_checked: newChecked,
          checked_at: newChecked ? new Date().toISOString() : null
        }).eq('id', itemId);
      } else {
        await updateJobOffline(jobId, { checklistItemUpdate: { itemId, is_checked: newChecked } });
      }
    });
    if (navigator.vibrate) navigator.vibrate(10);
  }, [jobId]);

  const handlePhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>, photoType: 'before' | 'after' | 'progress') => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
      if (isOnline()) {
        const supabase = getSupabaseClient();
        const fileName = `${jobId}/${photoType}-${Date.now()}.jpg`;
        await supabase.storage.from('job-photos').upload(fileName, compressedFile);
        await supabase.from('job_photos').insert({ job_id: jobId, photo_type: photoType, storage_path: fileName });
        toast.success('Photo uploaded');
        mutate();
      } else {
        await savePhotoOffline(jobId, compressedFile, photoType);
        toast.success('Saved offline');
      }
    } catch { toast.error('Upload failed'); }
    finally { setUploadingPhoto(false); event.target.value = ''; }
  }, [jobId, mutate]);

  const handleDeletePhoto = useCallback(async (photo: any) => {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    setDeletingPhoto(true);
    try {
      if (isOnline()) {
        const supabase = getSupabaseClient();
        // Delete from storage
        await supabase.storage.from('job-photos').remove([photo.storage_path]);
        // Delete from database
        await supabase.from('job_photos').delete().eq('id', photo.id);
        toast.success('Photo deleted');
        mutate();
        setSelectedPhoto(null);
      } else {
        toast.error('Must be online to delete photos');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete photo');
    } finally {
      setDeletingPhoto(false);
    }
  }, [mutate]);

  const toggleChecklist = (id: string) => setExpandedChecklists(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const openNavigation = () => {
    if (!job) return;
    const address = `${job.job_address_street || ''}, ${job.job_address_city || ''}, ${job.job_address_state || ''} ${job.job_address_zip || ''}`;
    window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
  };

  const getPhotoUrl = (storagePath: string, width?: number) => {
    const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/job-photos/${storagePath}`;
    // Use Supabase image transformations for thumbnails
    return width ? `${baseUrl}?width=${width}&quality=80` : baseUrl;
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

  if (!job) return <div className="space-y-4"><div className="skeleton h-48 rounded-xl" /><div className="skeleton h-32 rounded-xl" /><div className="skeleton h-64 rounded-xl" /></div>;

  return (
    <div className="space-y-6 pb-8">
      <button onClick={() => router.back()} className="btn-field-secondary w-full"><ArrowLeft className="w-5 h-5" />Back to Jobs</button>

      <div className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div><h1 className="text-2xl font-bold text-white mb-1">{job.name}</h1><p className="text-white/60">{job.customer?.company || job.customer?.name || 'No customer'}</p></div>
          {job.stage && <span className="badge text-sm" style={{ backgroundColor: `${job.stage.color}20`, color: job.stage.color }}>{job.stage.name}</span>}
        </div>
        {job.description && <p className="text-white/70 text-sm mb-4">{job.description}</p>}
        <div className="flex flex-wrap gap-4 text-sm text-white/60 mb-4">
          {job.scheduled_date && <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{format(new Date(job.scheduled_date), 'MMM d, yyyy')}</div>}
          {job.scheduled_time_start && <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{job.scheduled_time_start}{job.scheduled_time_end && ` - ${job.scheduled_time_end}`}</div>}
        </div>
        <button onClick={openNavigation} className="btn-field-primary w-full"><Navigation className="w-5 h-5" />Navigate to Job Site</button>
        <div className="mt-4 p-3 bg-dark-bg rounded-lg"><div className="flex items-start gap-2 text-white/70"><MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{job.job_address_street}, {job.job_address_city}, {job.job_address_state} {job.job_address_zip}</span></div></div>
      </div>

      {job.customer && (
        <div className="card p-5">
          <h2 className="font-semibold text-white mb-4">Contact</h2>
          <div className="space-y-3">
            <p className="text-white font-medium">{job.customer.name}{job.customer.company && <span className="text-white/60 font-normal"> — {job.customer.company}</span>}</p>
            {job.customer.phone && <a href={`tel:${job.customer.phone}`} className="btn-field-secondary w-full"><Phone className="w-5 h-5" />{job.customer.phone}</a>}
            {job.customer.email && <a href={`mailto:${job.customer.email}`} className="btn-field-secondary w-full"><Mail className="w-5 h-5" />{job.customer.email}</a>}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-semibold text-white mb-4">Photos</h2>
        {(job.photos_required_before || job.photos_required_after) && <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" /><div className="text-sm text-amber-200">{job.photos_required_before && <p>Before photos required</p>}{job.photos_required_after && <p>After photos required</p>}</div></div>}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="btn-field-secondary cursor-pointer"><Camera className="w-5 h-5" /><span>Before</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(e, 'before')} disabled={uploadingPhoto} /></label>
          <label className="btn-field-secondary cursor-pointer"><Camera className="w-5 h-5" /><span>After</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(e, 'after')} disabled={uploadingPhoto} /></label>
        </div>
        <label className="btn-field-secondary w-full cursor-pointer"><Camera className="w-5 h-5" /><span>Progress Photo</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(e, 'progress')} disabled={uploadingPhoto} /></label>
        {uploadingPhoto && <p className="text-center text-white/60 text-sm mt-3">Uploading...</p>}

        {job.photos?.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-white/60">{job.photos.length} photo{job.photos.length !== 1 ? 's' : ''} uploaded</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {job.photos.map((photo: any) => (
                <div key={photo.id} className="relative group">
                  <button
                    onClick={() => setSelectedPhoto(photo)}
                    className="w-full aspect-square rounded-lg overflow-hidden bg-dark-bg relative"
                  >
                    {!imageErrors.has(photo.id) ? (
                      <img
                        src={getPhotoUrl(photo.storage_path, 400)}
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-2 left-2">
                      <span className={`text-xs px-2 py-1 rounded-md border ${getPhotoTypeBadgeColor(photo.photo_type)}`}>
                        {getPhotoTypeLabel(photo.photo_type)}
                      </span>
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
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-white text-lg">Checklists</h2>
        {job.checklists?.map((checklist: any) => {
          const isExpanded = expandedChecklists.has(checklist.id) || (checklist.is_master && expandedChecklists.has('master'));
          const checkedCount = checklist.items?.filter((i: any) => i.is_checked).length || 0;
          const totalCount = checklist.items?.length || 0;
          const isComplete = checkedCount === totalCount && totalCount > 0;
          return (
            <div key={checklist.id} className="card overflow-hidden">
              <button onClick={() => toggleChecklist(checklist.id)} className="w-full p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isComplete ? 'bg-green-500/20' : 'bg-dark-bg'}`}>{isComplete ? <Check className="w-5 h-5 text-green-400" /> : <span className="text-sm font-mono text-white/60">{checkedCount}/{totalCount}</span>}</div>
                  <div className="text-left"><h3 className="font-semibold text-white">{checklist.name}</h3>{checklist.is_master && <span className="text-xs text-brand-500">Master</span>}</div>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
              </button>
              {isExpanded && <div className="border-t border-dark-border">{checklist.items?.map((item: any) => (
                <button key={item.id} onClick={() => handleToggleItem(checklist.id, item.id, item.is_checked)} className="w-full p-4 flex items-center gap-4 border-b border-dark-border last:border-b-0 active:bg-dark-card-hover transition-colors">
                  <div className={`checkbox-field ${item.is_checked ? 'checked' : ''}`}>{item.is_checked && <Check className="w-4 h-4 text-black" />}</div>
                  <span className={`flex-1 text-left text-lg ${item.is_checked ? 'text-white/40 line-through' : 'text-white'}`}>{item.text}{item.is_required && <span className="text-red-400 ml-1">*</span>}</span>
                </button>
              ))}</div>}
            </div>
          );
        })}
      </div>

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
                <div className="w-full h-64 flex flex-col items-center justify-center">
                  <Camera className="w-16 h-16 text-white/20 mb-4" />
                  <p className="text-white/40">Failed to load image</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleDeletePhoto(selectedPhoto)}
                disabled={deletingPhoto}
                className="flex-1 btn-field-secondary bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-5 h-5" />
                {deletingPhoto ? 'Deleting...' : 'Delete Photo'}
              </button>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="flex-1 btn-field-secondary"
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
