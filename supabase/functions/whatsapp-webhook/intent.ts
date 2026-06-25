export type Intent =
  | { kind: 'create_invoice'; customer?: string; amount?: number; description?: string }
  | { kind: 'categorize'; answer: string }
  | { kind: 'report'; period: 'today' | 'month' }
  | { kind: 'onboard' }
  | { kind: 'help' }
  | { kind: 'unknown' };

// Cheap deterministic rules first (free + instant).
export function ruleIntent(text: string): Intent | null {
  const t = text.trim().toLowerCase();
  if (/^(hi|hello|start|menu|help)$/.test(t)) return { kind: 'help' };
  if (/\breport\b/.test(t)) return { kind: 'report', period: /today/.test(t) ? 'today' : 'month' };
  const m = text.match(/invoice\s+(.+?)\s+(\d[\d,]*)\s*(?:for\s+(.+))?$/i);
  if (m) {
    return {
      kind: 'create_invoice',
      customer: m[1].trim(),
      amount: Number(m[2].replace(/,/g, '')),
      description: m[3]?.trim(),
    };
  }
  return null;
}

// LLM fallback for free-form text.
export async function llmIntent(text: string): Promise<Intent> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Classify a Kenyan SME WhatsApp message into JSON intent. Schema: ' +
            '{kind:"create_invoice"|"categorize"|"report"|"onboard"|"help"|"unknown", ' +
            'customer?, amount?(number), description?, answer?, period?("today"|"month")}. ' +
            'Amounts may use KES/Ksh and commas. Return only JSON.',
        },
        { role: 'user', content: text },
      ],
    }),
  });
  const j = await res.json();
  try {
    return JSON.parse(j.choices[0].message.content) as Intent;
  } catch {
    return { kind: 'unknown' };
  }
}

export async function classify(text: string): Promise<Intent> {
  return ruleIntent(text) ?? (await llmIntent(text));
}
