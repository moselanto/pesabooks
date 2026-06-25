const PHONE_ID = Deno.env.get('WA_PHONE_NUMBER_ID')!;
const TOKEN = Deno.env.get('WA_ACCESS_TOKEN')!;
const GRAPH = `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`;

export async function sendText(to: string, body: string) {
  await fetch(GRAPH, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  });
}

export async function sendButtons(to: string, body: string, buttons: { id: string; title: string }[]) {
  await fetch(GRAPH, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to, type: 'interactive',
      interactive: {
        type: 'button', body: { text: body },
        action: { buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })) },
      },
    }),
  });
}

// deno-lint-ignore no-explicit-any
export function parseInbound(payload: any): { from: string; text: string; buttonId?: string } | null {
  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  const msg = value?.messages?.[0];
  if (!msg) return null;
  const from = msg.from as string;
  if (msg.type === 'text') return { from, text: msg.text?.body ?? '' };
  if (msg.type === 'interactive') {
    const r = msg.interactive?.button_reply;
    return { from, text: r?.title ?? '', buttonId: r?.id };
  }
  return { from, text: '' };
}
