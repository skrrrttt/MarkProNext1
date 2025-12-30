import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { env } from '@/lib/env';

export type TypedSupabaseClient = SupabaseClient<Database>;

// Singleton for client-side to avoid multiple instances
let clientInstance: TypedSupabaseClient | null = null;

/**
 * Get Supabase client instance (singleton)
 * Use this in Client Components with 'use client' directive
 */
export function getSupabaseClient(): TypedSupabaseClient {
  if (clientInstance === null) {
    clientInstance = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) as TypedSupabaseClient;
  }
  return clientInstance;
}

/**
 * Create a new Supabase client instance
 */
export const createClient = (): TypedSupabaseClient => {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) as TypedSupabaseClient;
};
