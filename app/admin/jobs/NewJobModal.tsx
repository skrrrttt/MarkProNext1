'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, User } from 'lucide-react';

export function NewJobModal({
  customers,
  stages,
  onClose,
  onSubmit
}: {
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
