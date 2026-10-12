import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
  );
};

let clientInstance = null;

/**
 * Returns the Supabase client singleton instance
 */
export function getSupabase() {
  if (clientInstance) return clientInstance;

  if (isSupabaseConfigured()) {
    clientInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
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
    // Return null or placeholder client
    clientInstance = null;
  }

  return clientInstance;
}

export const supabase = isSupabaseConfigured()
  ? createSupabaseClient(supabaseUrl, supabaseAnonKey)
  : null;

export default getSupabase;
