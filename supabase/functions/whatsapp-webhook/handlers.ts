import { sendText, sendButtons } from './wa.ts';
import { createInvoice, createBusinessForWa, getSession, setSession, sb } from './db.ts';
import type { Intent } from './intent.ts';

const RECEIPT_BASE = Deno.env.get('PUBLIC_APP_URL')!;

export async function handle(businessId: string | null, from: string, intent: Intent, _rawText: string) {
  if (!businessId) return onboard(from, _rawText);

  switch (intent.kind) {
    case 'help':
      return sendButtons(from, 'Hi! What would you like to do?', [
        { id: 'inv', title: 'Issue invoice' },
        { id: 'rep', title: 'Today summary' },
      ]);

    case 'create_invoice': {
      if (!intent.amount) {
        return sendText(from, 'How much is the invoice? e.g. "invoice J. Otieno 3200 for cooking oil"');
      }
      await setSession(from, { business_id: businessId, state: 'confirm_invoice', context: intent });
      return sendButtons(
        from,
        `Issue a KRA invoice?\n\nCustomer: ${intent.customer ?? 'Walk-in'}\nItem: ${intent.description ?? 'Goods'}\nAmount: KES ${intent.amount.toLocaleString('en-KE')}`,
        [{ id: 'inv_yes', title: 'Yes, issue it' }, { id: 'inv_edit', title: 'Edit' }],
      );
    }

    case 'report':
      return sendText(from, await buildSummary(businessId, intent.period));

    default:
      return sendText(from, 'Sorry, I didn\'t catch that. Try: "invoice <name> <amount> for <item>" or type "menu".');
  }
}

export async function handleButton(businessId: string | null, from: string, buttonId: string) {
  const session = await getSession(from);
  if (buttonId === 'inv_yes' && session.state === 'confirm_invoice' && businessId) {
    const ctx = session.context as Intent & { amount: number; description?: string };
    const { number } = await createInvoice(businessId, [
      { description: ctx.description ?? 'Goods', qty: 1, unit_price: ctx.amount },
    ]);
    await setSession(from, { state: 'idle', context: {} });
    return sendText(
      from,
      `Done. ${number} for KES ${ctx.amount.toLocaleString('en-KE')} issued.\n` +
        `I'll record the M-Pesa payment automatically when it lands.`,
    );
  }
  if (buttonId === 'inv_edit') {
    await setSession(from, { state: 'idle', context: {} });
    return sendText(from, 'No problem. Resend like: "invoice J. Otieno 3200 for cooking oil".');
  }
  if (buttonId === 'inv') return sendText(from, 'Sure — send: "invoice <name> <amount> for <item>".');
  if (buttonId === 'rep' && businessId) return sendText(from, await buildSummary(businessId, 'today'));
}

async function onboard(from: string, text: string) {
  const s = await getSession(from);
  if (s.state === 'idle') {
    await setSession(from, { state: 'onboarding_name' });
    return sendText(from, "Karibu! I'm your AI bookkeeper. I'll set you up in a minute. What's your business name?");
  }
  if (s.state === 'onboarding_name') {
    await setSession(from, { state: 'onboarding_pin', context: { name: text.trim() } });
    return sendText(from, 'And your KRA PIN? (so I can issue legal invoices)');
  }
  if (s.state === 'onboarding_pin') {
    const name = (s.context as { name: string }).name;
    const userId = crypto.randomUUID();
    const businessId = await createBusinessForWa(userId, name, from, text.trim());
    await setSession(from, { business_id: businessId, state: 'idle', context: {} });
    return sendButtons(
      from,
      "Perfect — you're set up! Forward me any M-Pesa SMS and I'll start your books. Try your first invoice:",
      [{ id: 'inv', title: 'Issue first invoice' }],
    );
  }
}

async function buildSummary(businessId: string, period: 'today' | 'month') {
  const now = new Date();
  const from = period === 'today'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data } = await sb.from('transactions').select('direction, amount')
    .eq('business_id', businessId).gte('occurred_at', from);
  const rows = data ?? [];
  // deno-lint-ignore no-explicit-any
  const sales = rows.filter((r: any) => r.direction === 'in').reduce((a: number, r: any) => a + Number(r.amount), 0);
  // deno-lint-ignore no-explicit-any
  const spend = rows.filter((r: any) => r.direction === 'out').reduce((a: number, r: any) => a + Number(r.amount), 0);
  const label = period === 'today' ? 'Today' : 'This month';
  return `${label}:\nSales: KES ${sales.toLocaleString('en-KE')}\nExpenses: KES ${spend.toLocaleString('en-KE')}\nNet: KES ${(sales - spend).toLocaleString('en-KE')}`;
}
