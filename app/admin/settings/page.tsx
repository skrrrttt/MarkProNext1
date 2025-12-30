'use client';

import { useState } from 'react';
import { Building2, Users, Tag, Flag, ClipboardList, CreditCard, Save, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const tabs = [
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'users', label: 'Users & Passwords', icon: Users },
    { id: 'tags', label: 'Tags', icon: Tag },
    { id: 'flags', label: 'Job Flags', icon: Flag },
    { id: 'stages', label: 'Job Stages', icon: ClipboardList },
    { id: 'integrations', label: 'Integrations', icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Settings</h1><p className="text-white/60 mt-1">Manage your workspace</p></div>
      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-64 flex-shrink-0 card p-2 space-y-1 h-fit">
          {tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${activeTab === tab.id ? 'bg-brand-500/10 text-brand-500' : 'text-white/60 hover:text-white hover:bg-white/5'}`}><tab.icon className="w-5 h-5" /><span className="font-medium">{tab.label}</span></button>)}
        </nav>
        <div className="flex-1 card p-6">
          {activeTab === 'company' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Company Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">Company Name</label><input type="text" className="input" defaultValue="MarkPro" /></div>
                <div><label className="label">Phone</label><input type="tel" className="input" placeholder="(555) 123-4567" /></div>
                <div><label className="label">Email</label><input type="email" className="input" placeholder="contact@company.com" /></div>
                <div><label className="label">Address</label><input type="text" className="input" placeholder="123 Main St" /></div>
              </div>
              <button className="btn-primary" onClick={() => toast.success('Saved')}><Save className="w-4 h-4" />Save</button>
            </div>
          )}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Login Passwords</h2>
              <p className="text-white/60 text-sm">Simple password auth for your team</p>
              <div className="space-y-4">
                <div><label className="label">Admin Password</label><input type="text" className="input" defaultValue="markproadmin" /></div>
                <div><label className="label">Field Password</label><input type="text" className="input" defaultValue="markpro2025" /></div>
              </div>
              <button className="btn-primary" onClick={() => toast.success('Updated')}><Save className="w-4 h-4" />Save</button>
            </div>
          )}
          {activeTab === 'tags' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Customer Tags</h2><button className="btn-secondary"><Plus className="w-4 h-4" />Add</button></div>
              <div className="space-y-2">{['Commercial', 'Residential', 'Municipal', 'Repeat Customer'].map((tag, i) => <div key={i} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg"><div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-blue-500" /><span className="text-white">{tag}</span></div><button className="btn-icon text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></div>)}</div>
            </div>
          )}
          {activeTab === 'flags' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Job Flags</h2><button className="btn-secondary"><Plus className="w-4 h-4" />Add</button></div>
              <p className="text-white/60 text-sm">Mark jobs that need attention</p>
              <div className="space-y-2">{[{ name: 'Urgent', color: '#ef4444' }, { name: 'Need to Contact', color: '#f59e0b' }, { name: 'Waiting on Customer', color: '#6366f1' }].map((flag, i) => <div key={i} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg"><div className="flex items-center gap-3"><Flag className="w-4 h-4" style={{ color: flag.color }} /><span className="text-white">{flag.name}</span></div><button className="btn-icon text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></div>)}</div>
            </div>
          )}
          {activeTab === 'stages' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Job Pipeline Stages</h2>
              <p className="text-white/60 text-sm">Toggle which stages are visible to field workers</p>
              <div className="space-y-2">{[{ name: 'Lead', color: '#94a3b8', field: false }, { name: 'Quote Sent', color: '#f59e0b', field: false }, { name: 'Approved', color: '#10b981', field: false }, { name: 'Scheduled', color: '#3b82f6', field: true }, { name: 'In Progress', color: '#8b5cf6', field: true }, { name: 'Completed', color: '#22c55e', field: true }, { name: 'Invoiced', color: '#06b6d4', field: false }].map((stage, i) => <div key={i} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} /><span className="text-white">{stage.name}</span></div><label className="flex items-center gap-2 text-sm text-white/60"><input type="checkbox" defaultChecked={stage.field} className="rounded" />Field visible</label></div>)}</div>
            </div>
          )}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Integrations</h2>
              <div className="space-y-4">
                <div className="p-4 bg-dark-bg rounded-lg border border-dark-border"><div className="flex items-center justify-between mb-2"><h3 className="font-medium text-white">Stripe Payments</h3><span className="badge bg-amber-500/20 text-amber-400">Coming Soon</span></div><p className="text-white/60 text-sm">Accept payments on invoices</p></div>
                <div className="p-4 bg-dark-bg rounded-lg border border-dark-border"><div className="flex items-center justify-between mb-2"><h3 className="font-medium text-white">Microsoft Outlook</h3><span className="badge bg-amber-500/20 text-amber-400">Coming Soon</span></div><p className="text-white/60 text-sm">Send invoices via email</p></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
