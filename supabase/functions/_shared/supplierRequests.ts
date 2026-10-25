// Enterprise supplier requests: input checks and the email a supplier
// receives. Pure, so the website tests run it too. The supplier-requests
// function writes rows through service_create_supplier_request and sends this
// email; the token in the link is never stored (only its SHA-256).

export const MAX_SUPPLIERS_PER_CALL = 100;
const GSTIN = /^[0-9]{2}[A-Z0-9]{13}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface SupplierInput {
  name: string;
  email?: string | null;
  gstin?: string | null;
  buys?: string | null;
  purchaseSharePct?: number | null;
  scope3Category?: 1 | 2 | 4;
}

export interface CleanSupplier {
  name: string;
  email: string | null;
  gstin: string | null;
  buys: string | null;
  purchaseSharePct: number | null;
  scope3Category: 1 | 2 | 4;
}

export type RowResult = { ok: true; value: CleanSupplier } | { ok: false; error: string };

export function cleanSupplier(raw: SupplierInput): RowResult {
  const name = String(raw?.name ?? '').trim();
  if (name.length < 2 || name.length > 200) return { ok: false, error: 'Add the supplier name.' };
  const email = raw?.email ? String(raw.email).trim().toLowerCase() : null;
  if (email && !EMAIL.test(email)) return { ok: false, error: `${name}: the email address looks wrong.` };
  const gstin = raw?.gstin ? String(raw.gstin).trim().toUpperCase() : null;
  if (gstin && !GSTIN.test(gstin)) return { ok: false, error: `${name}: the GSTIN should be 15 characters.` };
  if (!email && !gstin) return { ok: false, error: `${name}: add an email or a GSTIN so the request reaches them.` };
  const buys = raw?.buys ? String(raw.buys).trim().slice(0, 200) || null : null;
  const share = raw?.purchaseSharePct == null || raw.purchaseSharePct === ('' as unknown) ? null : Number(raw.purchaseSharePct);
  if (share !== null && (!Number.isFinite(share) || share < 0 || share > 100)) return { ok: false, error: `${name}: share of purchases must be between 0 and 100.` };
  const cat = raw?.scope3Category ?? 1;
  if (![1, 2, 4].includes(cat)) return { ok: false, error: `${name}: Scope 3 category must be 1, 2 or 4.` };
  return { ok: true, value: { name, email, gstin, buys, purchaseSharePct: share === null ? null : Math.round(share * 100) / 100, scope3Category: cat as 1 | 2 | 4 } };
}

export function checkPeriod(start: unknown, end: unknown): { ok: true; start: string; end: string } | { ok: false; error: string } {
  if (typeof start !== 'string' || typeof end !== 'string' || !DATE.test(start) || !DATE.test(end)) return { ok: false, error: 'Pick the reporting period.' };
  if (end < start) return { ok: false, error: 'The period ends before it starts.' };
  return { ok: true, start, end };
}

const esc = (s: string | null | undefined) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export interface RequestEmail {
  siteUrl: string;
  token: string;
  companyName: string;
  supplierName: string;
  buys: string | null;
  periodStart: string;
  periodEnd: string;
  expiresAt: string;
  reminder?: boolean;
}

/** Subject and HTML for the email a supplier receives. */
export function requestEmail(e: RequestEmail): { subject: string; html: string } {
  const link = `${e.siteUrl}/supplier-request/${encodeURIComponent(e.token)}`;
  const period = `${fmt(e.periodStart)} to ${fmt(e.periodEnd)}`;
  const what = e.buys ? `the emissions from the ${esc(e.buys.toLowerCase())} you supply, for` : 'your emissions for';
  const subject = `${e.reminder ? 'Reminder: ' : ''}${e.companyName} asks for your emissions, ${period}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#17231b;max-width:560px;margin:0 auto;padding:20px">
<p>Hello ${esc(e.supplierName)},</p>
<p><strong>${esc(e.companyName)}</strong> needs ${what} ${period}.</p>
<p>Upload your electricity, fuel and freight bills to Senseible. We work out your emissions, and you choose whether to share them with ${esc(e.companyName)}. Only totals are shared; your bills stay private.</p>
<p style="margin:28px 0"><a href="${link}" style="background:#1d4a33;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Open the request</a></p>
<p style="color:#5d6b61;font-size:13px">The link works until ${fmt(e.expiresAt.slice(0, 10))}. Not expecting this? Ignore it.</p>
<p style="color:#9aa59d;font-size:12px">Senseible · senseible.earth</p>
</body></html>`;
  return { subject, html };
}
