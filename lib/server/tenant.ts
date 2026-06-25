import { getServerClient } from '@/lib/supabase/server';

// Returns the businessId for the current user. If they belong to several
// (e.g. an accountant), read the active one from a cookie / route param.
export async function getActiveBusinessId(preferred?: string): Promise<string | null> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from('memberships')
    .select('business_id, role')
    .eq('is_active', true);
  if (error) throw error;
  const ids = (data ?? []).map((m: { business_id: string }) => m.business_id);
  if (preferred && ids.includes(preferred)) return preferred;
  return ids[0] ?? null;
}
