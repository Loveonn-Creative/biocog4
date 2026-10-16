import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, FileText, Lock, Trash2, Upload } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useSession } from '@/hooks/useSession';
import { loadSupabase } from '@/integrations/supabase/lazyClient';
import { getFunctionErrorMessage } from '@/lib/functionErrors';
import {
  CONSENT_TEXT, DISCLOSURE, DOC_TYPES, MAX_FILES, PURPOSES, STATUS_LABEL, validateApplication,
  type FieldErrors, type ReadinessItem, type Status,
} from '../../supabase/functions/_shared/financeApplication';

// Signed-in green loan application. Data goes only through the
// finance-application edge function; documents never come back to the
// browser. The applicant sees readiness and status, never an eligibility
// figure: Senseible does not approve, provide or disburse financing.

interface Doc { id: string; docType: string; fileName: string; sizeBytes: number }
interface App {
  id: string; status: Status; application: Record<string, unknown>; submitted_at: string | null;
  update_window_from: string | null; update_window_to: string | null;
  events: Array<{ status: Status; note: string | null; created_at: string }>; documents: Doc[]; readiness: ReadinessItem[];
}
interface State { plan: string; canApply: boolean; prefill: Record<string, string>; carbon: { verifiedInvoices: number }; applications: App[] }

const call = async (body: object) => {
  const supabase = await loadSupabase();
  const { data, error } = await supabase.functions.invoke('finance-application', { body });
  if (error) {
    const message = await getFunctionErrorMessage(error, 'Something went wrong. Try again.');
    // The server answers 'not_open' until its tables exist; never show that code to a person.
    throw Object.assign(new Error(message === NOT_OPEN ? CLOSED_MESSAGE : message), { notOpen: message === NOT_OPEN });
  }
  return data;
};
const NOT_OPEN = 'not_open';
const CLOSED_MESSAGE = 'Green loan applications are opening shortly. Your carbon record is safe and ready when they do.';
const isNotOpen = (e: unknown) => Boolean((e as { notOpen?: boolean })?.notOpen);
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const kb = (n: number) => `${Math.max(1, Math.round(n / 1024))} KB`;
const STEPS = ['Business', 'Financing', 'Financials', 'Documents'] as const;

/** The credit file: one tab per part of the application, filled as it comes together. */
function CreditFile({ filled, docs, carbon }: { filled: boolean[]; docs: number; carbon: number }) {
  const tabs = [...STEPS.map((s, i) => ({ label: s, on: filled[i] })), { label: 'Carbon', on: carbon > 0 }];
  return (
    <div className="gl-file" aria-label="Your application file">
      <div className="gl-tabs">
        {tabs.map((t, i) => (
          <span key={t.label} className={`gl-tab ${t.on ? 'gl-tab-on' : ''}`} style={{ transitionDelay: `${i * 60}ms` }}>{t.label}</span>
        ))}
      </div>
      <div className="gl-sheet">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Application file</p>
        <p className="mt-1 text-sm">{tabs.filter((t) => t.on).length} of {tabs.length} parts ready · {docs} document{docs === 1 ? '' : 's'}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${(tabs.filter((t) => t.on).length / tabs.length) * 100}%` }} /></div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3 w-3" aria-hidden="true" />Stored privately. Never shared with a lender without your consent.</p>
      </div>
    </div>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function GreenLoan() {
  const navigate = useNavigate();
  const { user, isLoading: sessionLoading } = useSession();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState<Record<string, string>>({ purpose: '', amountInr: '', tenureMonths: '36', annualTurnoverInr: '', netProfitInr: '', depreciationInr: '', existingMonthlyEmiInr: '0', quotedAnnualRatePct: '', purposeNote: '' });
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const draft = state?.applications.find((a) => a.status === 'draft') ?? null;
  const submitted = state?.applications.filter((a) => a.status !== 'draft') ?? [];

  const refresh = useCallback(async () => {
    const data = await call({ action: 'get' });
    setState(data);
    const d = (data as State).applications.find((a) => a.status === 'draft');
    const src = (d?.application ?? data.prefill) as Record<string, unknown>;
    setForm((f) => {
      const next = { ...f };
      for (const k of ['businessName', 'gstin', 'sector', 'location', ...Object.keys(f)]) if (src[k] !== undefined && src[k] !== null) next[k] = String(src[k]);
      return next;
    });
    if (d) { setConsent(true); setStep(3); }
  }, []);

  useEffect(() => {
    void call({ action: 'probe' }).then((r) => setEnabled(!!r?.enabled)).catch(() => setEnabled(false));
  }, []);
  useEffect(() => {
    if (!enabled || !user) return;
    setLoadError(null);
    // A failed load must end in a message, not an endless placeholder.
    refresh().catch((e) => { if (isNotOpen(e)) setEnabled(false); else setLoadError((e as Error).message); });
  }, [enabled, user, refresh]);

  const payload = useMemo(() => ({ kind: 'green_loan', ...form, tenureMonths: Number(form.tenureMonths), consent }), [form, consent]);
  const stepErrors = (i: number): FieldErrors => {
    const v = validateApplication(payload);
    if (v.ok) return {};
    const keys: Record<number, string[]> = { 0: ['businessName', 'gstin'], 1: ['purpose', 'purposeNote', 'amountInr', 'tenureMonths', 'quotedAnnualRatePct'], 2: ['annualTurnoverInr', 'netProfitInr', 'depreciationInr', 'existingMonthlyEmiInr', 'consent'] };
    return Object.fromEntries(Object.entries(v.errors).filter(([k]) => (keys[i] ?? []).includes(k)));
  };
  const filled = [0, 1, 2].map((i) => Object.keys(stepErrors(i)).length === 0 && (i < 2 || !!draft)).concat((draft?.documents.length ?? 0) > 0);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const next = async () => {
    const errs = stepErrors(step);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (step === 2) {
      setBusy(true);
      try { await call({ action: 'save_draft', application: payload }); await refresh(); setStep(3); }
      catch (e) { toast.error((e as Error).message); }
      finally { setBusy(false); }
      return;
    }
    setStep(step + 1);
  };

  const upload = async (docType: string, file: File | undefined) => {
    if (!file || !draft) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Each file can be up to 2 MB. Compress the PDF or upload fewer pages.'); return; }
    setBusy(true);
    try {
      const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
      await call({ action: 'upload', applicationId: draft.id, docType, fileName: file.name, file: b64 });
      await refresh();
      toast.success('Added to your application');
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const remove = async (documentId: string) => {
    if (!draft) return;
    setBusy(true);
    try { await call({ action: 'remove_document', applicationId: draft.id, documentId }); await refresh(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (!draft) return;
    setBusy(true);
    try { await call({ action: 'submit', applicationId: draft.id }); await refresh(); toast.success('Application submitted'); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background">
      <SEOHead title="Green loan application | Senseible" description="Prepare a sustainable-finance application with your business data and emissions record." noIndex />
      <Navigation onSignOut={() => navigate('/')} />
      <main className="container mx-auto max-w-5xl px-4 pb-28 pt-8 md:pb-10">
        <Link to="/climate-finance" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Climate finance</Link>
        {children}
        <p className="mt-10 max-w-2xl text-xs text-muted-foreground">{DISCLOSURE}</p>
      </main>
    </div>
  );

  if (enabled === null || sessionLoading) return shell(<div className="h-40 animate-pulse rounded-2xl bg-muted/50" aria-busy="true" />);
  if (!enabled) return shell(<div className="max-w-xl"><h1 className="text-3xl font-semibold tracking-tight">Green loan applications</h1><p className="mt-3 text-muted-foreground">Applications open here shortly. Meanwhile, building your verified emissions record is the part lenders ask for first.</p><Button asChild className="mt-6"><Link to="/">Start your carbon record</Link></Button></div>);
  if (!user) {
    return shell(
      <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Your financials deserve a locked drawer</h1>
          <p className="mt-4 text-muted-foreground">A green loan application includes your income tax returns and bank statements. Sign in so they are tied to your account, sent over an encrypted connection and kept private: nobody else can see them, and nothing goes to a lender without your consent.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild><Link to="/auth?next=/green-loan">Sign in to apply</Link></Button>
            <Button asChild variant="outline"><Link to="/green-loan-check">2-minute readiness check</Link></Button>
          </div>
        </div>
        <CreditFile filled={[false, false, false, false]} docs={0} carbon={0} />
      </div>,
    );
  }
  if (!state && loadError) {
    return shell(
      <div className="max-w-xl" role="alert">
        <h1 className="text-3xl font-semibold tracking-tight">Green loan applications</h1>
        <p className="mt-3 text-muted-foreground">We could not load your application just now. {loadError}</p>
        <Button className="mt-6" onClick={() => { setLoadError(null); refresh().catch((e) => { if (isNotOpen(e)) setEnabled(false); else setLoadError((e as Error).message); }); }}>Try again</Button>
      </div>,
    );
  }
  if (!state) return shell(<div className="h-40 animate-pulse rounded-2xl bg-muted/50" aria-busy="true" />);

  if (!draft && submitted.length > 0 && !starting) {
    return shell(
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Your green loan application</h1>
          {state.canApply && <Button variant="outline" onClick={() => { setStarting(true); setStep(0); }}>Start another</Button>}
        </div>
        {submitted.map((a) => (
          <section key={a.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{String(a.application.businessName ?? '')} · ₹{Number(a.application.amountInr ?? 0).toLocaleString('en-IN')}</p>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{STATUS_LABEL[a.status]}</span>
            </div>
            {a.update_window_from && a.status === 'submitted' && (
              <p className="mt-2 text-sm text-muted-foreground">Expect the first update between {fmtDate(a.update_window_from)} and {fmtDate(a.update_window_to)}. This is an indicative window, not a decision date.</p>
            )}
            <ol className="mt-4 space-y-2 border-l border-border pl-4">
              {a.events.map((e, i) => (
                <li key={i} className="text-sm"><span className="font-medium">{STATUS_LABEL[e.status]}</span> <span className="text-muted-foreground">· {fmtDate(e.created_at)}{e.note ? ` · ${e.note}` : ''}</span></li>
              ))}
            </ol>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {a.readiness.map((r) => (
                <p key={r.id} className="flex items-start gap-2 text-sm"><Check className={`mt-0.5 h-4 w-4 shrink-0 ${r.done ? 'text-primary' : 'text-muted-foreground/40'}`} />{r.label}{r.note && !r.done ? <span className="text-muted-foreground"> · {r.note}</span> : null}</p>
              ))}
            </div>
          </section>
        ))}
      </div>,
    );
  }

  if (!state.canApply) {
    return shell(
      <div className="max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight">Green loan applications</h1>
        <p className="mt-3 text-muted-foreground">Applications with the Green Loan Signal are part of Essential and higher plans. Your carbon record and documents stay yours either way.</p>
        <Button asChild className="mt-6"><Link to="/pricing">See plans</Link></Button>
      </div>,
    );
  }

  const docsByType = (t: string) => (draft?.documents ?? []).filter((d) => d.docType === t);
  return shell(
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Apply for green financing</h1>
        <p className="mt-2 text-muted-foreground">About 10 minutes. Your profile and emissions record are filled in for you; we ask only for what a credit team reads.</p>
        <ol className="mt-6 flex flex-wrap gap-2" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s}><button type="button" disabled={i > step || (i === 3 && !draft)} onClick={() => setStep(i)} className={`rounded-full px-3 py-1 text-sm ${i === step ? 'bg-foreground text-background' : filled[i] ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{i + 1}. {s}</button></li>
          ))}
        </ol>

        <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
          {step === 0 && (<>
            <Field id="gl-name" label="Business name" error={errors.businessName}><Input id="gl-name" value={form.businessName ?? ''} onChange={set('businessName')} /></Field>
            <Field id="gl-gstin" label="GSTIN" hint="From your profile; helps the credit team match records" error={errors.gstin}><Input id="gl-gstin" value={form.gstin ?? ''} onChange={set('gstin')} maxLength={15} /></Field>
            <Field id="gl-sector" label="Sector"><Input id="gl-sector" value={form.sector ?? ''} onChange={set('sector')} /></Field>
            <Field id="gl-loc" label="Location"><Input id="gl-loc" value={form.location ?? ''} onChange={set('location')} /></Field>
          </>)}
          {step === 1 && (<>
            <Field id="gl-purpose" label="What is the financing for?" error={errors.purpose}>
              <select id="gl-purpose" className="h-10 w-full min-w-0 max-w-full rounded-md border border-input bg-background px-3 text-sm" value={form.purpose} onChange={set('purpose')}>
                <option value="">Choose</option>{PURPOSES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </Field>
            <Field id="gl-amount" label="Amount needed (₹)" error={errors.amountInr}><Input id="gl-amount" inputMode="numeric" value={form.amountInr} onChange={set('amountInr')} placeholder="25,00,000" /></Field>
            <Field id="gl-tenure" label="Repayment period (months)" error={errors.tenureMonths}><Input id="gl-tenure" inputMode="numeric" value={form.tenureMonths} onChange={set('tenureMonths')} /></Field>
            <Field id="gl-rate" label="Interest rate you have been quoted (optional, %)" hint="Leave blank if you do not have a quote" error={errors.quotedAnnualRatePct}><Input id="gl-rate" inputMode="decimal" value={form.quotedAnnualRatePct} onChange={set('quotedAnnualRatePct')} /></Field>
            {form.purpose === 'other' && <div className="sm:col-span-2"><Field id="gl-note" label="Describe the green purpose" error={errors.purposeNote}><Input id="gl-note" value={form.purposeNote} onChange={set('purposeNote')} /></Field></div>}
          </>)}
          {step === 2 && (<>
            <Field id="gl-turnover" label="Turnover, last financial year (₹)" error={errors.annualTurnoverInr}><Input id="gl-turnover" inputMode="numeric" value={form.annualTurnoverInr} onChange={set('annualTurnoverInr')} /></Field>
            <Field id="gl-profit" label="Net profit, last financial year (₹)" hint="Negative for a loss; leave blank if not final" error={errors.netProfitInr}><Input id="gl-profit" inputMode="numeric" value={form.netProfitInr} onChange={set('netProfitInr')} /></Field>
            <Field id="gl-dep" label="Depreciation (optional, ₹)" error={errors.depreciationInr}><Input id="gl-dep" inputMode="numeric" value={form.depreciationInr} onChange={set('depreciationInr')} /></Field>
            <Field id="gl-emi" label="Existing loan repayments per month (₹)" hint="0 if none" error={errors.existingMonthlyEmiInr}><Input id="gl-emi" inputMode="numeric" value={form.existingMonthlyEmiInr} onChange={set('existingMonthlyEmiInr')} /></Field>
            <label htmlFor="gl-consent" className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm text-muted-foreground sm:col-span-2">
              <Checkbox id="gl-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span>{CONSENT_TEXT} <Link to="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link></span>
            </label>
            {errors.consent && <p className="text-xs text-destructive sm:col-span-2">{errors.consent}</p>}
          </>)}
          {step === 3 && draft && (
            <div className="space-y-4 sm:col-span-2">
              <p className="text-sm text-muted-foreground">PDF, JPG or PNG, up to 2 MB each, {MAX_FILES} files in all. Add an income tax return or financial statements, and a bank statement.</p>
              {DOC_TYPES.map((t) => (
                <div key={t.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0"><p className="text-sm font-medium">{t.label}</p><p className="text-xs text-muted-foreground">{t.hint}</p></div>
                    <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm ${busy || draft.documents.length >= MAX_FILES ? 'pointer-events-none opacity-50' : 'hover:bg-muted'}`}>
                      <Upload className="h-4 w-4" />Add<input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => { void upload(t.id, e.target.files?.[0]); e.currentTarget.value = ''; }} />
                    </label>
                  </div>
                  {docsByType(t.id).map((d) => (
                    <p key={d.id} className="mt-2 flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-primary" /><span className="min-w-0 flex-1 truncate">{d.fileName}</span><span className="text-xs text-muted-foreground">{kb(d.sizeBytes)}</span>
                      <button type="button" aria-label={`Remove ${d.fileName}`} className="rounded p-1 hover:bg-muted" onClick={() => void remove(d.id)}><Trash2 className="h-4 w-4" /></button></p>
                  ))}
                </div>
              ))}
              <div className="grid gap-2 sm:grid-cols-2">
                {draft.readiness.map((r) => <p key={r.id} className="flex items-start gap-2 text-sm"><Check className={`mt-0.5 h-4 w-4 shrink-0 ${r.done ? 'text-primary' : 'text-muted-foreground/40'}`} />{r.label}</p>)}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {step > 0 && step < 3 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 3 && <Button onClick={() => void next()} disabled={busy}>{step === 2 ? 'Save and add documents' : 'Continue'}<ArrowRight className="ml-1.5 h-4 w-4" /></Button>}
          {step === 3 && <><Button variant="ghost" onClick={() => setStep(2)}>Edit details</Button><Button onClick={() => void submit()} disabled={busy}>Submit application</Button></>}
        </div>
        {step === 3 && <p className="mt-3 text-xs text-muted-foreground">After you submit, the Senseible team reviews the file and updates you here, usually within 2 to 4 weeks. You will not see a lender decision here; any financing decision is the lender's.</p>}
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start"><CreditFile filled={filled} docs={draft?.documents.length ?? 0} carbon={state.carbon.verifiedInvoices} /></aside>
    </div>,
  );
}
