'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { MapPin, Calendar, ChevronRight, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function FieldJobsPage() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: jobs, error, isLoading, mutate } = useSupabaseQuery('field-jobs', async (supabase) => {
    const { data } = await supabase
      .from('jobs')
      .select(`
        id,
        name,
        job_address_street,
        job_address_city,
        scheduled_date,
        scheduled_time_start,
        photos_required_before,
        photos_required_after,
        stage:job_stages(name, color, is_field_visible),
        customer:customers(name, company),
        checklists:job_checklists(id, items:job_checklist_items(is_checked))
      `)
      .order('scheduled_date', { ascending: true });
    return data || [];
  });

  const handleRefresh = async () => { setRefreshing(true); await mutate(); setRefreshing(false); };

  const getChecklistProgress = (job: any) => {
    const allItems = job.checklists?.flatMap((c: any) => c.items) || [];
    const checked = allItems.filter((i: any) => i.is_checked).length;
    return { checked, total: allItems.length };
  };

  const groupedJobs = jobs?.reduce((acc: any, job: any) => {
    const date = job.scheduled_date || 'Unscheduled';
    if (!acc[date]) acc[date] = [];
    acc[date].push(job);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">My Jobs</h2>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-icon"><RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} /></button>
      </div>

      {isLoading && <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>}

      {error && <div className="card p-6 text-center"><AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" /><p className="text-white/60">Failed to load</p><button onClick={handleRefresh} className="btn-secondary mt-4">Try Again</button></div>}

      {jobs?.length === 0 && <div className="card p-8 text-center"><CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" /><h3 className="text-xl font-semibold text-white mb-2">All caught up!</h3><p className="text-white/60">No jobs assigned.</p></div>}

      {groupedJobs && Object.entries(groupedJobs).map(([date, dateJobs]: [string, any]) => (
        <div key={date} className="space-y-3">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide flex items-center gap-2"><Calendar className="w-4 h-4" />{date === 'Unscheduled' ? 'Unscheduled' : format(new Date(date), 'EEEE, MMMM d')}</h3>
          {dateJobs.map((job: any) => {
            const progress = getChecklistProgress(job);
            return (
              <Link key={job.id} href={`/field/jobs/${job.id}`} className="card-interactive block p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0"><h4 className="font-semibold text-white text-lg truncate">{job.name}</h4><p className="text-white/60 text-sm">{job.customer?.company || job.customer?.name}</p></div>
                  <div className="flex items-center gap-2">{job.stage && <span className="badge" style={{ backgroundColor: `${job.stage.color}20`, color: job.stage.color }}>{job.stage.name}</span>}<ChevronRight className="w-5 h-5 text-white/40" /></div>
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm mb-3"><MapPin className="w-4 h-4 flex-shrink-0" /><span className="truncate">{job.job_address_street}, {job.job_address_city}</span></div>
                <div className="flex items-center justify-between">
                  {job.scheduled_time_start && <div className="flex items-center gap-2 text-white/60 text-sm"><Clock className="w-4 h-4" />{job.scheduled_time_start}</div>}
                  {progress.total > 0 && <div className="flex items-center gap-2"><div className="w-24 h-2 bg-dark-border rounded-full overflow-hidden"><div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${(progress.checked / progress.total) * 100}%` }} /></div><span className="text-xs text-white/60">{progress.checked}/{progress.total}</span></div>}
                </div>
                {(job.photos_required_before || job.photos_required_after) && <div className="mt-3 pt-3 border-t border-dark-border flex gap-2">{job.photos_required_before && <span className="badge badge-pending text-xs">📷 Before required</span>}{job.photos_required_after && <span className="badge badge-pending text-xs">📷 After required</span>}</div>}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
