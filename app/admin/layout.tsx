'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useUIStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/AuthProvider';
import { LayoutDashboard, Briefcase, Users, Wrench, Settings, Menu, X, LogOut, Truck, Loader2 } from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/admin/customers', icon: Users, label: 'Customers' },
  { href: '/admin/shop', icon: Wrench, label: 'Shop Tasks' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, loading, signOut } = useAuth();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();

  useEffect(() => {
    if (!loading && (!user || (role !== 'admin' && role !== 'office'))) {
      router.push('/login');
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [pathname, setSidebarOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center animate-pulse">
            <Truck className="w-7 h-7 text-black" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-2 text-white/60">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-dark-card border-r border-dark-border transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-4 border-b border-dark-border">
            <Link href="/admin/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-black" aria-hidden="true" />
              </div>
              <span className="font-bold text-lg text-white">MarkPro</span>
            </Link>
            <button
              onClick={toggleSidebar}
              className="lg:hidden btn-icon"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" role="navigation">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-brand-500/10 text-brand-500' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className="w-5 h-5" aria-hidden="true" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-dark-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-dark-bg rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">A</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Admin</p>
                  <p className="text-xs text-white/40 capitalize">{role}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="btn-icon text-white/40 hover:text-white"
                aria-label="Sign out"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-dark-card/50 backdrop-blur border-b border-dark-border flex items-center px-4 sticky top-0 z-30">
          <button
            onClick={toggleSidebar}
            className="btn-icon lg:hidden mr-4"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <div className="flex-1" />
          <button
            onClick={signOut}
            className="btn-icon lg:hidden text-white/60 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <div className="content-container page-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
