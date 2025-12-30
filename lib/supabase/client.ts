import { createBrowserClient, SupabaseClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { env } from '@/lib/env';

/**
 * Client-side Supabase browser client
 * Use this in Client Components with 'use client' directive
 */
export const createClient = (): SupabaseClient<Database> => {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

// Singleton for client-side to avoid multiple instances
let client: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (!client) {
    client = createClient();
  }
  return client;
};
