import { createBrowserClient } from '@supabase/ssr';

// Using 'any' to avoid TypeScript strict mode issues with Supabase
// In production, generate proper types with: npx supabase gen types typescript
export const createClient = () => {
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Singleton for client-side
let client: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  if (!client) {
    client = createClient();
  }
  return client;
};
