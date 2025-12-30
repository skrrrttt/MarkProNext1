import useSWR, { SWRConfiguration, mutate } from 'swr';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getCached, setCache, isOnline } from '@/lib/offline/storage';

// Stale-while-revalidate fetcher with offline support
export function createFetcher<T>(
  queryFn: (supabase: ReturnType<typeof getSupabaseClient>) => Promise<T>
) {
  return async (key: string): Promise<T> => {
    const supabase = getSupabaseClient();
    
    // If offline, return cached data
    if (!isOnline()) {
      const cached = await getCached<T>(key);
      if (cached) return cached;
      throw new Error('Offline and no cached data available');
    }
    
    // Fetch fresh data
    const data = await queryFn(supabase);
    
    // Cache for offline use
    await setCache(key, data, 10 * 60 * 1000); // 10 minute TTL
    
    return data;
  };
}

// Generic data hook with offline support
export function useSupabaseQuery<T>(
  key: string | null,
  queryFn: (supabase: ReturnType<typeof getSupabaseClient>) => Promise<T>,
  config?: SWRConfiguration
) {
  const fetcher = createFetcher(queryFn);
  
  return useSWR<T>(key, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    ...config,
    // Return stale data while revalidating
    keepPreviousData: true,
  });
}

// Optimistic update helper
export async function optimisticUpdate<T>(
  key: string,
  updateFn: (current: T | undefined) => T,
  serverFn: () => Promise<void>
) {
  // Optimistically update the UI
  await mutate(
    key,
    async (current: T | undefined) => {
      return updateFn(current);
    },
    { revalidate: false }
  );
  
  try {
    // Perform the server update
    await serverFn();
    // Revalidate to ensure consistency
    await mutate(key);
  } catch (error) {
    // Revert on error
    await mutate(key);
    throw error;
  }
}

// Invalidate related cache keys
export async function invalidateQueries(keys: string[]) {
  await Promise.all(keys.map(key => mutate(key)));
}
