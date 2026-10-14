// Sustainable-finance applications (green loans first). The only writer of
// finance_applications, its timeline, documents and internal review
// (pending migration 20261023100000). Signed-in applicants on Essential or
// higher; the plan is checked here, on the server.
//
// What the applicant gets: a stored application, private document storage,
// a readiness checklist, a status timeline and an indicative 2 to 4 week
// update window. What the applicant never gets: an eligibility figure, a
// lender decision or the internal review. Senseible does not approve,
// provide or disburse loans, grants or financing.
//
// Documents: PDF/JPEG/PNG up to 2 MB each, at most 6, identified by their
// bytes. Stored in the private finance-documents bucket. On submission only
// a fixed allow-list of figures (turnover, profit, repayments...) is read by
// the AI model, with names, PAN, account numbers and transactions excluded;
// the files are never returned to any browser.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  CONSENT_VERSION, DOC_TYPES, FIGURES_PROMPT, MAX_FILE_BYTES, MAX_FILES, PURPOSES, RETENTION_DAYS,
  cleanFigures, readiness, reviewSummary, sniffType, updateWindow, validateApplication,
  type DocFigures, type FinanceApplicationInput,
} from '../_shared/financeApplication.ts';
import { effectivePlanTier, strongerPlan, strongestRow } from '../_shared/planLimits.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const MISSING = new Set(['42P01', 'PGRST205']);
const NOT_OPEN = { error: 'not_open' };
const BUCKET = 'finance-documents';
// Internal review copy. Fixed here, never taken from a request or shown in the app.
const REVIEW_INBOX = 'biocog.v1@gmail.com';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXT: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inr = (n: number | null | undefined) => (typeof n === 'number' ? `₹${Math.round(n).toLocaleString('en-IN')}` : 'not given');
const safeName = (s: unknown) => String(s ?? 'document').replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'document';

function b64ToBytes(b64: string): Uint8Array | null {
  try {
    const clean = b64.includes(',') ? b64.slice(b64.indexOf(',') + 1) : b64;
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch { return null; }
}
function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Reads the allow-listed figures from one document. Never throws; null on failure. */
async function readFigures(apiKey: string | undefined, mime: string, bytes: Uint8Array): Promise<DocFigures | null> {
  if (!apiKey) return null;
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0,
        max_tokens: 800,
        messages: [
          { role: 'system', content: FIGURES_PROMPT },
          { role: 'user', content: [
            { type: 'text', text: 'Return only the JSON object with the listed keys.' },
            { type: 'image_url', image_url: { url: `data:${mime};base64,${bytesToB64(bytes)}` } },
          ] },
        ],
      }),
    });
    if (!res.ok) { console.error('Figure read failed:', res.status); return null; }
    const body = await res.json();
    const content = String(body?.choices?.[0]?.message?.content ?? '');
    const match = content.match(/\{[\s\S]*\}/);
    return match ? cleanFigures(JSON.parse(match[0])) : null;
  } catch {
    console.error('Figure read error');
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? '');

    if (action === 'probe') {
      const { error } = await admin.from('finance_applications').select('id', { head: true, count: 'exact' }).limit(1);
      return json({ enabled: !(error && MISSING.has(error.code ?? '')) && !error });
    }

    // Retention: removes documents past retain_until. Service role only (scheduled job).
    if (action === 'purge_expired') {
      if ((req.headers.get('Authorization') ?? '') !== `Bearer ${serviceKey}`) return json({ error: 'Forbidden' }, 403);
      const { data: expired, error } = await admin.from('finance_application_documents').select('id, storage_path').lt('retain_until', new Date().toISOString()).limit(500);
      if (error) return MISSING.has(error.code ?? '') ? json(NOT_OPEN, 503) : json({ error: 'Purge failed' }, 500);
      const paths = (expired ?? []).map((d: { storage_path: string }) => d.storage_path);
      if (paths.length) {
        const { error: rmErr } = await admin.storage.from(BUCKET).remove(paths);
        if (rmErr) return json({ error: 'Purge failed' }, 500);
        await admin.from('finance_application_documents').delete().in('id', (expired ?? []).map((d: { id: string }) => d.id));
      }
      return json({ purged: paths.length });
    }

    // ---- Signed-in applicant ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Sign in to keep your financial documents private.' }, 401);
    const { data: { user }, error: authError } = await createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } }).auth.getUser();
    if (authError || !user) return json({ error: 'Your session has expired. Sign in again.' }, 401);

    const [{ data: profile }, { data: subs }] = await Promise.all([
      admin.from('profiles').select('business_name, gstin, sector, location, subscription_tier, subscription_expires_at').eq('id', user.id).maybeSingle(),
      admin.from('subscriptions').select('tier, expires_at').eq('user_id', user.id).eq('status', 'active'),
    ]);
    const sub = strongestRow(subs ?? []);
    const inForce = strongerPlan(
      { tier: profile?.subscription_tier, expiresAt: profile?.subscription_expires_at },
      { tier: sub?.tier, expiresAt: sub?.expires_at },
    );
    const plan = effectivePlanTier(inForce.tier, inForce.expiresAt);

    const carbon = async () => {
      const [{ count }, { data: latest }] = await Promise.all([
        admin.from('emissions').select('document_id', { count: 'exact', head: true }).eq('user_id', user.id).eq('verified', true),
        admin.from('carbon_verifications').select('total_co2_kg, verification_status, ai_analysis, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      return {
        verifiedInvoices: count ?? 0,
        latestVerification: latest ? { status: latest.verification_status, totalCo2Kg: latest.total_co2_kg, greenScore: latest.ai_analysis?.greenScore ?? null, at: latest.created_at } : null,
      };
    };

    const loadOwn = async (id: unknown) => {
      if (typeof id !== 'string' || !UUID_RE.test(id)) return null;
      const { data } = await admin.from('finance_applications').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
      return data;
    };

    if (action === 'get') {
      const { data: apps, error } = await admin.from('finance_applications').select('id, kind, status, application, submitted_at, update_window_from, update_window_to, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
      if (error) return MISSING.has(error.code ?? '') ? json(NOT_OPEN, 503) : json({ error: 'Could not load applications.' }, 500);
      const ids = (apps ?? []).map((a: { id: string }) => a.id);
      const [{ data: events }, { data: docs }] = ids.length
        ? await Promise.all([
          admin.from('finance_application_events').select('application_id, status, note, created_at').in('application_id', ids).order('created_at'),
          admin.from('finance_application_documents').select('id, application_id, doc_type, file_name, size_bytes, uploaded_at').in('application_id', ids).order('uploaded_at'),
        ])
        : [{ data: [] }, { data: [] }];
      const c = await carbon();
      return json({
        plan,
        canApply: plan !== 'snapshot',
        prefill: { businessName: profile?.business_name ?? '', gstin: profile?.gstin ?? '', sector: profile?.sector ?? '', location: profile?.location ?? '' },
        carbon: c,
        applications: (apps ?? []).map((a: Record<string, unknown> & { id: string; application: Record<string, unknown> | null }) => {
          const myDocs = (docs ?? []).filter((d: { application_id: string }) => d.application_id === a.id);
          return {
            ...a,
            events: (events ?? []).filter((e: { application_id: string }) => e.application_id === a.id),
            documents: myDocs.map((d: Record<string, unknown>) => ({ id: d.id, docType: d.doc_type, fileName: d.file_name, sizeBytes: d.size_bytes, uploadedAt: d.uploaded_at })),
            readiness: readiness((a.application ?? {}) as Parameters<typeof readiness>[0], myDocs.map((d: { doc_type: string }) => ({ docType: d.doc_type })), c),
          };
        }),
      });
    }

    if (plan === 'snapshot') return json({ error: 'Green loan applications are part of Essential and higher plans.', upgrade: true }, 402);

    if (action === 'save_draft') {
      const v = validateApplication(body?.application ?? {});
      if (!v.ok) return json({ error: 'Check the highlighted fields.', fields: v.errors }, 400);
      const { data: draft, error } = await admin.from('finance_applications').select('id').eq('user_id', user.id).eq('kind', v.value.kind).eq('status', 'draft').maybeSingle();
      if (error) return MISSING.has(error.code ?? '') ? json(NOT_OPEN, 503) : json({ error: 'Could not save.' }, 500);
      if (draft) {
        const { error: upErr } = await admin.from('finance_applications').update({ application: v.value, updated_at: new Date().toISOString() }).eq('id', draft.id);
        if (upErr) return json({ error: 'Could not save.' }, 500);
        return json({ applicationId: draft.id });
      }
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { count } = await admin.from('finance_applications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
      if ((count ?? 0) >= 5) return json({ error: 'You have started several applications this month. Contact us to continue.' }, 429);
      const { data: created, error: insErr } = await admin.from('finance_applications').insert({
        user_id: user.id, kind: v.value.kind, application: v.value, consent_version: CONSENT_VERSION, consented_at: new Date().toISOString(),
        retain_until: new Date(Date.now() + RETENTION_DAYS * 86_400_000).toISOString(),
      }).select('id').single();
      if (insErr || !created) return json({ error: 'Could not save.' }, 500);
      await admin.from('finance_application_events').insert({ application_id: created.id, user_id: user.id, status: 'draft', note: 'Application started' });
      return json({ applicationId: created.id });
    }

    if (action === 'upload') {
      const app = await loadOwn(body?.applicationId);
      if (!app) return json({ error: 'Application not found.' }, 404);
      if (app.status !== 'draft') return json({ error: 'Documents can be added before you submit.' }, 409);
      const docType = DOC_TYPES.some((d) => d.id === body?.docType) ? body.docType : null;
      if (!docType) return json({ error: 'Choose the document type.' }, 400);
      const bytes = typeof body?.file === 'string' ? b64ToBytes(body.file) : null;
      if (!bytes || bytes.length === 0) return json({ error: 'The file could not be read.' }, 400);
      if (bytes.length > MAX_FILE_BYTES) return json({ error: 'Each file can be up to 2 MB. Compress the PDF or upload fewer pages.' }, 413);
      const mime = sniffType(bytes);
      if (!mime) return json({ error: 'Upload a PDF, JPG or PNG.' }, 415);
      const { count } = await admin.from('finance_application_documents').select('id', { count: 'exact', head: true }).eq('application_id', app.id);
      if ((count ?? 0) >= MAX_FILES) return json({ error: `Up to ${MAX_FILES} documents per application.` }, 409);
      const sha = hex(await crypto.subtle.digest('SHA-256', bytes));
      const path = `${user.id}/${app.id}/${sha}.${EXT[mime]}`;
      const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
      if (upErr && !/exists/i.test(upErr.message ?? '')) return json({ error: 'Upload failed. Try again.' }, 500);
      const { data: row, error: rowErr } = await admin.from('finance_application_documents').insert({
        application_id: app.id, user_id: user.id, doc_type: docType, file_name: safeName(body?.fileName), mime_type: mime,
        size_bytes: bytes.length, sha256: sha, storage_path: path,
        retain_until: new Date(Date.now() + RETENTION_DAYS * 86_400_000).toISOString(),
      }).select('id').single();
      if (rowErr?.code === '23505') return json({ error: 'This file is already attached.' }, 409);
      if (rowErr || !row) { await admin.storage.from(BUCKET).remove([path]); return json({ error: 'Upload failed. Try again.' }, 500); }
      return json({ documentId: row.id });
    }

    if (action === 'remove_document') {
      const app = await loadOwn(body?.applicationId);
      if (!app || app.status !== 'draft') return json({ error: 'Documents can be removed before you submit.' }, 409);
      const { data: doc } = await admin.from('finance_application_documents').select('id, storage_path').eq('id', String(body?.documentId ?? '')).eq('application_id', app.id).maybeSingle();
      if (!doc) return json({ error: 'Document not found.' }, 404);
      await admin.storage.from(BUCKET).remove([doc.storage_path]);
      await admin.from('finance_application_documents').delete().eq('id', doc.id);
      return json({ removed: true });
    }

    if (action === 'submit') {
      const app = await loadOwn(body?.applicationId);
      if (!app) return json({ error: 'Application not found.' }, 404);
      if (app.status !== 'draft') return json({ error: 'This application was already submitted.' }, 409);
      const v = validateApplication(app.application ?? {});
      if (!v.ok) return json({ error: 'Check the application details.', fields: v.errors }, 400);
      const { data: docs } = await admin.from('finance_application_documents').select('id, doc_type, file_name, mime_type, size_bytes, storage_path').eq('application_id', app.id);
      const has = (t: string) => (docs ?? []).some((d: { doc_type: string }) => d.doc_type === t);
      if (!(has('itr') || has('financial_statement')) || !has('bank_statement')) {
        return json({ error: 'Add an income tax return or financial statements, and a bank statement, before submitting.' }, 400);
      }
      const now = new Date();
      const window = updateWindow(now);
      const snapshot = await carbon();
      // Conditional: only a draft becomes submitted, once.
      const { data: moved, error: mvErr } = await admin.from('finance_applications')
        .update({ status: 'submitted', submitted_at: now.toISOString(), update_window_from: window.from, update_window_to: window.to, carbon_snapshot: snapshot, updated_at: now.toISOString() })
        .eq('id', app.id).eq('status', 'draft').select('id');
      if (mvErr || !moved?.length) return json({ error: 'This application was already submitted.' }, 409);
      await admin.from('finance_application_events').insert({ application_id: app.id, user_id: user.id, status: 'submitted', note: `First update expected between ${window.from} and ${window.to}` });

      // Internal review: allow-listed figures only, then the indicative summary.
      const figures: DocFigures[] = [];
      const lovable = Deno.env.get('LOVABLE_API_KEY');
      for (const d of (docs ?? []) as Array<{ doc_type: string; mime_type: string; storage_path: string }>) {
        if (!['itr', 'bank_statement', 'financial_statement'].includes(d.doc_type)) continue;
        const { data: blob } = await admin.storage.from(BUCKET).download(d.storage_path);
        if (!blob) continue;
        const f = await readFigures(lovable, d.mime_type, new Uint8Array(await blob.arrayBuffer()));
        if (f) figures.push({ ...f, document_kind: f.document_kind ?? d.doc_type });
      }
      const summary = reviewSummary(v.value, figures, { priority: plan === 'pro' || plan === 'scale' });
      await admin.from('finance_application_reviews').upsert({ application_id: app.id, figures, summary, email_status: 'pending' });

      let emailStatus: 'sent' | 'failed' = 'failed';
      const resend = Deno.env.get('RESEND_API_KEY');
      if (resend) {
        const html = reviewEmail(app.id, v.value, summary, figures, (docs ?? []) as Array<{ doc_type: string; file_name: string; size_bytes: number }>, snapshot, plan, window, user.email ?? '');
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: 'Senseible Finance <onboarding@resend.dev>', to: [REVIEW_INBOX], reply_to: user.email, subject: `[Confidential] Green loan application ${app.id.slice(0, 8)} · ${v.value.businessName.slice(0, 60)}`, html }),
        }).catch(() => null);
        emailStatus = res?.ok ? 'sent' : 'failed';
      }
      await admin.from('finance_application_reviews').update({ email_status: emailStatus, updated_at: new Date().toISOString() }).eq('application_id', app.id);
      return json({ submitted: true, updateWindow: window });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (e) {
    console.error('finance-application error:', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'Something went wrong. Nothing was lost; try again.' }, 500);
  }
});

function reviewEmail(id: string, a: FinanceApplicationInput, s: ReturnType<typeof reviewSummary>, figures: DocFigures[], docs: Array<{ doc_type: string; file_name: string; size_bytes: number }>, carbon: { verifiedInvoices: number; latestVerification: { status: string; totalCo2Kg: number | null; greenScore: number | null } | null }, plan: string, window: { from: string; to: string }, applicantEmail: string): string {
  const row = (k: string, v: unknown) => `<tr><td style="padding:4px 8px;color:#555">${esc(k)}</td><td style="padding:4px 8px">${esc(v)}</td></tr>`;
  const list = (items: string[]) => items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '<p>None</p>';
  return `<div style="font-family:Arial,sans-serif;max-width:680px">
<p style="background:#fef3c7;padding:8px;border-radius:6px"><b>${esc(s.label)}</b> Do not forward. Senseible does not approve, provide or disburse loans, grants or financing.</p>
<h2>Green loan application ${esc(id)}</h2>
<table>${row('Plan', plan + (s.priority ? ' (priority)' : ''))}${row('Applicant email', applicantEmail)}${row('Business', a.businessName)}${row('GSTIN', a.gstin ?? 'not given')}${row('Sector', a.sector ?? '')}${row('Location', a.location ?? '')}
${row('Purpose', (PURPOSES.find((p) => p.id === a.purpose)?.label ?? a.purpose) + (a.purposeNote ? `: ${a.purposeNote}` : ''))}${row('Amount requested', inr(a.amountInr))}${row('Tenure', `${a.tenureMonths} months`)}
${row('Turnover (last FY, entered)', inr(a.annualTurnoverInr))}${row('Net profit (entered)', inr(a.netProfitInr))}${row('Depreciation (entered)', inr(a.depreciationInr))}${row('Existing EMIs (entered)', `${inr(a.existingMonthlyEmiInr)}/month`)}${row('Quoted rate', a.quotedAnnualRatePct === null ? 'not given' : `${a.quotedAnnualRatePct}%`)}
${row('Verified invoices on Senseible', carbon.verifiedInvoices)}${row('Latest verification', carbon.latestVerification ? `${carbon.latestVerification.status}, ${carbon.latestVerification.totalCo2Kg ?? 'n/a'} kgCO2e, green score ${carbon.latestVerification.greenScore ?? 'n/a'}` : 'none')}${row('Applicant told: first update', `${window.from} to ${window.to}`)}</table>
<h3>Indicative ratios (internal)</h3>
<table>${row('Request / net profit', s.requestToNetProfit === null ? 'no profit figure' : `${s.requestToNetProfit}x (${s.requestBand.replace(/_/g, ' ')}; owner guidance 2 to 3x, project dependent)`)}${row('Request / turnover', `${s.requestToTurnover}x`)}${row('Existing annual debt service', inr(s.annualDebtServiceExisting))}${row('New instalment at quoted rate', s.proposedEmi === null ? 'not calculated' : inr(s.proposedEmi))}${row('Coverage range', s.coverageRange ? `${s.coverageRange[0]} to ${s.coverageRange[1]}` : 'not calculated')}</table>
<h3>Cross-checks</h3>${list(s.crossChecks)}<h3>Missing</h3>${list(s.missing)}<h3>Assumptions</h3>${list(s.assumptions)}
<h3>Figures read from documents (allow-listed)</h3>${list(figures.map((f) => Object.entries(f).map(([k, v]) => `${k}: ${v}`).join(', ')))}
<h3>Documents on file (private bucket, not attached)</h3>${list(docs.map((d) => `${d.doc_type}: ${d.file_name} (${Math.round(d.size_bytes / 1024)} KB)`))}
</div>`;
}
