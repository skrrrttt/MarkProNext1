'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ArrowLeft, Building2, Phone, Mail, MapPin, Edit2, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);

  const { data: customer, mutate } = useSupabaseQuery(`customer-${customerId}`, async (supabase) => {
    const { data, error } = await supabase.from('customers').select('*').eq('id', customerId).single();
    if (error) console.error('Customer fetch error:', error);
    return data;
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supabase = getSupabaseClient();

    const { error } = await supabase.from('customers').update({
      name: formData.get('name') as string,
      company: formData.get('company') as string || null,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      address_street: formData.get('address_street') as string || null,
      address_city: formData.get('address_city') as string || null,
      address_state: formData.get('address_state') as string || null,
      address_zip: formData.get('address_zip') as string || null,
      notes: formData.get('notes') as string || null,
    }).eq('id', customerId);
    if (error) toast.error('Failed to update');
    else { toast.success('Updated'); setIsEditing(false); mutate(); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this customer?')) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('customers').delete().eq('id', customerId);
    if (error) toast.error('Failed to delete');
    else { toast.success('Deleted'); router.push('/admin/customers'); }
  };

  if (!customer) return <div className="text-center py-12 text-white/60">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/admin/customers')} className="btn-secondary"><ArrowLeft className="w-4 h-4" />Back</button>
        <div className="flex gap-2">
          <button onClick={() => setIsEditing(!isEditing)} className="btn-secondary"><Edit2 className="w-4 h-4" />{isEditing ? 'Cancel' : 'Edit'}</button>
          <button onClick={handleDelete} className="btn-secondary text-red-400"><Trash2 className="w-4 h-4" /></button>
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
          <div><label className="label">Street</label><input type="text" name="address_street" className="input" defaultValue={customer.address_street || ''} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">City</label><input type="text" name="address_city" className="input" defaultValue={customer.address_city || ''} /></div>
            <div><label className="label">State</label><input type="text" name="address_state" className="input" defaultValue={customer.address_state || ''} /></div>
            <div><label className="label">ZIP</label><input type="text" name="address_zip" className="input" defaultValue={customer.address_zip || ''} /></div>
          </div>
          <div><label className="label">Notes</label><textarea name="notes" rows={3} className="input" defaultValue={customer.notes || ''} /></div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1"><Save className="w-4 h-4" />Save</button>
          </div>
        </form>
      ) : (
        <div className="card p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl bg-dark-bg flex items-center justify-center">
              {customer.company ? <Building2 className="w-8 h-8 text-white/40" /> : <span className="text-2xl font-bold text-white/60">{customer.name?.charAt(0)}</span>}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
              {customer.company && <p className="text-white/60">{customer.company}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Contact Info</h3>
              {customer.phone && <a href={`tel:${customer.phone}`} className="flex items-center gap-3 text-white/70 hover:text-white"><Phone className="w-4 h-4" />{customer.phone}</a>}
              {customer.email && <a href={`mailto:${customer.email}`} className="flex items-center gap-3 text-white/70 hover:text-white"><Mail className="w-4 h-4" />{customer.email}</a>}
              {customer.address_street && (
                <div className="flex items-start gap-3 text-white/70">
                  <MapPin className="w-4 h-4 mt-1" />
                  <div>{customer.address_street}<br />{customer.address_city}, {customer.address_state} {customer.address_zip}</div>
                </div>
              )}
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
    </div>
  );
}
