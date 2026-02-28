import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/config/env";

export function createSupabaseBrowserClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return null;
  }

  return createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

export async function createSupabaseServerClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items) {
        for (const { name, value, options } of items) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
