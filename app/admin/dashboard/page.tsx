'use client';

import { useSupabaseQuery } from '@/lib/offline/swr';
import { Briefcase, Users, DollarSign, Clock, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function AdminDashboardPage() {
  const { data: stats } = useSupabaseQuery('dashboard-stats', async (supabase) => {
    const [jobs, customers] = await Promise.all([
      supabase.from('jobs').select('id', { count: 'exact' }),
      supabase.from('customers').select('id', { count: 'exact' }),
    ]);
    return { totalJobs: jobs.count || 0, totalCustomers: customers.count || 0 };
  });

  const { data: recentJobs } = useSupabaseQuery('recent-jobs', async (supabase) => {
    const { data } = await supabase.from('jobs').select('id, name, scheduled_date, stage:job_stages(name, color), customer:customers(name, company)').order('created_at', { ascending: false }).limit(5);
    return data || [];
  });

  const { data: todayJobs } = useSupabaseQuery('today-jobs', async (supabase) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase.from('jobs').select('id, name, scheduled_date, stage:job_stages(name, color), customer:customers(name, company)').eq('scheduled_date', today).limit(10);
    return data || [];
  });

  const statCards = [
    { label: 'Total Jobs', value: stats?.totalJobs || 0, icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Active Jobs', value: 0, icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Customers', value: stats?.totalCustomers || 0, icon: Users, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Pending Invoices', value: 0, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold text-white">Dashboard</h1><p className="text-white/60 mt-1">Welcome back!</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center justify-between mb-3"><span className="text-white/60 text-sm">{stat.label}</span><div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div></div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-brand-500" />Today</h2><Link href="/admin/jobs" className="text-sm text-brand-500">View all →</Link></div>
          {!todayJobs?.length ? <div className="text-center py-8"><CheckCircle2 className="w-12 h-12 text-green-400/50 mx-auto mb-3" /><p className="text-white/60">No jobs today</p></div> : (
            <div className="space-y-3">{todayJobs.map((job: any) => (
              <Link key={job.id} href={`/admin/jobs/${job.id}`} className="flex items-center justify-between p-3 rounded-lg bg-dark-bg hover:bg-dark-card-hover transition-colors">
                <div><p className="font-medium text-white truncate">{job.name}</p><p className="text-sm text-white/60 truncate">{job.customer?.company || job.customer?.name}</p></div>
                {job.stage && <span className="badge" style={{ backgroundColor: `${job.stage.color}20`, color: job.stage.color }}>{job.stage.name}</span>}
              </Link>
            ))}</div>
          )}
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-brand-500" />Recent</h2></div>
          <div className="space-y-3">{recentJobs?.map((job: any) => (
            <Link key={job.id} href={`/admin/jobs/${job.id}`} className="flex items-center justify-between p-3 rounded-lg bg-dark-bg hover:bg-dark-card-hover transition-colors">
              <div><p className="font-medium text-white truncate">{job.name}</p><p className="text-sm text-white/60">{job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM d, yyyy') : 'Not scheduled'}</p></div>
              {job.stage && <span className="badge" style={{ backgroundColor: `${job.stage.color}20`, color: job.stage.color }}>{job.stage.name}</span>}
            </Link>
          ))}</div>
        </div>
      </div>
    </div>
  );
}
