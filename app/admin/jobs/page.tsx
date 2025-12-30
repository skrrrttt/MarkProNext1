'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Plus, Search, Calendar, ChevronRight, MapPin, X, RefreshCw, Flag, User } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminJobsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewJobModal, setShowNewJobModal] = useState(false);

  const { data: stages } = useSupabaseQuery('job-stages', async (supabase) => {
    const { data } = await supabase.from('job_stages').select('*').order('sort_order');
    return data || [];
  });

  const { data: jobs, mutate } = useSupabaseQuery('admin-jobs', async (supabase) => {
    const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
    return data || [];
  });

  const { data: customers } = useSupabaseQuery('customers-list', async (supabase) => {
    const { data } = await supabase.from('customers').select('id, name, company').order('name');
    return data || [];
  });

  const { data: allJobFlags } = useSupabaseQuery('all-job-flags', async (supabase) => {
    const { data } = await supabase.from('job_flags_junction').select('*, flag:custom_flags(*)');
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
  const getJobFlags = (jobId: string) => allJobFlags?.filter((f: any) => f.job_id === jobId) || [];

  const handleCreateJob = async (e: React.FormEvent<HTMLFormElement>, customerId: string | null) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supabase = getSupabaseClient();
    
    const jobData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      customer_id: customerId || null,
      stage_id: formData.get('stage_id') as string || null,
      job_address_street: formData.get('address_street') as string || null,
      job_address_city: formData.get('address_city') as string || null,
      job_address_state: formData.get('address_state') as string || null,
      job_address_zip: formData.get('address_zip') as string || null,
      scheduled_date: formData.get('scheduled_date') as string || null,
      quote_amount: formData.get('quote_amount') ? parseFloat(formData.get('quote_amount') as string) : null,
    };

    const { error } = await supabase.from('jobs').insert(jobData);
    
    if (error) {
      toast.error('Failed to create job: ' + error.message);
    } else {
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

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredJobs.map((job: any) => {
          const stage = getStage(job.stage_id);
          const customer = getCustomer(job.customer_id);
          const flags = getJobFlags(job.id);
          return (
            <Link key={job.id} href={`/admin/jobs/${job.id}`} className="card p-4 hover:bg-dark-card-hover transition-colors">
              {/* Flags */}
              {flags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {flags.map((f: any) => f.flag && (
                    <span key={f.id} className="tag text-xs" style={{ backgroundColor: `${f.flag.color}20`, color: f.flag.color }}>
                      <Flag className="w-3 h-3" />{f.flag.name}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white line-clamp-2">{job.name}</h3>
                <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0" />
              </div>
              
              <p className="text-sm text-white/60 mb-3">{customer?.company || customer?.name || 'No customer'}</p>
              
              <div className="flex items-center justify-between">
                {stage ? (
                  <span className="badge text-xs" style={{ backgroundColor: `${stage.color}20`, color: stage.color }}>{stage.name}</span>
                ) : (
                  <span className="badge text-xs bg-white/10 text-white/40">No stage</span>
                )}
                
                <div className="flex items-center gap-2 text-xs text-white/40">
                  {job.scheduled_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{format(new Date(job.scheduled_date), 'MMM d')}
                    </span>
                  )}
                  {job.quote_amount && <span className="text-green-400">${job.quote_amount.toLocaleString()}</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      
      {filteredJobs.length === 0 && (
        <div className="text-center py-12 text-white/40">No jobs found</div>
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
  onSubmit: (e: React.FormEvent<HTMLFormElement>, customerId: string | null) => void 
}) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 10);
    const search = customerSearch.toLowerCase();
    return customers.filter((c: any) => 
      c.name?.toLowerCase().includes(search) || 
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
        <form onSubmit={(e) => onSubmit(e, selectedCustomer?.id || null)} className="p-4 space-y-4">
          <div><label className="label">Job Name *</label><input type="text" name="name" required className="input" placeholder="e.g. Parking Lot Striping" /></div>
          
          {/* Customer Search Autocomplete */}
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
                      <span className="text-sm font-medium text-white/60">{customer.name?.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm">{customer.name}</p>
                      {customer.company && <p className="text-white/40 text-xs">{customer.company}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && customerSearch && filteredCustomers.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-dark-card border border-dark-border rounded-lg shadow-lg p-4 text-center">
                <p className="text-white/40 text-sm">No customers found</p>
              </div>
            )}
          </div>

          <div><label className="label">Stage</label>
            <select name="stage_id" className="input" defaultValue={stages[0]?.id || ''}>
              {stages.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Create Job</button>
          </div>
        </form>
      </div>
    </div>
  );
}
