'use server';

import { serviceClient } from '@/lib/supabase/service';

export interface OnboardInput {
  userId: string;
  name: string;
  phone: string;
  kraPin?: string;
}

// Creates the tenant + owner membership + free subscription atomically via RPC.
// Runs server-side with the service role because the user has no membership yet.
export async function createBusinessWithOwner(input: OnboardInput) {
  const sb = serviceClient();
  const { data, error } = await sb.rpc('create_business_with_owner', {
    p_user_id: input.userId,
    p_name: input.name,
    p_phone: input.phone,
    p_kra_pin: input.kraPin ?? null,
  });
  if (error) return { ok: false as const, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true as const, businessId: row.business_id as string };
}
