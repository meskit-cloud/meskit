import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AsyncLocalStorage } from "async_hooks";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * REST API path: inject a pre-authenticated client so tools work without cookies.
 * Usage: apiClientStorage.run(client, () => executeTool(...))
 */
export const apiClientStorage = new AsyncLocalStorage<SupabaseClient>();

export async function createClient() {
  // REST API path: use injected JWT-scoped client
  const apiClient = apiClientStorage.getStore();
  if (apiClient) return apiClient as Awaited<ReturnType<typeof createServerClientFromCookies>>;

  return createServerClientFromCookies();
}

async function createServerClientFromCookies() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — ignore.
            // Middleware will refresh the session.
          }
        },
      },
    },
  );
}

