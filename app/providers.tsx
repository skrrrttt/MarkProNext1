'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/lib/store';
import { onNetworkChange, syncPendingChanges, getDB } from '@/lib/offline/storage';
import { getSupabaseClient } from '@/lib/supabase/client';

export function Providers({ children }: { children: React.ReactNode }) {
  const { setOnline, setSyncStatus, isOnline } = useUIStore();

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
          .then(({ success, failed }) => {
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
    <>
      {/* Offline indicator */}
      {!isOnline && (
        <div className="offline-banner">
          You&apos;re offline — changes will sync when connected
        </div>
      )}
      {children}
    </>
  );
}
