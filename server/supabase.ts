import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  // Use service role key for server-side operations (allows file uploads/deletes and auth admin)
  // NEVER expose this key to the client
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export const supabase = createSupabaseClient();

export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Helper to verify JWT token from client
export async function verifySupabaseToken(token: string) {
  if (!supabase) {
    console.error('[Supabase] Client not configured - missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    throw new Error('Supabase not configured');
  }

  console.log('[Supabase] Verifying token with getUser...');
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error) {
    console.error('[Supabase] Token verification error:', error.message, error.status);
    return null;
  }
  
  if (!data.user) {
    console.error('[Supabase] No user returned from getUser');
    return null;
  }

  console.log('[Supabase] Token verified successfully for user:', data.user.email);
  return data.user;
}
