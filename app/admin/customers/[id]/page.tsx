'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ArrowLeft, Building2, Phone, Mail, MapPin, Edit2, Trash2, Save, X, Tag, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);
  const [showAddTagModal, setShowAddTagModal] = useState(false);

  const { data: customer, mutate } = useSupabaseQuery(`customer-${customerId}`, async (supabase) => {
    const { data, error } = await supabase.from('customers').select('*').eq('id', customerId).single();
    if (error) console.error('Customer fetch error:', error);
    return data;
  });

  const { data: allTags } = useSupabaseQuery('all-tags', async (supabase) => {
    const { data } = await supabase.from('custom_tags').select('*').order('name');
    return data || [];
  });

  const { data: customerTags, mutate: mutateTags } = useSupabaseQuery(`customer-tags-${customerId}`, async (supabase) => {
    const { data } = await supabase.from('customer_tags_junction').select('*, tag:custom_tags(*)').eq('customer_id', customerId);
    return data || [];
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

  const handleAddTag = async (tagId: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('customer_tags_junction').insert({ customer_id: customerId, tag_id: tagId });
    if (error) {
      if (error.code === '23505') toast.error('Tag already added');
      else toast.error('Failed to add tag');
    } else {
      toast.success('Tag added');
      setShowAddTagModal(false);
      mutateTags();
    }
  };

  const handleRemoveTag = async (junctionId: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('customer_tags_junction').delete().eq('id', junctionId);
    if (error) {
      console.error('Remove tag error:', error);
      toast.error('Failed to remove: ' + (error.message || 'Unknown error'));
    } else {
      toast.success('Removed');
      mutateTags();
    }
  };

  if (!customer) return <div className="text-center py-12 text-white/60">Loading...</div>;

  const existingTagIds = customerTags?.map((t: any) => t.tag_id) || [];
  const availableTags = allTags?.filter((t: any) => !existingTagIds.includes(t.id)) || [];

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
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
              {customer.company && <p className="text-white/60">{customer.company}</p>}

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-3">
                {customerTags?.map((t: any) => t.tag && (
                  <span key={t.id} className="tag flex items-center gap-1" style={{ backgroundColor: `${t.tag.color}20`, color: t.tag.color }}>
                    <Tag className="w-3 h-3" />{t.tag.name}
                    <button onClick={() => handleRemoveTag(t.id)} className="hover:bg-white/20 rounded p-0.5"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {availableTags.length > 0 && (
                  <button onClick={() => setShowAddTagModal(true)} className="tag bg-dark-bg text-white/60 hover:text-white">
                    <Plus className="w-3 h-3" />Add Tag
                  </button>
                )}
              </div>
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

      {/* Add Tag Modal */}
      {showAddTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowAddTagModal(false)}>
          <div className="bg-dark-card rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <h2 className="text-lg font-semibold text-white">Add Tag</h2>
              <button onClick={() => setShowAddTagModal(false)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-2">
              {availableTags.map((tag: any) => (
                <button key={tag.id} onClick={() => handleAddTag(tag.id)} className="w-full p-3 rounded-lg bg-dark-bg hover:bg-dark-card-hover transition-colors flex items-center gap-3">
                  <Tag className="w-4 h-4" style={{ color: tag.color }} />
                  <span className="text-white">{tag.name}</span>
                </button>
              ))}
              {availableTags.length === 0 && (
                <div className="text-center py-4 text-white/40">
                  <p>No tags available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
