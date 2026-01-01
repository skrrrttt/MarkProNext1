'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Briefcase, ClipboardList, User } from 'lucide-react';
import Link from 'next/link';

const navItems = [
  { href: '/field/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/field/tasks', icon: ClipboardList, label: 'Tasks' },
  { href: '/field/profile', icon: User, label: 'Profile' },
];

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && (!user || role !== 'field')) {
      router.push('/login');
    }
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-bg field-mode pb-24">
      <header className="sticky top-0 z-40 bg-dark-card/95 backdrop-blur border-b border-dark-border px-4 py-4 pt-safe">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">MarkPro</h1>
          <button onClick={signOut} className="text-white/60 text-sm">Sign Out</button>
        </div>
      </header>
      <main className="px-4 py-6">{children}</main>
      <nav className="nav-field">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} className={`nav-field-item ${isActive ? 'active' : ''}`}><item.icon className="w-6 h-6" /><span className="text-xs font-medium">{item.label}</span></Link>;
        })}
      </nav>
    </div>
  );
}
