'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseQuery, optimisticUpdate } from '@/lib/offline/swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import { savePhotoOffline, updateJobOffline, isOnline } from '@/lib/offline/storage';
import { ArrowLeft, MapPin, Phone, Mail, Calendar, Clock, Camera, Check, ChevronDown, ChevronUp, Navigation, AlertTriangle, X, Trash2, ZoomIn, Download, FileText, File, Image as ImageIcon } from 'lucide-react';
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
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const { data: job, mutate } = useSupabaseQuery(`field-job-${jobId}`, async (supabase) => {
    const { data } = await supabase.from('jobs').select(`*, stage:job_stages(*), customer:customers(*), checklists:job_checklists(*, items:job_checklist_items(*)), photos:job_photos(*)`).eq('id', jobId).single();
    return data;
  });

  const { data: files } = useSupabaseQuery(`field-job-files-${jobId}`, async (supabase) => {
    const { data } = await supabase.from('job_files').select('*').eq('job_id', jobId).order('created_at', { ascending: false });
    return data || [];
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
        const fileExt = compressedFile.type.split('/')[1] || 'jpg';
        const fileName = `${jobId}/${photoType}-${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage.from('job-photos').upload(fileName, compressedFile, {
          contentType: compressedFile.type,
          cacheControl: '3600',
          upsert: false
        });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(uploadError.message);
        }

        const { error: dbError } = await supabase.from('job_photos').insert({
          job_id: jobId,
          photo_type: photoType,
          storage_path: fileName
        });

        if (dbError) {
          console.error('Database error:', dbError);
          // Clean up uploaded file if DB insert fails
          await supabase.storage.from('job-photos').remove([fileName]);
          throw new Error(dbError.message);
        }

        toast.success('Photo uploaded');
        mutate();
      } else {
        await savePhotoOffline(jobId, compressedFile, photoType);
        toast.success('Saved offline');
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error?.message || 'Upload failed');
    }
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

  const getPhotoUrl = (storagePath: string) => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/job-photos/${storagePath}`;
    console.log('Photo URL:', url); // Debug logging
    return url;
  };

  const handleDownloadPhoto = useCallback(async (photo: any) => {
    setDownloadingPhoto(true);
    try {
      const photoUrl = getPhotoUrl(photo.storage_path);
      console.log('Downloading from:', photoUrl);

      const response = await fetch(photoUrl);
      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('Blob type:', blob.type, 'size:', blob.size);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Generate filename: jobId-photoType-timestamp.jpg
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
  }, [jobId]);

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

  const handleDownloadFile = useCallback(async (file: any) => {
    try {
      const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/job-files/${file.storage_path}`;
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
  }, []);

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
                        src={getPhotoUrl(photo.storage_path)}
                        alt={getPhotoTypeLabel(photo.photo_type)}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onLoad={() => console.log('Image loaded successfully:', photo.storage_path)}
                        onError={(e) => {
                          console.error('Image failed to load:', photo.storage_path, e);
                          setImageErrors(prev => new Set(prev).add(photo.id));
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <Camera className="w-8 h-8 text-white/20 mb-2" />
                        <p className="text-xs text-white/40">Failed to load</p>
                        <p className="text-xs text-white/30 mt-1 px-2 text-center break-all">{photo.storage_path}</p>
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

      {/* Files Section */}
      {files && files.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />Job Files
          </h2>
          <div className="space-y-2">
            {files.map((file: any) => {
              const FileIcon = getFileIcon(file.file_type);
              const isPdf = file.file_type === 'application/pdf';
              return (
                <button
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className="w-full bg-dark-bg rounded-lg p-4 flex items-center gap-4 active:bg-dark-card-hover transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-brand-500/20 rounded-lg flex items-center justify-center">
                    <FileIcon className="w-5 h-5 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-white font-medium truncate">{file.file_name}</p>
                    <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>{format(new Date(file.created_at), 'MMM d, yyyy')}</span>
                      {isPdf && <span className="text-brand-500">• Tap to view</span>}
                    </div>
                  </div>
                  {!isPdf && <Download className="w-5 h-5 text-white/40 flex-shrink-0" />}
                  {isPdf && <ZoomIn className="w-5 h-5 text-white/40 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
                  onLoad={() => console.log('Modal image loaded successfully:', selectedPhoto.storage_path)}
                  onError={(e) => {
                    console.error('Modal image failed to load:', selectedPhoto.storage_path, e);
                    setImageErrors(prev => new Set(prev).add(selectedPhoto.id));
                  }}
                />
              ) : (
                <div className="w-full h-64 flex flex-col items-center justify-center p-4">
                  <Camera className="w-16 h-16 text-white/20 mb-4" />
                  <p className="text-white/40 mb-2">Failed to load image</p>
                  <p className="text-xs text-white/30 break-all text-center">{selectedPhoto.storage_path}</p>
                  <p className="text-xs text-white/20 mt-2">Check browser console for details</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownloadPhoto(selectedPhoto)}
                  disabled={downloadingPhoto}
                  className="flex-1 btn-field-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  {downloadingPhoto ? 'Downloading...' : 'Download Full Size'}
                </button>
                <button
                  onClick={() => handleDeletePhoto(selectedPhoto)}
                  disabled={deletingPhoto}
                  className="flex-1 btn-field-secondary bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-5 h-5" />
                  {deletingPhoto ? 'Deleting...' : 'Delete'}
                </button>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="w-full btn-field-secondary"
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
                <span className="text-white font-medium truncate">{selectedFile.file_name}</span>
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
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleDownloadFile(selectedFile)}
                className="w-full btn-field-primary"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
              <button
                onClick={() => setSelectedFile(null)}
                className="w-full btn-field-secondary"
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
