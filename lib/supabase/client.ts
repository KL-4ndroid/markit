/**
 * Supabase client configuration.
 *
 * This module centralizes Supabase initialization and a few small auth helpers.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not configured. Some cloud features will be disabled.');
}

/**
 * Supabase browser client.
 *
 * Auth settings:
 * - persistSession: keep the signed-in session in browser storage.
 * - autoRefreshToken: refresh auth tokens automatically.
 * - detectSessionInUrl: detect Supabase session callbacks from the URL.
 */
export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export function isSupabaseConfigured(): boolean {
  return isConfigured;
}

export async function testSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);

    // PGRST116 means no rows were found; the request still reached Supabase.
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase connection test failed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Failed to get current user:', error);
    return null;
  }

  return user;
}

export async function signOut() {
  if (!isSupabaseConfigured()) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Failed to sign out:', error);
    throw error;
  }
}
