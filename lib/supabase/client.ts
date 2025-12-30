import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { env } from '@/lib/env';

// Create a properly typed client once to infer the type
const _client = createBrowserClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL || '',
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Use the inferred type from the actual client
export type TypedSupabaseClient = typeof _client;

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
    );
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
  );
};
