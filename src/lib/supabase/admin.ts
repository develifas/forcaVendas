import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase Admin Client using SUPABASE_SERVICE_ROLE_KEY.
 *
 * INVIOLABLE SECURITY RULE:
 * This client runs EXCLUSIVELY on the server for system-level migrations,
 * webhooks, or explicit background tasks with internal authorization checks.
 * NEVER import or invoke this file from client-facing code.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

