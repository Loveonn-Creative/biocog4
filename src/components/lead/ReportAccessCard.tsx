import { useEffect, useRef, useState } from "react";
import { analyticsEvents } from "@/lib/analytics";
import { Link } from "react-router-dom";
import { loadSupabase } from "@/integrations/supabase/lazyClient";
import { useSession } from "@/hooks/useSession";
import { leadEvents } from "@/components/lead/leadEvents";
import {
  INDUSTRIES, LINK_VALID_DAYS, NEEDS, RESOURCE, ROLES, checkEmail, EMAIL_MESSAGES, validateLead,
  type LeadErrors, type LeadField,
} from "@/lib/resourceLead";

const PAGE = "esg_report_sample";
type Draft = { name: string; email: string; company: string; industry: string; role: string; need: string; marketing: boolean };
const EMPTY: Draft = { name: "", email: "", company: "", industry: "", role: "", need: "", marketing: false };

/** The emailed link's token, read once and removed from the address bar so it never lands in history or analytics. */
function takeAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const token = url.searchParams.get("access");
  if (!token) return null;
  url.searchParams.delete("access");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  return token;
}

async function errorBody(error: unknown): Promise<{ status: number | null; body: { error?: string; fields?: LeadErrors; suggestion?: string } | null }> {
  const ctx = (error as { context?: Response } | null)?.context;
  const status = typeof ctx?.status === "number" ? ctx.status : null;
  try { return { status, body: ctx && typeof ctx.json === "function" ? await ctx.clone().json() : null }; } catch { return { status, body: null }; }
}

function saveReport(blob: Blob) {
  const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = RESOURCE.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function fetchReport(body: Record<string, unknown>): Promise<{ ok: true; status?: undefined; code?: undefined } | { ok: false; status: number | null; code?: string; message?: string }> {
  const supabase = await loadSupabase();
  const { data, error } = await supabase.functions.invoke("esg-report-access", { body });
  if (error || !(data instanceof Blob)) {
    const { status, body: b } = await errorBody(error);
    return { ok: false, status, code: b?.error, message: b?.error };
  }
  saveReport(data);
  analyticsEvents.resourceDownload("esg-report-sample", "pdf", "esg-report-sample");
  return { ok: true };
}

const inputCls = "h-12 w-full rounded-xl border bg-background px-3.5 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-foreground">{label}</label>
      <div className="mt-1.5">{children}</div>
      {error && <p id={`${id}-err`} className="mt-1 text-[13px] text-destructive">{error}</p>}
    </div>
  );
}

function Select({ id, value, onChange, options, error, placeholder }: { id: string; value: string; onChange: (v: string) => void; options: readonly { id: string; label: string }[]; error?: string; placeholder: string }) {
  return (
    <select id={id} value={value} onChange={e => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
      className={`${inputCls} ${error ? "border-destructive" : "border-input"} ${value ? "" : "text-muted-foreground"}`}>
      <option value="" disabled>{placeholder}</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

/** The gate: signed-in download, the six-question form, the "check your inbox" state and the emailed-link download. */
export function ReportAccessCard({ onReady }: { onReady?: () => void }) {
  const { user, isLoading } = useSession();
  const [token] = useState(takeAccessToken);
  const [linkState, setLinkState] = useState<"idle" | "busy" | "done" | "expired" | "invalid" | "overused" | "error">("idle");
  const [useForm, setUseForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [accountState, setAccountState] = useState<"idle" | "busy" | "done" | "confirm" | "error">("idle");
  const started = useRef(Date.now());
  const engaged = useRef(false);

  useEffect(() => {
    if (!sentTo) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [sentTo]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    if (!engaged.current) { engaged.current = true; leadEvents.engage(PAGE); }
    setDraft(d => ({ ...d, [k]: v }));
    if (errors[k as LeadField]) setErrors(e => ({ ...e, [k]: undefined }));
  };
  const checkEmailNow = () => {
    if (!draft.email.trim()) return;
    const v = checkEmail(draft.email);
    if (!v.ok) { setErrors(e => ({ ...e, email: EMAIL_MESSAGES[v.reason] })); setSuggestion(v.suggestion ?? null); }
    else setSuggestion(null);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const website = (document.getElementById("rp-website") as HTMLInputElement | null)?.value ?? "";
    // Field checks first; the human-speed check is the server's, so a fast (autofilled) visitor just waits a moment.
    const local = validateLead({ ...draft, website });
    if (!local.ok) {
      setErrors(local.errors); setSuggestion(local.suggestion ?? null);
      if (local.errors.form) setFormError(local.errors.form);
      const first = (["name", "email", "company", "industry", "role", "need"] as const).find(k => local.errors[k]);
      if (first) document.getElementById(`rp-${first}`)?.focus();
      return;
    }
    setSending(true); setFormError(null);
    try {
      const early = 2600 - (Date.now() - started.current);
      if (early > 0) await new Promise(r => window.setTimeout(r, early));
      const payload = { action: "request", ...draft, website, elapsedMs: Date.now() - started.current };
      const supabase = await loadSupabase();
      const { data, error } = await supabase.functions.invoke("esg-report-access", { body: payload });
      if (error) {
        const { body } = await errorBody(error);
        if (body?.fields) { setErrors(body.fields); if (body.fields.email) document.getElementById("rp-email")?.focus(); }
        setSuggestion(body?.suggestion ?? null);
        setFormError(body?.fields ? null : body?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSentTo(data?.email ?? draft.email);
      setNow(Date.now());
      setResendAt(Date.now() + 60_000);
      leadEvents.submit(PAGE, { industry: draft.industry, role: draft.role, need: draft.need });
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const downloadWithLink = async () => {
    setLinkState("busy");
    const r = await fetchReport({ action: "download", token });
    if (r.ok) { setLinkState("done"); leadEvents.cta(PAGE, "download_link"); onReady?.(); return; }
    setLinkState(r.code === "expired" ? "expired" : r.code === "invalid" ? "invalid" : r.code === "overused" ? "overused" : "error");
  };

  const downloadAsMember = async () => {
    setAccountState("busy");
    const r = await fetchReport({ action: "account" });
    if (r.ok) { setAccountState("done"); leadEvents.cta(PAGE, "download_account"); onReady?.(); return; }
    setAccountState(r.status === 403 ? "confirm" : "error");
  };

  const shell = "rounded-3xl border border-border bg-card p-5 shadow-[0_30px_60px_-45px_hsl(var(--foreground)/.45)] sm:p-7";

  // 1. Arrived from the emailed link.
  if (token && !["expired", "invalid"].includes(linkState)) {
    return (
      <div className={shell} role="region" aria-label="Your report">
        <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-primary">Your link is verified</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your report is ready.</h2>
        <p className="mt-2 text-[15px] text-muted-foreground">{RESOURCE.pages} pages, PDF, about 470 KB.</p>
        <button type="button" onClick={downloadWithLink} disabled={linkState === "busy"}
          className="mt-5 h-12 w-full rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground disabled:opacity-60">
          {linkState === "busy" ? "Preparing your PDF…" : linkState === "done" ? "Download again" : "Download the report"}
        </button>
        {linkState === "done" && <p className="mt-3 text-[14px] text-muted-foreground" role="status">Downloaded. Check your downloads folder.</p>}
        {linkState === "overused" && <p className="mt-3 text-[14px] text-destructive" role="alert">This link has been used many times. Enter your details below for a fresh one.</p>}
        {linkState === "error" && <p className="mt-3 text-[14px] text-destructive" role="alert">Something went wrong. Please try again.</p>}
      </div>
    );
  }

  // 2. Signed in with a confirmed email: one click.
  if (user && !useForm && !isLoading) {
    return (
      <div className={shell} role="region" aria-label="Download the report">
        <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-primary">Signed in</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Download it now.</h2>
        <p className="mt-2 text-[15px] text-muted-foreground">No form needed. {RESOURCE.pages} pages, PDF.</p>
        <button type="button" onClick={downloadAsMember} disabled={accountState === "busy"}
          className="mt-5 h-12 w-full rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground disabled:opacity-60">
          {accountState === "busy" ? "Preparing your PDF…" : accountState === "done" ? "Download again" : "Download the report"}
        </button>
        {accountState === "done" && <p className="mt-3 text-[14px] text-muted-foreground" role="status">Downloaded. Check your downloads folder.</p>}
        {accountState === "confirm" && <p className="mt-3 text-[14px] text-destructive" role="alert">Confirm your email address first, using the link we sent when you signed up.</p>}
        {accountState === "error" && <p className="mt-3 text-[14px] text-destructive" role="alert">Something went wrong. Please try again.</p>}
        <button type="button" onClick={() => setUseForm(true)} className="mt-4 text-[14px] text-muted-foreground underline underline-offset-2">Send it to a different email instead</button>
      </div>
    );
  }

  // 3. Sent: check your inbox.
  if (sentTo) {
    const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));
    return (
      <div className={shell} role="status" aria-live="polite">
        <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-primary">Sent</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Check your inbox.</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          We emailed a private download link to <span className="font-medium text-foreground">{sentTo}</span>. It works for {LINK_VALID_DAYS} days.
        </p>
        <p className="mt-3 text-[14px] text-muted-foreground">Not there in two minutes? Check spam or promotions.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" disabled={wait > 0 || sending} onClick={() => { void submit(); }}
            className="h-11 rounded-full border border-border px-5 text-[14px] font-medium disabled:opacity-50">
            {wait > 0 ? `Send again in ${wait}s` : sending ? "Sending…" : "Send again"}
          </button>
          <button type="button" onClick={() => { setSentTo(null); setErrors({}); }} className="h-11 rounded-full px-4 text-[14px] text-muted-foreground underline underline-offset-2">Use a different email</button>
        </div>
        {formError && <p className="mt-3 text-[14px] text-destructive" role="alert">{formError}</p>}
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-[14px] font-medium">While you wait</p>
          <p className="mt-1 text-[14px] text-muted-foreground">See your own carbon number from one electricity bill. Free, no sign-up.</p>
          <Link to="/msme-carbon-number" onClick={() => leadEvents.cta(PAGE, "while_waiting")} className="mt-2 inline-block text-[14px] font-medium text-primary underline underline-offset-2">Try it with your bill →</Link>
        </div>
      </div>
    );
  }

  // 4. The form.
  return (
    <form id="get-report" onSubmit={submit} noValidate className={shell} aria-label="Get the sample ESG report">
      {(linkState === "expired" || linkState === "invalid") && (
        <p className="mb-4 rounded-xl bg-secondary px-3.5 py-2.5 text-[14px]" role="alert">
          {linkState === "expired" ? "That link has expired." : "That link is not valid."} Enter your details and we will send a fresh one.
        </p>
      )}
      <h2 className="text-xl font-semibold tracking-tight">Get the report</h2>
      <p className="mt-1 text-[14px] text-muted-foreground">Six quick answers. We email you a private link.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field id="rp-name" label="Your name" error={errors.name}>
          <input id="rp-name" autoComplete="name" value={draft.name} onChange={e => set("name", e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "rp-name-err" : undefined}
            className={`${inputCls} ${errors.name ? "border-destructive" : "border-input"}`} />
        </Field>
        <Field id="rp-email" label="Work email" error={errors.email}>
          <input id="rp-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={draft.email}
            onChange={e => { set("email", e.target.value); setSuggestion(null); }} onBlur={checkEmailNow} aria-invalid={!!errors.email} aria-describedby={errors.email ? "rp-email-err" : undefined}
            className={`${inputCls} ${errors.email ? "border-destructive" : "border-input"}`} />
          {suggestion && (
            <button type="button" onClick={() => { set("email", suggestion); setSuggestion(null); setErrors(e => ({ ...e, email: undefined })); }}
              className="mt-1 text-left text-[13px] text-primary underline underline-offset-2">Did you mean {suggestion}?</button>
          )}
        </Field>
        <Field id="rp-company" label="Company" error={errors.company}>
          <input id="rp-company" autoComplete="organization" value={draft.company} onChange={e => set("company", e.target.value)} aria-invalid={!!errors.company} aria-describedby={errors.company ? "rp-company-err" : undefined}
            className={`${inputCls} ${errors.company ? "border-destructive" : "border-input"}`} />
        </Field>
        <Field id="rp-industry" label="Industry" error={errors.industry}>
          <Select id="rp-industry" value={draft.industry} onChange={v => set("industry", v)} options={INDUSTRIES} error={errors.industry} placeholder="Choose one" />
        </Field>
        <Field id="rp-role" label="Your role" error={errors.role}>
          <Select id="rp-role" value={draft.role} onChange={v => set("role", v)} options={ROLES} error={errors.role} placeholder="Choose one" />
        </Field>
        <Field id="rp-need" label="What brings you here" error={errors.need}>
          <Select id="rp-need" value={draft.need} onChange={v => set("need", v)} options={NEEDS} error={errors.need} placeholder="Choose one" />
        </Field>
      </div>

      {/* Honeypot: hidden from people and screen readers; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="rp-website">Website</label>
        <input id="rp-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-[14px] leading-snug">
        <input type="checkbox" checked={draft.marketing} onChange={e => set("marketing", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]" />
        <span>Also send me occasional updates on ESG and carbon reporting. <span className="text-muted-foreground">Optional.</span></span>
      </label>

      <button type="submit" disabled={sending} className="mt-5 h-12 w-full rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-transform hover:-translate-y-px disabled:opacity-60">
        {sending ? "Checking and sending…" : "Email me the report"}
      </button>
      {formError && <p className="mt-3 text-[14px] text-destructive" role="alert">{formError}</p>}

      <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
        We use your details only to send you this report and to see who reads it. We never sell them. We keep them for 90 days, and you can ask us to delete them sooner. Temporary or made-up emails won’t receive the link. <Link to="/legal/privacy" className="underline underline-offset-2">How we handle your data</Link>.
      </p>
      {!user && !isLoading && (
        <p className="mt-3 text-[13px] text-muted-foreground">Have an account? <Link to={`/auth?next=${encodeURIComponent(RESOURCE.path)}`} className="font-medium text-foreground underline underline-offset-2">Sign in</Link> and download instantly.</p>
      )}
    </form>
  );
}
