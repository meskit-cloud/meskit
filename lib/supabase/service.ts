import { createClient } from "@supabase/supabase-js";

/**
 * Service role client — bypasses RLS.
 * Use ONLY for admin operations (e.g. API key validation, webhook subscription reads).
 * Requires SUPABASE_SERVICE_ROLE_KEY env var (available in Supabase dashboard → Settings → API).
 */
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
