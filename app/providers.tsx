'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/lib/store';
import { onNetworkChange, syncPendingChanges, getDB } from '@/lib/offline/storage';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AuthProvider } from '@/lib/auth/AuthProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  const { setOnline, setSyncStatus, isOnline } = useUIStore();
  const [mounted, setMounted] = useState(false);

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize IndexedDB
  useEffect(() => {
    getDB().catch(console.error);
  }, []);

  // Network status monitoring
  useEffect(() => {
    const cleanup = onNetworkChange((online) => {
      setOnline(online);

      // Auto-sync when coming back online
      if (online) {
        setSyncStatus('syncing');
        const supabase = getSupabaseClient();
        syncPendingChanges(supabase)
          .then(({ failed }) => {
            if (failed > 0) {
              setSyncStatus('error');
            } else {
              setSyncStatus('idle');
            }
          })
          .catch(() => setSyncStatus('error'));
      }
    });

    return cleanup;
  }, [setOnline, setSyncStatus]);

  // Service Worker registration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.log('SW registration failed:', err));
    }
  }, []);

  return (
    <AuthProvider>
      {/* Offline indicator - only render after hydration to avoid mismatch */}
      {mounted && !isOnline && (
        <div className="offline-banner">
          You&apos;re offline — changes will sync when connected
        </div>
      )}
      {children}
    </AuthProvider>
  );
}
