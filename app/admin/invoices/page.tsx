'use client';

import { useState } from 'react';
import { useSupabaseQuery } from '@/lib/offline/swr';
import Link from 'next/link';
import { Plus, Search, FileText, DollarSign, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#94a3b8' },
  sent: { label: 'Sent', color: '#3b82f6' },
  viewed: { label: 'Viewed', color: '#8b5cf6' },
  paid: { label: 'Paid', color: '#22c55e' },
  overdue: { label: 'Overdue', color: '#ef4444' },
  cancelled: { label: 'Cancelled', color: '#64748b' },
};

export default function AdminInvoicesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: invoices } = useSupabaseQuery('admin-invoices', async (supabase) => {
    const { data } = await supabase.from('invoices').select(`*, customer:customers(id, name, company), job:jobs(id, name)`).order('created_at', { ascending: false });
    return data || [];
  });

  const filteredInvoices = invoices?.filter((inv: any) => {
    const matchesSearch = !searchQuery || inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) || inv.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const totals = {
    outstanding: filteredInvoices.filter((i: any) => ['sent', 'viewed', 'overdue'].includes(i.status)).reduce((sum: number, i: any) => sum + (i.total - i.amount_paid), 0),
    overdue: filteredInvoices.filter((i: any) => i.status === 'overdue').reduce((sum: number, i: any) => sum + (i.total - i.amount_paid), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Invoices</h1><p className="text-white/60 mt-1">{invoices?.length || 0} total</p></div>
        <button className="btn-primary"><Plus className="w-4 h-4" />Create Invoice</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5"><div className="flex items-center justify-between mb-2"><span className="text-white/60 text-sm">Outstanding</span><Clock className="w-5 h-5 text-amber-400" /></div><p className="text-2xl font-bold text-white">${totals.outstanding.toLocaleString()}</p></div>
        <div className="card p-5 border-red-500/30"><div className="flex items-center justify-between mb-2"><span className="text-white/60 text-sm">Overdue</span><AlertCircle className="w-5 h-5 text-red-400" /></div><p className="text-2xl font-bold text-red-400">${totals.overdue.toLocaleString()}</p></div>
        <div className="card p-5"><div className="flex items-center justify-between mb-2"><span className="text-white/60 text-sm">Collected (YTD)</span><DollarSign className="w-5 h-5 text-green-400" /></div><p className="text-2xl font-bold text-green-400">$0</p></div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" /><input type="text" placeholder="Search invoices..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" /></div>
        <div className="flex gap-2">
          <button onClick={() => setStatusFilter(null)} className={`btn text-sm ${!statusFilter ? 'btn-primary' : 'btn-secondary'}`}>All</button>
          {['sent', 'paid', 'overdue'].map((key) => <button key={key} onClick={() => setStatusFilter(statusFilter === key ? null : key)} className="btn text-sm btn-secondary" style={{ backgroundColor: statusFilter === key ? `${statusConfig[key].color}30` : undefined, color: statusFilter === key ? statusConfig[key].color : undefined }}>{statusConfig[key].label}</button>)}
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-bg"><tr><th className="text-left p-4 text-white/60 font-medium text-sm">Invoice</th><th className="text-left p-4 text-white/60 font-medium text-sm">Customer</th><th className="text-left p-4 text-white/60 font-medium text-sm">Status</th><th className="text-left p-4 text-white/60 font-medium text-sm">Due Date</th><th className="text-right p-4 text-white/60 font-medium text-sm">Amount</th></tr></thead>
          <tbody className="divide-y divide-dark-border">
            {filteredInvoices.map((invoice: any) => {
              const config = statusConfig[invoice.status] || statusConfig.draft;
              return (
                <tr key={invoice.id} className="hover:bg-dark-card-hover transition-colors">
                  <td className="p-4"><span className="font-medium text-white">{invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}</span><p className="text-xs text-white/40 mt-0.5">{format(new Date(invoice.issue_date || invoice.created_at), 'MMM d, yyyy')}</p></td>
                  <td className="p-4"><p className="text-white">{invoice.customer?.name || '—'}</p>{invoice.customer?.company && <p className="text-sm text-white/40">{invoice.customer.company}</p>}</td>
                  <td className="p-4"><span className="badge" style={{ backgroundColor: `${config.color}20`, color: config.color }}>{config.label}</span></td>
                  <td className="p-4 text-white/60">{invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '—'}</td>
                  <td className="p-4 text-right"><p className="font-semibold text-white">${(invoice.total || 0).toLocaleString()}</p></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredInvoices.length === 0 && <div className="text-center py-12 text-white/40">No invoices found</div>}
      </div>
      <div className="card p-5 border-blue-500/30 bg-blue-500/5"><h3 className="font-semibold text-white mb-2">💡 Coming Soon</h3><p className="text-white/60 text-sm">Stripe payments and Outlook email integration.</p></div>
    </div>
  );
}
