import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components (Browser).
 * Uses strictly NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Never accesses or leaks SUPABASE_SERVICE_ROLE_KEY.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

