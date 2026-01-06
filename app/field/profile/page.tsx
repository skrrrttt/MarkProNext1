'use client';

import { useAuth } from '@/lib/auth/AuthProvider';
import { User, LogOut } from 'lucide-react';

export default function FieldProfilePage() {
  const { signOut } = useAuth();

  return (
    <div className="space-y-6">
      <div className="card p-6 text-center">
        <div className="w-20 h-20 bg-dark-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-10 h-10 text-white/40" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-1">Field User</h2>
        <p className="text-white/60">MarkPro Field Team</p>
      </div>

      <button onClick={signOut} className="btn-field-secondary w-full">
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </div>
  );
}
