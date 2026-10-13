import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey;
  return (
    Boolean(url) &&
    Boolean(key) &&
    !url.includes('placeholder') &&
    !key.includes('placeholder')
  );
};

let clientInstance = null;

/**
 * Returns the Supabase client singleton instance
 */
export function getSupabase() {
  if (clientInstance) return clientInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey;

  if (isSupabaseConfigured()) {
    clientInstance = createSupabaseClient(url, key, {
      auth: {
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } else {
    clientInstance = null;
  }

  return clientInstance;
}

/**
 * Helper to create a Supabase client on demand using env credentials
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey;
  if (!isSupabaseConfigured()) return null;
  return createSupabaseClient(url, key);
}

export const supabase = isSupabaseConfigured()
  ? createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey
    )
  : null;

export default getSupabase;
