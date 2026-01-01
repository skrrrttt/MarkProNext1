'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function HomePage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not authenticated - redirect to login
        router.push('/login');
      } else {
        // Authenticated - redirect based on role
        if (role === 'admin' || role === 'office') {
          router.push('/admin/dashboard');
        } else if (role === 'field') {
          router.push('/field/jobs');
        } else {
          // Role not set - redirect to login
          router.push('/login');
        }
      }
    }
  }, [user, role, loading, router]);

  // Show loading state while checking authentication
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white/60">Loading...</p>
      </div>
    </div>
  );
}
