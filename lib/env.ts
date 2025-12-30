/**
 * Environment variable validation
 * Ensures all required environment variables are present
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

type RequiredEnvVars = typeof requiredEnvVars[number];

function validateEnv(): Record<RequiredEnvVars, string> {
  const missing: string[] = [];
  const env = {} as Record<RequiredEnvVars, string>;

  for (const key of requiredEnvVars) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
    } else {
      env[key] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please check your .env.local file or Vercel environment variables.`
    );
  }

  return env;
}

// Validate on module load (both client and server)
export const env = validateEnv();

// Helper to check if running in production
export const isProd = process.env.NODE_ENV === 'production';
export const isDev = process.env.NODE_ENV === 'development';
