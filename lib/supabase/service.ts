import { createClient } from '@supabase/supabase-js';

// SERVER-ONLY. Bypasses RLS via the service role key. Only import in trusted server
// code (Route Handlers, server actions doing onboarding, Edge-style work).
// NEVER import this in a client component.
export const serviceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
