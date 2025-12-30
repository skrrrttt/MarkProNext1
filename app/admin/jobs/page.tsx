'use client';

import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Plus, Search, Calendar, List, ChevronRight, MapPin, X, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminJobsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewJobModal, setShowNewJobModal] = useState(false);

  const { data: stages } = useSupabaseQuery('job-stages', async (supabase) => {
    const { data, error } = await supabase.from('job_stages').select('*').order('sort_order');
    if (error) console.error('Stages error:', error);
    return data || [];
  });

  const { data: jobs, mutate } = useSupabaseQuery('admin-jobs', async (supabase) => {
    const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
    if (error) console.error('Jobs error:', error);
    return data || [];
  });

  const { data: customers } = useSupabaseQuery('customers-list', async (supabase) => {
    const { data } = await supabase.from('customers').select('id, name, company').order('name');
    return data || [];
  });

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    if (!searchQuery) return jobs;
    const query = searchQuery.toLowerCase();
    return jobs.filter((job: any) => job.name?.toLowerCase().includes(query));
  }, [jobs, searchQuery]);

  const getStage = (stageId: string) => stages?.find((s: any) => s.id === stageId);
  const getCustomer = (customerId: string) => customers?.find((c: any) => c.id === customerId);

  const handleCreateJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supabase = getSupabaseClient();
    
    const jobData = {
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
    };

    console.log('Creating job:', jobData);

    const { data, error } = await supabase.from('jobs').insert(jobData).select();
    
    if (error) {
      console.error('Job creation error:', error);
      toast.error('Failed to create job: ' + error.message);
    } else {
      console.log('Job created:', data);
      toast.success('Job created');
      setShowNewJobModal(false);
      mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-white/60 mt-1">{jobs?.length || 0} total jobs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => mutate()} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowNewJobModal(true)} className="btn-primary"><Plus className="w-4 h-4" />New Job</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input type="text" placeholder="Search jobs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10 w-full" />
      </div>

      {/* Jobs List */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-bg">
            <tr>
              <th className="text-left p-4 text-white/60 font-medium text-sm">Job</th>
              <th className="text-left p-4 text-white/60 font-medium text-sm">Customer</th>
              <th className="text-left p-4 text-white/60 font-medium text-sm">Stage</th>
              <th className="text-left p-4 text-white/60 font-medium text-sm">Scheduled</th>
              <th className="text-left p-4 text-white/60 font-medium text-sm">Amount</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {filteredJobs.map((job: any) => {
              const stage = getStage(job.stage_id);
              const customer = getCustomer(job.customer_id);
              return (
                <tr key={job.id} className="hover:bg-dark-card-hover transition-colors">
                  <td className="p-4">
                    <Link href={`/admin/jobs/${job.id}`} className="font-medium text-white hover:text-brand-500">{job.name}</Link>
                    {job.job_address_city && <p className="text-sm text-white/40 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{job.job_address_city}</p>}
                  </td>
                  <td className="p-4">
                    <p className="text-white">{customer?.name || '—'}</p>
                    {customer?.company && <p className="text-sm text-white/40">{customer.company}</p>}
                  </td>
                  <td className="p-4">
                    {stage ? (
                      <span className="badge" style={{ backgroundColor: `${stage.color}20`, color: stage.color }}>{stage.name}</span>
                    ) : (
                      <span className="badge bg-white/10 text-white/40">No stage</span>
                    )}
                  </td>
                  <td className="p-4 text-white/60">{job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM d, yyyy') : '—'}</td>
                  <td className="p-4 text-white">{job.quote_amount ? `$${job.quote_amount.toLocaleString()}` : '—'}</td>
                  <td className="p-4"><Link href={`/admin/jobs/${job.id}`} className="btn-icon"><ChevronRight className="w-4 h-4" /></Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredJobs.length === 0 && <div className="text-center py-12 text-white/40">No jobs found</div>}
      </div>

      {/* New Job Modal */}
      {showNewJobModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowNewJobModal(false)}>
          <div className="bg-dark-card rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-dark-border sticky top-0 bg-dark-card">
              <h2 className="text-lg font-semibold text-white">New Job</h2>
              <button onClick={() => setShowNewJobModal(false)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateJob} className="p-4 space-y-4">
              <div><label className="label">Job Name *</label><input type="text" name="name" required className="input" placeholder="e.g. Parking Lot Striping" /></div>
              
              <div><label className="label">Customer</label>
                <select name="customer_id" className="input">
                  <option value="">Select customer...</option>
                  {customers?.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
                </select>
              </div>

              <div><label className="label">Stage</label>
                <select name="stage_id" className="input" defaultValue={stages?.[0]?.id || ''}>
                  {stages?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div><label className="label">Description</label><textarea name="description" rows={3} className="input" placeholder="Job details..." /></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Scheduled Date</label><input type="date" name="scheduled_date" className="input" /></div>
                <div><label className="label">Quote Amount</label><input type="number" name="quote_amount" step="0.01" className="input" placeholder="0.00" /></div>
              </div>
              
              <div>
                <label className="label">Job Address</label>
                <input type="text" name="address_street" className="input mb-2" placeholder="Street" />
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" name="address_city" className="input" placeholder="City" />
                  <input type="text" name="address_state" className="input" placeholder="State" />
                  <input type="text" name="address_zip" className="input" placeholder="ZIP" />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowNewJobModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create Job</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
