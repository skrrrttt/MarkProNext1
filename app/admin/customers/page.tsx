'use client';

import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Plus, Search, Phone, Mail, MapPin, Building2, ChevronRight, X, Tag, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminCustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  const { data: customers, mutate } = useSupabaseQuery('admin-customers', async (supabase) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) console.error('Customers fetch error:', error);
    return data || [];
  });

  const { data: allTags } = useSupabaseQuery('all-tags', async (supabase) => {
    const { data } = await supabase.from('custom_tags').select('*').order('name');
    return data || [];
  });

  const { data: customerTagsJunction } = useSupabaseQuery('customer-tags-all', async (supabase) => {
    const { data } = await supabase.from('customer_tags_junction').select('customer_id, tag_id');
    return data || [];
  });

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    return customers.filter((customer: any) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = customer.name?.toLowerCase().includes(query) ||
          customer.company?.toLowerCase().includes(query) ||
          customer.email?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Tag filter
      if (selectedTagFilter) {
        const customerHasTag = customerTagsJunction?.some(
          (junction: any) => junction.customer_id === customer.id && junction.tag_id === selectedTagFilter
        );
        if (!customerHasTag) return false;
      }

      return true;
    });
  }, [customers, searchQuery, selectedTagFilter, customerTagsJunction]);

  const getCustomerTags = (customerId: string) => {
    const tagIds = customerTagsJunction?.filter((j: any) => j.customer_id === customerId).map((j: any) => j.tag_id) || [];
    return allTags?.filter((t: any) => tagIds.includes(t.id)) || [];
  };

  const handleCreateCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supabase = getSupabaseClient();
    
    const customerData = {
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

    const { error } = await supabase.from('customers').insert(customerData);
    
    if (error) {
      console.error('Create error:', error);
      toast.error('Failed to create customer: ' + error.message);
      return;
    }
    
    toast.success('Customer created');
    setShowNewCustomerModal(false);
    mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-white/60 mt-1">{filteredCustomers.length} total</p>
        </div>
        <button onClick={() => setShowNewCustomerModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />New Customer
        </button>
      </div>
      
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input type="text" placeholder="Search customers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10 w-full" />
        </div>

        {/* Tag Filter */}
        {allTags && allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-white/40" />
            <button
              onClick={() => setSelectedTagFilter(null)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                !selectedTagFilter
                  ? 'bg-brand-500 text-white'
                  : 'bg-dark-bg text-white/60 hover:text-white hover:bg-dark-card-hover'
              }`}
            >
              All
            </button>
            {allTags.map((tag: any) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTagFilter(tag.id === selectedTagFilter ? null : tag.id)}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  tag.id === selectedTagFilter
                    ? 'border'
                    : 'bg-dark-bg hover:bg-dark-card-hover'
                }`}
                style={
                  tag.id === selectedTagFilter
                    ? { backgroundColor: `${tag.color}30`, color: tag.color, borderColor: tag.color }
                    : { color: tag.color }
                }
              >
                <Tag className="w-3 h-3" />
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {!customers && <div className="text-center py-12 text-white/60">Loading...</div>}
      
      {customers && filteredCustomers.length === 0 && (
        <div className="card p-12 text-center">
          <Building2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No customers found</h3>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer: any) => (
          <Link key={customer.id} href={`/admin/customers/${customer.id}`} className="card p-5 hover:bg-dark-card-hover transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-dark-bg flex items-center justify-center">
                  {customer.company ? <Building2 className="w-6 h-6 text-white/40" /> : <span className="text-lg font-bold text-white/60">{customer.name?.charAt(0) || '?'}</span>}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{customer.name}</h3>
                  {customer.company && <p className="text-sm text-white/60">{customer.company}</p>}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30" />
            </div>
            <div className="space-y-2 text-sm">
              {customer.phone && <p className="flex items-center gap-2 text-white/60"><Phone className="w-4 h-4" />{customer.phone}</p>}
              {customer.email && <p className="flex items-center gap-2 truncate text-white/60"><Mail className="w-4 h-4" />{customer.email}</p>}
              {customer.address_city && <p className="flex items-center gap-2 text-white/60"><MapPin className="w-4 h-4" />{customer.address_city}, {customer.address_state}</p>}

              {/* Customer Tags */}
              {getCustomerTags(customer.id).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {getCustomerTags(customer.id).map((tag: any) => (
                    <span
                      key={tag.id}
                      className="text-xs px-2 py-0.5 rounded-md flex items-center gap-1"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowNewCustomerModal(false)}>
          <div className="bg-dark-card rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-dark-border sticky top-0 bg-dark-card">
              <h2 className="text-lg font-semibold text-white">New Customer</h2>
              <button onClick={() => setShowNewCustomerModal(false)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-4 space-y-4">
              <div><label className="label">Contact Name *</label><input type="text" name="name" required className="input" placeholder="John Smith" /></div>
              <div><label className="label">Company</label><input type="text" name="company" className="input" placeholder="ABC Corporation" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Email</label><input type="email" name="email" className="input" placeholder="john@example.com" /></div>
                <div><label className="label">Phone</label><input type="tel" name="phone" className="input" placeholder="(555) 123-4567" /></div>
              </div>
              <div>
                <label className="label">Address</label>
                <input type="text" name="address_street" className="input mb-2" placeholder="Street" />
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" name="address_city" className="input" placeholder="City" />
                  <input type="text" name="address_state" className="input" placeholder="State" />
                  <input type="text" name="address_zip" className="input" placeholder="ZIP" />
                </div>
              </div>
              <div><label className="label">Notes</label><textarea name="notes" rows={3} className="input" placeholder="Any notes..." /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowNewCustomerModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
