'use client';

import { useSupabaseQuery } from '@/lib/offline/swr';
import { Briefcase, Users, TrendingUp, Calendar, CheckCircle2, Flag } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { SkeletonDashboard } from '@/components/ui';

export default function AdminDashboardPage() {
  const { data: jobs, isLoading: jobsLoading } = useSupabaseQuery('dashboard-jobs', async (supabase) => {
    const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(10);
    return data || [];
  });

  const { data: customers, isLoading: customersLoading } = useSupabaseQuery('dashboard-customers', async (supabase) => {
    const { data } = await supabase.from('customers').select('id');
    return data || [];
  });

  const { data: stages } = useSupabaseQuery('job-stages', async (supabase) => {
    const { data } = await supabase.from('job_stages').select('*').order('sort_order');
    return data || [];
  });

  const { data: allJobFlags } = useSupabaseQuery('all-job-flags', async (supabase) => {
    const { data } = await supabase.from('job_flags_junction').select('*, flag:custom_flags(*)');
    return data || [];
  });

  const getStage = (stageId: string) => stages?.find((s: any) => s.id === stageId);
  const getJobFlags = (jobId: string) => allJobFlags?.filter((f: any) => f.job_id === jobId) || [];

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayJobs = jobs?.filter((j: any) => j.scheduled_date === today) || [];

  const isLoading = jobsLoading || customersLoading;

  const statCards = [
    { label: 'Total Jobs', value: jobs?.length || 0, icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Customers', value: customers?.length || 0, icon: Users, color: 'text-green-400', bg: 'bg-green-500/10' },
  ];

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold text-white">Dashboard</h1><p className="text-white/60 mt-1">Welcome back!</p></div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/60 text-sm">{stat.label}</span>
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-brand-500" />Today</h2>
            <Link href="/admin/jobs" className="text-sm text-brand-500">View all →</Link>
          </div>
          {todayJobs.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-400/50 mx-auto mb-3" />
              <p className="text-white/60">No jobs scheduled today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayJobs.map((job: any) => {
                const stage = getStage(job.stage_id);
                const flags = getJobFlags(job.id);
                return (
                  <Link key={job.id} href={`/admin/jobs/${job.id}`} className="block p-3 rounded-lg bg-dark-bg hover:bg-dark-card-hover transition-colors">
                    {flags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {flags.map((f: any) => f.flag && (
                          <span key={f.id} className="tag text-xs" style={{ backgroundColor: `${f.flag.color}20`, color: f.flag.color }}>
                            <Flag className="w-3 h-3" />{f.flag.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white truncate">{job.name}</p>
                      {stage && <span className="badge text-xs" style={{ backgroundColor: `${stage.color}20`, color: stage.color }}>{stage.name}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-brand-500" />Recent Jobs</h2>
          </div>
          <div className="space-y-3">
            {jobs?.slice(0, 5).map((job: any) => {
              const stage = getStage(job.stage_id);
              const flags = getJobFlags(job.id);
              return (
                <Link key={job.id} href={`/admin/jobs/${job.id}`} className="block p-3 rounded-lg bg-dark-bg hover:bg-dark-card-hover transition-colors">
                  {flags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {flags.map((f: any) => f.flag && (
                        <span key={f.id} className="tag text-xs" style={{ backgroundColor: `${f.flag.color}20`, color: f.flag.color }}>
                          <Flag className="w-3 h-3" />{f.flag.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white truncate">{job.name}</p>
                      <p className="text-sm text-white/60">{job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM d, yyyy') : 'Not scheduled'}</p>
                    </div>
                    {stage && <span className="badge text-xs" style={{ backgroundColor: `${stage.color}20`, color: stage.color }}>{stage.name}</span>}
                  </div>
                </Link>
              );
            })}
            {!jobs?.length && <p className="text-white/40 text-center py-4">No jobs yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
