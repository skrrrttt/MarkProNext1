'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Plus, Search, Filter, Calendar, List, Columns3, ChevronRight, Flag, MapPin, X, User, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type ViewMode = 'pipeline' | 'list';

export default function AdminJobsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewJobModal, setShowNewJobModal] = useState(false);

  const { data: stages, isLoading: stagesLoading } = useSupabaseQuery('job-stages', async (supabase) => {
    const { data, error } = await supabase.from('job_stages').select('*').eq('is_active', true).order('sort_order');
    if (error) console.error('Stages error:', error);
    return data || [];
  });

  const { data: jobs, mutate, isLoading: jobsLoading } = useSupabaseQuery('admin-jobs', async (supabase) => {
    const { data, error } = await supabase.from('jobs').select(`*, stage:job_stages(*), customer:customers(id, name, company, phone), flags:job_flags_junction(id, flag:custom_flags(*))`).order('created_at', { ascending: false });
    if (error) console.error('Jobs error:', error);
    return data || [];
  });

  const { data: customers } = useSupabaseQuery('customers-list', async (supabase) => {
    const { data } = await supabase.from('customers').select('id, name, company').eq('is_active', true).order('name');
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
    stages?.forEach((stage: any) => { 
      grouped[stage.id] = filteredJobs.filter((job: any) => job.stage_id === stage.id); 
    });
    grouped['none'] = filteredJobs.filter((job: any) => !job.stage_id);
    return grouped;
  }, [filteredJobs, stages]);

  const handleStageChange = async (jobId: string, newStageId: string) => {
    const supabase = getSupabaseClient();
    mutate(jobs?.map((job: any) => job.id === jobId ? { ...job, stage_id: newStageId, stage: stages?.find((s: any) => s.id === newStageId) } : job), false);
    const { error } = await supabase.from('jobs').update({ stage_id: newStageId }).eq('id', jobId);
    if (error) { toast.error('Failed to update'); mutate(); } else { toast.success('Job moved'); }
  };

  const handleCreateJob = async (e: React.FormEvent<HTMLFormElement>, customerId: string | null, stageId: string | null) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supabase = getSupabaseClient();
    
    const defaultStageId = stageId || stages?.[0]?.id || null;
    
    const jobData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      customer_id: customerId || null,
      stage_id: defaultStageId,
      job_address_street: formData.get('address_street') as string || null,
      job_address_city: formData.get('address_city') as string || null,
      job_address_state: formData.get('address_state') as string || null,
      job_address_zip: formData.get('address_zip') as string || null,
      scheduled_date: formData.get('scheduled_date') as string || null,
      quote_amount: formData.get('quote_amount') ? parseFloat(formData.get('quote_amount') as string) : null,
    };

    const { error } = await supabase.from('jobs').insert(jobData);
    
    if (error) {
      console.error('Job creation error:', error);
      toast.error('Failed to create job: ' + error.message);
    } else {
      toast.success('Job created');
      setShowNewJobModal(false);
      mutate();
    }
  };

  const isLoading = stagesLoading || jobsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-white/60 mt-1">{jobs?.length || 0} total jobs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => mutate()} className="btn-secondary">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowNewJobModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />New Job
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input type="text" placeholder="Search jobs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10 w-full" />
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 bg-dark-card rounded-lg p-1">
            <button onClick={() => setViewMode('pipeline')} className={`btn-icon ${viewMode === 'pipeline' ? 'bg-white/10 text-white' : 'text-white/40'}`} title="Pipeline"><Columns3 className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`btn-icon ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40'}`} title="List"><List className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-white/60">Loading...</div>
      )}

      {/* Pipeline View - Vertical Stacking */}
      {!isLoading && viewMode === 'pipeline' && (
        <div className="space-y-6">
          {stages?.map((stage: any) => (
            <div key={stage.id} className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <h3 className="font-semibold text-white">{stage.name}</h3>
                  <span className="text-white/40 text-sm">({jobsByStage[stage.id]?.length || 0})</span>
                </div>
                {stage.is_field_visible && <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">Field Visible</span>}
              </div>
              
              {jobsByStage[stage.id]?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {jobsByStage[stage.id].map((job: any) => (
                    <Link 
                      key={job.id} 
                      href={`/admin/jobs/${job.id}`} 
                      className="block p-3 bg-dark-bg rounded-lg hover:bg-dark-card-hover transition-colors"
                    >
                      <h4 className="font-medium text-white mb-1 truncate">{job.name}</h4>
                      <p className="text-sm text-white/60 mb-2 truncate">{job.customer?.company || job.customer?.name || 'No customer'}</p>
                      <div className="flex items-center justify-between text-xs text-white/40">
                        {job.scheduled_date ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{format(new Date(job.scheduled_date), 'MMM d')}
                          </span>
                        ) : <span>Not scheduled</span>}
                        {job.quote_amount && <span className="text-green-400">${job.quote_amount.toLocaleString()}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-white/30 text-sm">No jobs in this stage</div>
              )}
            </div>
          ))}
          
          {/* Jobs without stage */}
          {jobsByStage['none']?.length > 0 && (
            <div className="card p-4 border-amber-500/30">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <h3 className="font-semibold text-white">No Stage Assigned</h3>
                <span className="text-white/40 text-sm">({jobsByStage['none'].length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {jobsByStage['none'].map((job: any) => (
                  <Link 
                    key={job.id} 
                    href={`/admin/jobs/${job.id}`} 
                    className="block p-3 bg-dark-bg rounded-lg hover:bg-dark-card-hover transition-colors"
                  >
                    <h4 className="font-medium text-white mb-1 truncate">{job.name}</h4>
                    <p className="text-sm text-white/60 truncate">{job.customer?.company || job.customer?.name || 'No customer'}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {!isLoading && viewMode === 'list' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
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
                {filteredJobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-dark-card-hover transition-colors">
                    <td className="p-4">
                      <Link href={`/admin/jobs/${job.id}`} className="font-medium text-white hover:text-brand-500">{job.name}</Link>
                      {job.job_address_city && <p className="text-sm text-white/40 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{job.job_address_city}</p>}
                    </td>
                    <td className="p-4">
                      <p className="text-white">{job.customer?.name || '—'}</p>
                      {job.customer?.company && <p className="text-sm text-white/40">{job.customer.company}</p>}
                    </td>
                    <td className="p-4">
                      {job.stage ? (
                        <span className="badge" style={{ backgroundColor: `${job.stage.color}20`, color: job.stage.color }}>{job.stage.name}</span>
                      ) : (
                        <span className="badge bg-amber-500/20 text-amber-400">No stage</span>
                      )}
                    </td>
                    <td className="p-4 text-white/60">{job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM d, yyyy') : '—'}</td>
                    <td className="p-4 text-white">{job.quote_amount ? `$${job.quote_amount.toLocaleString()}` : '—'}</td>
                    <td className="p-4"><Link href={`/admin/jobs/${job.id}`} className="btn-icon"><ChevronRight className="w-4 h-4" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredJobs.length === 0 && <div className="text-center py-12 text-white/40">No jobs found</div>}
        </div>
      )}

      {/* New Job Modal */}
      {showNewJobModal && (
        <NewJobModal 
          customers={customers || []} 
          stages={stages || []}
          onClose={() => setShowNewJobModal(false)} 
          onSubmit={handleCreateJob}
        />
      )}
    </div>
  );
}

function NewJobModal({ customers, stages, onClose, onSubmit }: { 
  customers: any[], 
  stages: any[],
  onClose: () => void, 
  onSubmit: (e: React.FormEvent<HTMLFormElement>, customerId: string | null, stageId: string | null) => void 
}) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[0]?.id || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 10);
    const search = customerSearch.toLowerCase();
    return customers.filter((c: any) => 
      c.name.toLowerCase().includes(search) || 
      c.company?.toLowerCase().includes(search)
    ).slice(0, 10);
  }, [customers, customerSearch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name + (customer.company ? ` (${customer.company})` : ''));
    setShowDropdown(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-dark-card rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-dark-border sticky top-0 bg-dark-card">
          <h2 className="text-lg font-semibold text-white">New Job</h2>
          <button onClick={onClose} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => onSubmit(e, selectedCustomer?.id || null, selectedStageId)} className="p-4 space-y-4">
          <div>
            <label className="label">Job Name *</label>
            <input type="text" name="name" required className="input" placeholder="e.g. Parking Lot Striping" />
          </div>
          
          {/* Customer Search */}
          <div ref={dropdownRef} className="relative">
            <label className="label">Customer</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setShowDropdown(true); setSelectedCustomer(null); }}
                onFocus={() => setShowDropdown(true)}
                className="input pl-10 pr-10"
                placeholder="Search customers..."
              />
              {selectedCustomer && (
                <button type="button" onClick={handleClearCustomer} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {showDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-dark-card border border-dark-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.map((customer: any) => (
                  <button key={customer.id} type="button" onClick={() => handleSelectCustomer(customer)} className="w-full px-4 py-2 text-left hover:bg-dark-bg transition-colors flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-white/60">{customer.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm">{customer.name}</p>
                      {customer.company && <p className="text-white/40 text-xs">{customer.company}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stage */}
          <div>
            <label className="label">Stage</label>
            <select value={selectedStageId} onChange={(e) => setSelectedStageId(e.target.value)} className="input">
              {stages.map((stage: any) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea name="description" rows={3} className="input" placeholder="Job details..." />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Scheduled Date</label>
              <input type="date" name="scheduled_date" className="input" />
            </div>
            <div>
              <label className="label">Quote Amount</label>
              <input type="number" name="quote_amount" step="0.01" className="input" placeholder="0.00" />
            </div>
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
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Create Job</button>
          </div>
        </form>
      </div>
    </div>
  );
}
