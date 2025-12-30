import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Get Supabase client instance (singleton)
 * Use this in Client Components with 'use client' directive
 */
let browserClient: any = null;

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}

/**
 * Create a new Supabase client instance
 */
export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
