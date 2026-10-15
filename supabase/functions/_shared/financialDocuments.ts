// Financial documents (income tax returns, bank statements, financial
// statements) sent to the invoice reader. Owner approval, October 2026: they
// are not rejected; for signed-in users the file is stored privately (server
// only, never returned to a browser) and only the allow-listed figures in
// financeApplication.ts are read, for financial modelling, risk management and
// climate finance. Nothing personal (names, PAN, account numbers,
// transactions) is read or kept, and nothing appears in the user's records.
import { aiFetch } from './aiFetch.ts';
import { cleanFigures, FIGURES_PROMPT, type DocFigures } from './financeApplication.ts';

export const FINANCIAL_BUCKET = 'financial-documents';

const ITR = /\b(income tax return|itr-?v?\s?[1-7]|acknowledgement number.{0,40}assessment year|form\s?no\.?\s?itr)\b/i;
const BANK = /\b(bank statement|statement of account.{0,60}(ifsc|branch)|account statement.{0,60}(ifsc|branch)|opening balance.{0,200}closing balance)\b/i;
const STATEMENTS = /\b(balance sheet|statement of profit and loss|profit (and|&) loss (account|statement)|financial statements?|cash flow statement)\b/i;

export type FinancialKind = 'itr' | 'bank_statement' | 'financial_statement';

/**
 * Whether the reader's first pass looks like a financial document, and which.
 * A real tax invoice that only mentions such services (for example "ITR
 * filing fees" from an accountant) stays an invoice: it has an invoice
 * number, a supplier GSTIN and priced lines.
 */
export function financialKind(ocr: Record<string, unknown> | null | undefined): FinancialKind | null {
  if (!ocr) return null;
  const text = JSON.stringify(ocr);
  const kind: FinancialKind | null = ITR.test(text) ? 'itr' : BANK.test(text) ? 'bank_statement' : STATEMENTS.test(text) ? 'financial_statement' : null;
  if (!kind) return null;
  const lines = Array.isArray(ocr.lineItems) ? ocr.lineItems as Array<Record<string, unknown>> : [];
  const pricedLines = lines.filter((l) => l && (l.total != null || l.unitPrice != null)).length;
  const looksLikeInvoice = Boolean(ocr.invoiceNumber) && Boolean(ocr.supplierGstin) && pricedLines > 0;
  return looksLikeInvoice ? null : kind;
}

export function financialPath(userId: string, sha256: string, mime: string): string | null {
  const ext = ({ 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' } as Record<string, string>)[mime.toLowerCase()];
  if (!ext || !/^[0-9a-f-]{36}$/i.test(userId) || !/^[0-9a-f]{64}$/.test(sha256)) return null;
  return `${userId}/${sha256}.${ext}`;
}

/** The allow-listed figures only. Never throws; {} when nothing could be read. */
export async function readFinancialFigures(mime: string, base64: string): Promise<DocFigures> {
  try {
    const res = await aiFetch({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        reasoning_effort: 'low',
        messages: [
          { role: 'system', content: FIGURES_PROMPT },
          { role: 'user', content: [
            { type: 'text', text: 'Return only the JSON object with the listed keys.' },
            { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
          ] },
        ],
      }),
    });
    if (!res.ok) { console.error('Financial figure read failed:', res.status); return {}; }
    const body = await res.json();
    const content = String(body?.choices?.[0]?.message?.content ?? '');
    const match = content.match(/\{[\s\S]*\}/);
    return match ? cleanFigures(JSON.parse(match[0])) : {};
  } catch {
    console.error('Financial figure read error');
    return {};
  }
}

export const FINANCIAL_STORED_MESSAGE = 'This is a financial document. It is stored securely for climate finance and risk review: it is not shown in your records, never sent back to a browser, and only the key figures needed (such as turnover and repayments) are read.';
export const FINANCIAL_GUEST_MESSAGE = 'This is a financial document. Sign in to store it securely for climate finance review; without an account nothing is kept.';
export const FINANCIAL_UNAVAILABLE_MESSAGE = 'This is a financial document. Secure storage is not switched on yet, so nothing was kept. Please try again later.';
