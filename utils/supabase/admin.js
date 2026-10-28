import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Prioritize SUPABASE_SERVICE_ROLE_KEY to safely bypass Row Level Security on the server
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

let adminClientInstance = null;

/**
 * Returns a server-side Supabase client with service_role privileges
 * Safe to use ONLY in server-side API routes and Server Actions.
 */
export function getAdminSupabase() {
  if (adminClientInstance) return adminClientInstance;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[getAdminSupabase] Missing Supabase URL or Service Key.');
    return null;
  }

  adminClientInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClientInstance;
}

export default getAdminSupabase;
