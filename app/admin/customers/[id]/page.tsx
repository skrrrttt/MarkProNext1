'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ArrowLeft, Building2, Phone, Mail, MapPin, Edit2, Trash2, Briefcase, Calendar, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);

  const { data: customer, mutate } = useSupabaseQuery(`customer-${customerId}`, async (supabase) => {
    const { data } = await supabase.from('customers').select(`*, tags:customer_tags_junction(tag:custom_tags(*)), jobs(id, name, scheduled_date, stage:job_stages(name, color))`).eq('id', customerId).single();
    return data;
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supabase = getSupabaseClient();

    const updates = {
      name: formData.get('name') as string,
      company: formData.get('company') as string || null,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      address_street: formData.get('address_street') as string || null,
      address_city: formData.get('address_city') as string || null,
      address_state: formData.get('address_state') as string || null,
      address_zip: formData.get('address_zip') as string || null,
      notes: formData.get('notes') as string || null,
    };

    const { error } = await supabase.from('customers').update(updates).eq('id', customerId);

    if (error) {
      toast.error('Failed to update customer');
    } else {
      toast.success('Customer updated');
      setIsEditing(false);
      mutate();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('customers').update({ is_active: false }).eq('id', customerId);

    if (error) {
      toast.error('Failed to delete customer');
    } else {
      toast.success('Customer deleted');
      router.push('/admin/customers');
    }
  };

  if (!customer) {
    return <div className="space-y-4"><div className="skeleton h-48 rounded-xl" /><div className="skeleton h-64 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="btn-secondary"><ArrowLeft className="w-4 h-4" />Back</button>
        <div className="flex gap-2">
          <button onClick={() => setIsEditing(!isEditing)} className="btn-secondary"><Edit2 className="w-4 h-4" />{isEditing ? 'Cancel' : 'Edit'}</button>
          <button onClick={handleDelete} className="btn-secondary text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Name *</label><input type="text" name="name" required className="input" defaultValue={customer.name} /></div>
            <div><label className="label">Company</label><input type="text" name="company" className="input" defaultValue={customer.company || ''} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Email</label><input type="email" name="email" className="input" defaultValue={customer.email || ''} /></div>
            <div><label className="label">Phone</label><input type="tel" name="phone" className="input" defaultValue={customer.phone || ''} /></div>
          </div>
          <div><label className="label">Street Address</label><input type="text" name="address_street" className="input" defaultValue={customer.address_street || ''} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">City</label><input type="text" name="address_city" className="input" defaultValue={customer.address_city || ''} /></div>
            <div><label className="label">State</label><input type="text" name="address_state" className="input" defaultValue={customer.address_state || ''} /></div>
            <div><label className="label">ZIP</label><input type="text" name="address_zip" className="input" defaultValue={customer.address_zip || ''} /></div>
          </div>
          <div><label className="label">Notes</label><textarea name="notes" rows={3} className="input" defaultValue={customer.notes || ''} /></div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1"><Save className="w-4 h-4" />Save Changes</button>
          </div>
        </form>
      ) : (
        <div className="card p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl bg-dark-bg flex items-center justify-center">
              {customer.company ? <Building2 className="w-8 h-8 text-white/40" /> : <span className="text-2xl font-bold text-white/60">{customer.name.charAt(0)}</span>}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
              {customer.company && <p className="text-white/60">{customer.company}</p>}
              <div className="flex gap-2 mt-2">
                {customer.tags?.map((t: any) => t.tag && <span key={t.tag.id} className="tag" style={{ backgroundColor: `${t.tag.color}20`, color: t.tag.color }}>{t.tag.name}</span>)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Contact Info</h3>
              {customer.phone && <a href={`tel:${customer.phone}`} className="flex items-center gap-3 text-white/70 hover:text-white"><Phone className="w-4 h-4" />{customer.phone}</a>}
              {customer.email && <a href={`mailto:${customer.email}`} className="flex items-center gap-3 text-white/70 hover:text-white"><Mail className="w-4 h-4" />{customer.email}</a>}
              {customer.address_street && <div className="flex items-start gap-3 text-white/70"><MapPin className="w-4 h-4 mt-1" /><div>{customer.address_street}<br />{customer.address_city}, {customer.address_state} {customer.address_zip}</div></div>}
            </div>
            {customer.notes && (
              <div>
                <h3 className="font-semibold text-white mb-2">Notes</h3>
                <p className="text-white/70">{customer.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2"><Briefcase className="w-5 h-5" />Jobs ({customer.jobs?.length || 0})</h2>
          <Link href={`/admin/jobs?customer=${customerId}`} className="text-sm text-brand-500">View all →</Link>
        </div>
        {customer.jobs?.length > 0 ? (
          <div className="space-y-2">
            {customer.jobs.slice(0, 5).map((job: any) => (
              <Link key={job.id} href={`/admin/jobs/${job.id}`} className="flex items-center justify-between p-3 rounded-lg bg-dark-bg hover:bg-dark-card-hover transition-colors">
                <div>
                  <p className="font-medium text-white">{job.name}</p>
                  {job.scheduled_date && <p className="text-sm text-white/40 flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(job.scheduled_date), 'MMM d, yyyy')}</p>}
                </div>
                {job.stage && <span className="badge" style={{ backgroundColor: `${job.stage.color}20`, color: job.stage.color }}>{job.stage.name}</span>}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-white/40 text-center py-4">No jobs yet</p>
        )}
      </div>
    </div>
  );
}
