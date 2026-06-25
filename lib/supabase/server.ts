import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// RLS-scoped server client. Uses the anon key + the user's session cookies, so
// every query is governed by row-level security. Use this for all dashboard reads/writes.
export function getServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: Record<string, unknown>) =>
          cookieStore.set(name, value, options),
        remove: (name: string, options: Record<string, unknown>) =>
          cookieStore.set(name, '', options),
      },
    },
  );
}
