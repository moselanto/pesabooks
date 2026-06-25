const KRA_BASE = Deno.env.get('KRA_OSCU_BASE_URL')!;
const KRA_KEY = Deno.env.get('KRA_OSCU_API_KEY')!;
const KRA_BHFID = Deno.env.get('KRA_BRANCH_ID') ?? '00';

export class KraError extends Error {
  constructor(
    msg: string,
    public httpStatus: number | null,
    public code?: string,
    public raw?: unknown,
  ) {
    super(msg);
  }
}

// deno-lint-ignore no-explicit-any
function buildPayload(ctx: any) {
  const biz = ctx.businesses;
  const isVat = biz.tax_regime === 'vat';
  return {
    tin: biz.kra_pin,
    bhfId: KRA_BHFID,
    invcNo: ctx.number,
    salesDt: (ctx.issued_at ?? new Date().toISOString()).slice(0, 10).replace(/-/g, ''),
    custTin: ctx.customers?.kra_pin ?? null,
    custNm: ctx.customers?.name ?? 'Walk-in',
    taxblAmt: Number(ctx.subtotal),
    vatAmt: Number(ctx.vat_amount),
    totAmt: Number(ctx.total),
    taxRate: isVat ? 16 : 0,
    // deno-lint-ignore no-explicit-any
    itemList: ctx.invoice_items.map((it: any, i: number) => ({
      itemSeq: i + 1, itemNm: it.description,
      qty: Number(it.qty), prc: Number(it.unit_price), totAmt: Number(it.line_total),
    })),
  };
}

// deno-lint-ignore no-explicit-any
export async function submitToOscu(ctx: any) {
  const payload = buildPayload(ctx);
  let res: Response;
  try {
    res = await fetch(`${KRA_BASE}/trnsSales/saveSales`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': KRA_KEY },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    throw new KraError(`network: ${(e as Error).message}`, null);
  }

  // deno-lint-ignore no-explicit-any
  let body: any = null;
  try { body = await res.json(); } catch { /* non-JSON */ }

  if (!res.ok) {
    throw new KraError(body?.resultMsg ?? `HTTP ${res.status}`, res.status, body?.resultCd, body);
  }
  if (body?.resultCd && body.resultCd !== '000') {
    throw new KraError(body.resultMsg ?? 'OSCU rejected', 200, body.resultCd, body);
  }

  return {
    controlUnitNo: body?.data?.curRcptNo ?? body?.data?.intrlData ?? '',
    qrPayload: body?.data?.qrCodeUrl ?? body?.data?.rcptSign ?? '',
    raw: body,
  };
}
