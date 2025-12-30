'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Truck, Shield, Users } from 'lucide-react';
import toast from 'react-hot-toast';

// Passwords from app settings (would normally fetch from Supabase)
const PASSWORDS = {
  admin: 'markproadmin',
  field: 'markpro2025',
};

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simple password auth (would use Supabase Auth in production)
    if (password === PASSWORDS.admin) {
      login('admin');
      toast.success('Welcome, Admin!');
      router.push('/admin/dashboard');
    } else if (password === PASSWORDS.field) {
      login('field');
      toast.success('Welcome!');
      router.push('/field/jobs');
    } else {
      toast.error('Incorrect password');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-dark-bg">
      {/* Logo */}
      <div className="mb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center">
            <Truck className="w-8 h-8 text-black" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white">MarkPro</h1>
        <p className="text-white/60 mt-2">Field Service Management</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm">
        <div className="card p-6">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full btn-primary py-3 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Access levels info */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-3 text-white/40 text-sm">
            <Shield className="w-4 h-4" />
            <span>Admin: Full access to CRM, invoicing, settings</span>
          </div>
          <div className="flex items-center gap-3 text-white/40 text-sm">
            <Users className="w-4 h-4" />
            <span>Field: View assigned jobs, update checklists, upload photos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
