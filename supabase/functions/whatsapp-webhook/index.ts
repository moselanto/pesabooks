import { parseInbound, sendText } from './wa.ts';
import { classify } from './intent.ts';
import { handle, handleButton } from './handlers.ts';
import { resolveBusiness, logMessage } from './db.ts';

const VERIFY_TOKEN = Deno.env.get('WA_VERIFY_TOKEN')!;
const APP_SECRET = Deno.env.get('WA_APP_SECRET')!;

async function validSignature(req: Request, raw: string): Promise<boolean> {
  const sig = req.headers.get('x-hub-signature-256');
  if (!sig) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(APP_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return sig === `sha256=${hex}`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // 1) Webhook verification handshake.
  if (req.method === 'GET') {
    if (url.searchParams.get('hub.verify_token') === VERIFY_TOKEN) {
      return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 });
    }
    return new Response('forbidden', { status: 403 });
  }

  // 2) Inbound message.
  const raw = await req.text();
  if (!(await validSignature(req, raw))) return new Response('bad signature', { status: 401 });

  const payload = JSON.parse(raw);
  const msg = parseInbound(payload);
  if (!msg) return new Response('ok', { status: 200 });

  const businessId = await resolveBusiness(msg.from);
  await logMessage(businessId, msg.from, 'inbound', msg.text, undefined, { buttonId: msg.buttonId });

  try {
    if (msg.buttonId) {
      await handleButton(businessId, msg.from, msg.buttonId);
    } else {
      const intent = await classify(msg.text);
      await handle(businessId, msg.from, intent, msg.text);
    }
  } catch (e) {
    await sendText(msg.from, 'Something went wrong on my end. Please try again in a moment.');
    console.error('wa-handler', e);
  }

  return new Response('ok', { status: 200 });
});
