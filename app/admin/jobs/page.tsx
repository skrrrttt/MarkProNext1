'use client';

import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Plus, Search, Filter, Calendar, List, Columns3, ChevronRight, Flag, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type ViewMode = 'pipeline' | 'list' | 'calendar';

export default function AdminJobsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stages } = useSupabaseQuery('job-stages', async (supabase) => {
    const { data } = await supabase.from('job_stages').select('*').eq('is_active', true).order('sort_order');
    return data || [];
  });

  const { data: jobs, mutate } = useSupabaseQuery('admin-jobs', async (supabase) => {
    const { data } = await supabase.from('jobs').select(`*, stage:job_stages(*), customer:customers(id, name, company, phone), flags:job_flags_junction(id, flag:custom_flags(*))`).order('created_at', { ascending: false });
    return data || [];
  });

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    if (!searchQuery) return jobs;
    const query = searchQuery.toLowerCase();
    return jobs.filter((job: any) => job.name.toLowerCase().includes(query) || job.customer?.name?.toLowerCase().includes(query) || job.customer?.company?.toLowerCase().includes(query));
  }, [jobs, searchQuery]);

  const jobsByStage = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    stages?.forEach((stage: any) => { grouped[stage.id] = filteredJobs.filter((job: any) => job.stage_id === stage.id); });
    return grouped;
  }, [filteredJobs, stages]);

  const handleStageChange = async (jobId: string, newStageId: string) => {
    const supabase = getSupabaseClient();
    mutate(jobs?.map((job: any) => job.id === jobId ? { ...job, stage_id: newStageId, stage: stages?.find((s: any) => s.id === newStageId) } : job), false);
    const { error } = await supabase.from('jobs').update({ stage_id: newStageId }).eq('id', jobId);
    if (error) { toast.error('Failed to update'); mutate(); } else { toast.success('Job moved'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Jobs</h1><p className="text-white/60 mt-1">{jobs?.length || 0} total jobs</p></div>
        <button className="btn-primary"><Plus className="w-4 h-4" />New Job</button>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" /><input type="text" placeholder="Search jobs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" /></div>
        <div className="flex items-center gap-1 bg-dark-card rounded-lg p-1">
          <button onClick={() => setViewMode('pipeline')} className={`btn-icon ${viewMode === 'pipeline' ? 'bg-white/10 text-white' : 'text-white/40'}`}><Columns3 className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('list')} className={`btn-icon ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40'}`}><List className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('calendar')} className={`btn-icon ${viewMode === 'calendar' ? 'bg-white/10 text-white' : 'text-white/40'}`}><Calendar className="w-4 h-4" /></button>
        </div>
        <button className="btn-secondary"><Filter className="w-4 h-4" />Filters</button>
      </div>

      {viewMode === 'pipeline' && (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
          {stages?.map((stage: any) => (
            <div key={stage.id} className="kanban-column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const jobId = e.dataTransfer.getData('jobId'); if (jobId) handleStageChange(jobId, stage.id); }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} /><h3 className="font-semibold text-white">{stage.name}</h3><span className="text-white/40 text-sm">({jobsByStage[stage.id]?.length || 0})</span></div>
                {stage.is_field_visible && <span className="text-xs text-green-400">Field</span>}
              </div>
              <div className="space-y-3">
                {jobsByStage[stage.id]?.map((job: any) => (
                  <Link key={job.id} href={`/admin/jobs/${job.id}`} draggable onDragStart={(e) => e.dataTransfer.setData('jobId', job.id)} className="card-interactive block p-3 cursor-grab active:cursor-grabbing">
                    {job.flags?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{job.flags.map((f: any) => f.flag && <span key={f.id} className="tag" style={{ backgroundColor: `${f.flag.color}20`, color: f.flag.color }}><Flag className="w-3 h-3" />{f.flag.name}</span>)}</div>}
                    <h4 className="font-medium text-white mb-1 line-clamp-2">{job.name}</h4>
                    <p className="text-sm text-white/60 mb-2">{job.customer?.company || job.customer?.name || 'No customer'}</p>
                    <div className="flex items-center justify-between text-xs text-white/40">
                      {job.scheduled_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(job.scheduled_date), 'MMM d')}</span>}
                      {job.quote_amount && <span className="text-green-400">${job.quote_amount.toLocaleString()}</span>}
                    </div>
                  </Link>
                ))}
                {(!jobsByStage[stage.id] || jobsByStage[stage.id].length === 0) && <div className="text-center py-8 text-white/30 text-sm">No jobs</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-bg"><tr><th className="text-left p-4 text-white/60 font-medium text-sm">Job</th><th className="text-left p-4 text-white/60 font-medium text-sm">Customer</th><th className="text-left p-4 text-white/60 font-medium text-sm">Stage</th><th className="text-left p-4 text-white/60 font-medium text-sm">Scheduled</th><th className="p-4"></th></tr></thead>
            <tbody className="divide-y divide-dark-border">
              {filteredJobs.map((job: any) => (
                <tr key={job.id} className="hover:bg-dark-card-hover transition-colors">
                  <td className="p-4"><Link href={`/admin/jobs/${job.id}`} className="font-medium text-white hover:text-brand-500">{job.name}</Link>{job.job_address_city && <p className="text-sm text-white/40 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{job.job_address_city}</p>}</td>
                  <td className="p-4"><p className="text-white">{job.customer?.name || '—'}</p>{job.customer?.company && <p className="text-sm text-white/40">{job.customer.company}</p>}</td>
                  <td className="p-4">{job.stage && <span className="badge" style={{ backgroundColor: `${job.stage.color}20`, color: job.stage.color }}>{job.stage.name}</span>}</td>
                  <td className="p-4 text-white/60">{job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM d, yyyy') : '—'}</td>
                  <td className="p-4"><Link href={`/admin/jobs/${job.id}`} className="btn-icon"><ChevronRight className="w-4 h-4" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredJobs.length === 0 && <div className="text-center py-12 text-white/40">No jobs found</div>}
        </div>
      )}

      {viewMode === 'calendar' && <div className="card p-8 text-center text-white/40">Calendar view coming soon</div>}
    </div>
  );
}
