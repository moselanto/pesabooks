type CatResult = { category: string; confidence: number; reason: string };

// Deterministic rules first (free + instant).
export function ruleCategorize(p: {
  direction: 'in' | 'out'; counterparty: string | null; source: string; amount: number;
}): CatResult | null {
  const name = (p.counterparty ?? '').toLowerCase();
  if (/kplc|kenya power|nairobi water|safaricom|zuku|dstv|gotv/.test(name)) {
    return { category: 'utilities', confidence: 0.97, reason: 'Recognized utility/biller' };
  }
  if (p.direction === 'in' && /till|paybill/.test(p.source)) {
    return { category: 'sale', confidence: 0.9, reason: 'Inflow via merchant Till/Paybill' };
  }
  if (p.direction === 'out' && /paybill|till/.test(p.source)) {
    return { category: 'purchase', confidence: 0.8, reason: 'Outflow to a Till/Paybill (supplier)' };
  }
  return null;
}

// LLM fallback for ambiguous cases.
export async function aiCategorize(p: {
  direction: 'in' | 'out'; counterparty: string | null; source: string; amount: number; description: string;
}): Promise<CatResult> {
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
            'Categorize a Kenyan SME M-Pesa transaction. Return JSON ' +
            '{category: one of [sale,purchase,utilities,transport,rent,salaries,personal,transfer,other], ' +
            'confidence: 0..1, reason: short}. Lean "personal" for small sends to individual numbers with no ' +
            'business context; lean "sale" for inflows; "purchase" for outflows to businesses.',
        },
        { role: 'user', content: JSON.stringify(p) },
      ],
    }),
  });
  const j = await res.json();
  try {
    const o = JSON.parse(j.choices[0].message.content);
    return { category: o.category ?? 'uncategorized', confidence: Number(o.confidence ?? 0.5), reason: o.reason ?? 'AI estimate' };
  } catch {
    return { category: 'uncategorized', confidence: 0, reason: 'Could not classify' };
  }
}

// deno-lint-ignore no-explicit-any
export async function categorize(p: any): Promise<CatResult> {
  return ruleCategorize(p) ?? (await aiCategorize(p));
}
