import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  getSupabase,
  isSupabaseConfigured,
  supabase,
  createClient as createClientHelper,
} from '../utils/supabase/client';

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return getSupabase();
  return createSupabaseClient(url, key);
};

export { getSupabase, isSupabaseConfigured, supabase, createClientHelper };
export default getSupabase;
