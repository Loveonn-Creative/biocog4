import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { LeadHeader } from "@/components/lead/LeadKit";
import { StoryView } from "@/components/stories/StoryView";
import { useSession } from "@/hooks/useSession";
import { loadSupabase } from "@/integrations/supabase/lazyClient";
import { trackEvent } from "@/lib/analytics";
import {
  ACCOUNT_CONSENT_TEXT, ATTRIBUTIONS, BASES, BUYERS, EVIDENCE, FRICTIONS, LIMITS, METRICS, OPPORTUNITIES, PAINS, PRIVATE_CONSENT_TEXT,
  STORY_INDUSTRIES, VISIBILITY, generateStory, optionsFor, publishConsentText, storyJson, storyStrength, validateStory,
  type AccountFigures, type AttributionId, type BuyerId, type StoryAnswers, type StoryMetric,
} from "@/lib/caseStudy";

type Draft = Omit<StoryAnswers, "buyer" | "industry"> & { buyer: BuyerId | ""; industry: StoryAnswers["industry"] | "" };
const EMPTY: Draft = { buyer: "", industry: "", region: "", pains: [], moment: "", frictions: [], visibility: [], evidence: [], opportunities: [], metrics: [], quote: "", name: "", role: "", company: "", attribution: "anonymous" };
const DRAFT_KEY = "senseible_story_draft_v1";

const STEPS = [
  { key: "who", q: "Who are you?", hint: "Your answers shape the next questions." },
  { key: "industry", q: "Where do you work?", hint: "Your industry and, if you like, your city or state." },
  { key: "pain", q: "What was hard before Senseible?", hint: "Pick up to three. Then, if you can, the moment it hurt." },
  { key: "friction", q: "What got easier?", hint: "Pick up to three." },
  { key: "evidence", q: "What can you see or show now?", hint: "Pick what is true today." },
  { key: "opened", q: "What did it open up?", hint: "Optional. Add a number only if you know it, and say how you know it." },
  { key: "words", q: "Anything in your own words?", hint: "Optional. One line others in your shoes would want to hear." },
  { key: "credit", q: "How should we credit you?", hint: "You decide. Anonymous is fine." },
] as const;

const sha256 = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))), b => b.toString(16).padStart(2, "0")).join("");

function Chips({ options, value, onChange, max = LIMITS.picks, name }: { options: { id: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; max?: number; name: string }) {
  return (
    <div role="group" aria-label={name} className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = value.includes(o.id);
        const full = !on && value.length >= max;
        return (
          <button key={o.id} type="button" aria-pressed={on} disabled={full}
            onClick={() => onChange(on ? value.filter(v => v !== o.id) : [...value, o.id])}
            className={`min-h-11 rounded-2xl border px-4 py-2.5 text-left text-[15px] leading-snug transition-colors disabled:opacity-40 ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/40"}`}>
            {on && <span aria-hidden="true" className="mr-1.5">✓</span>}{o.label}
          </button>
        );
      })}
    </div>
  );
}

const field = "h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ShareStory = () => {
  const { user, isLoading } = useSession();
  const [draft, setDraft] = useState<Draft>(() => {
    try { const s = localStorage.getItem(DRAFT_KEY); return s ? { ...EMPTY, ...JSON.parse(s) } : EMPTY; } catch { return EMPTY; }
  });
  const [step, setStep] = useState(-1);
  const [figures, setFigures] = useState<AccountFigures | null>(null);
  const [includeAccount, setIncludeAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [choice, setChoice] = useState<"publish" | "private" | "">("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<"submitted" | "private" | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const [metricDraft, setMetricDraft] = useState<{ id: string; value: string; basis: StoryMetric["basis"]; verifier: string }>({ id: "", value: "", basis: "reported", verifier: "" });

  useEffect(() => { trackEvent("story_journey_view", {}); }, []);
  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* storage blocked */ } }, [draft]);

  // Signed in: start from the account (the person sees and chooses what to include).
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const supabase = await loadSupabase();
        const { data } = await supabase.functions.invoke("story-submit", { body: { action: "prefill" } });
        if (!alive || !data) return;
        setFigures(data.figures ?? null);
        setDraft(d => ({ ...d, company: d.company || data.company || "", name: d.name || data.name || "", region: d.region || data.region || "" }));
        if (data.email) setEmail(data.email);
      } catch { /* prefill is a convenience */ }
    })();
    return () => { alive = false; };
  }, [user]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setDraft(d => ({ ...d, [k]: v })); setFieldErrors(e => ({ ...e, [k]: "" })); };
  const buyer = (draft.buyer || "msme") as BuyerId;

  const preview = useMemo(() => {
    if (!draft.buyer) return null;
    const a: StoryAnswers = { ...draft, buyer: draft.buyer, industry: draft.industry || "other" } as StoryAnswers;
    return generateStory(a, includeAccount ? figures : null);
  }, [draft, includeAccount, figures]);
  const strength = storyStrength(draft as Partial<StoryAnswers>);

  const canNext = [
    !!draft.buyer, !!draft.industry, draft.pains.length > 0, draft.frictions.length > 0,
    draft.visibility.length + draft.evidence.length > 0, true, true, true,
  ];
  const go = (n: number) => { setStep(n); setError(null); top.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); };

  const addMetric = () => {
    const def = METRICS.find(m => m.id === metricDraft.id);
    const value = Number(metricDraft.value);
    if (!def || !(value > 0) || value > def.max) return;
    if (metricDraft.basis === "independent" && metricDraft.verifier.trim().length < 2) return;
    set("metrics", [...draft.metrics.filter(m => m.id !== def.id), { id: def.id, value, basis: metricDraft.basis, ...(metricDraft.basis === "independent" ? { verifier: metricDraft.verifier.trim() } : {}) }]);
    setMetricDraft({ id: "", value: "", basis: "reported", verifier: "" });
  };

  const submit = async () => {
    setError(null);
    const v = validateStory(draft as unknown as Record<string, unknown>);
    if (!v.ok) { setFieldErrors(v.errors as Record<string, string>); setError(Object.values(v.errors)[0] ?? "Check your answers."); return; }
    if (!choice) { setError("Choose whether we may publish your story, or keep it private."); return; }
    if (choice === "publish" && !user && !email.trim()) { setFieldErrors(e => ({ ...e, email: "Add a work email. It is never published." })); return; }
    setSending(true);
    try {
      const story = generateStory(v.value, includeAccount && user ? figures : null);
      const storyHash = await sha256(storyJson(story));
      const supabase = await loadSupabase();
      const { data, error: err } = await supabase.functions.invoke("story-submit", {
        body: { action: "submit", answers: v.value, publish: choice === "publish", privateOnly: choice === "private", includeAccount: includeAccount && !!user, email, storyHash, website: (document.getElementById("st-website") as HTMLInputElement | null)?.value ?? "" },
      });
      if (err) {
        const ctx = (err as { context?: Response }).context;
        let body: { error?: string; fields?: Record<string, string> } | null = null;
        try { body = ctx ? await ctx.clone().json() : null; } catch { body = null; }
        if (body?.fields) setFieldErrors(body.fields);
        setError(body?.error === "not_open" ? "Stories open soon. Please try again in a few days." : body?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(data?.status === "private" ? "private" : "submitted");
      trackEvent("story_submitted", { buyer: v.value.buyer, publish: choice === "publish" ? 1 : 0 });
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const meter = (
    <div className="flex items-center gap-3" aria-label={`Story strength ${strength}%`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${strength}%` }} /></div>
      <span className="w-10 text-right text-[13px] tabular-nums text-muted-foreground">{strength}%</span>
    </div>
  );

  if (done) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SEOHead title="Thank you for your story" description="Your story is with our editors." canonical="/case-studies/share" noIndex />
        <LeadHeader />
        <main className="mx-auto max-w-2xl px-4 pb-20 pt-28 text-center sm:px-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground" aria-hidden="true">✓</div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">{done === "private" ? "Thank you. That helps us a lot." : "Thank you. Your story is with our editors."}</h1>
          <p className="mx-auto mt-3 max-w-lg text-[16px] leading-relaxed text-muted-foreground">
            {done === "private" ? "We read every answer. Nothing will be published." : "We read every story before it goes live and publish exactly the version you approved. We will email you when it is up, with a link to withdraw it at any time."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/case-studies" className="inline-flex h-12 items-center rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground">Read other stories</Link>
            <Link to={user ? "/dashboard" : "/"} className="inline-flex h-12 items-center rounded-full border border-border px-6 text-[15px] font-medium">{user ? "Back to dashboard" : "Back to Senseible"}</Link>
          </div>
        </main>
      </div>
    );
  }

  const current = STEPS[step];
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <SEOHead title="Share your carbon story" description="Tell other businesses how clearer carbon data changed things for you. Eight short questions, anonymous if you like." canonical="/case-studies/share" noIndex />
      <LeadHeader />
      <main ref={top} className="mx-auto grid max-w-6xl scroll-mt-4 gap-10 px-4 pb-28 pt-24 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:pb-16">
        <div className="min-w-0">
          {step < 0 ? (
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-primary">Customer stories</p>
              <h1 className="mt-4 text-[2.1rem] font-semibold leading-[1.08] tracking-tight [text-wrap:balance] md:text-[3rem]">Your story could save the next owner weeks.</h1>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground">Eight questions, mostly taps. Your story writes itself as you answer. Nothing goes live until you approve it, and you can stay anonymous.</p>
              <ul className="mt-6 space-y-2 text-[15px]">
                <li>✓ About three minutes</li>
                <li>✓ You choose: named, company only, or anonymous</li>
                <li>✓ Withdraw any time</li>
              </ul>
              {!isLoading && !user && (
                <p className="mt-6 text-[14px] text-muted-foreground"><Link to="/auth?next=%2Fcase-studies%2Fshare" className="font-medium text-foreground underline underline-offset-2">Sign in</Link> to start from your company details and verified emissions, or carry on without signing in.</p>
              )}
              {user && figures && (
                <p className="mt-6 rounded-2xl bg-secondary px-4 py-3 text-[14px]">Signed in. We filled in what we know{draft.company ? ` (${draft.company})` : ""}. You can include your account figures at the end.</p>
              )}
              <button type="button" onClick={() => go(0)} className="mt-8 h-12 rounded-full bg-primary px-8 text-[15px] font-medium text-primary-foreground transition-transform hover:-translate-y-px">Start my story</button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-4">
                <button type="button" onClick={() => go(step - 1)} className="text-[14px] text-muted-foreground underline underline-offset-2">Back</button>
                <span className="text-[13px] tabular-nums text-muted-foreground">Question {step + 1} of {STEPS.length}</span>
              </div>
              <div className="mt-3">{meter}</div>
              <h1 className="mt-8 text-[1.75rem] font-semibold leading-tight tracking-tight [text-wrap:balance] md:text-[2.25rem]">{current.q}</h1>
              <p className="mt-2 text-[15px] text-muted-foreground">{current.hint}</p>

              <div className="mt-6 space-y-5">
                {current.key === "who" && (
                  <div role="radiogroup" aria-label="Who you are" className="grid gap-2 sm:grid-cols-2">
                    {BUYERS.map(b => (
                      <button key={b.id} type="button" role="radio" aria-checked={draft.buyer === b.id}
                        onClick={() => { set("buyer", b.id); setDraft(d => ({ ...d, buyer: b.id, pains: [], frictions: [], visibility: [], evidence: [], opportunities: [] })); }}
                        className={`min-h-14 rounded-2xl border px-4 py-3 text-left text-[15px] font-medium ${draft.buyer === b.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/40"}`}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                )}
                {current.key === "industry" && (
                  <>
                    <Chips name="Industry" max={1} options={[...STORY_INDUSTRIES]} value={draft.industry ? [draft.industry] : []} onChange={v => set("industry", (v[v.length - 1] ?? "") as Draft["industry"])} />
                    <div>
                      <label htmlFor="st-region" className="text-[13px] font-medium">City or state <span className="text-muted-foreground">(optional)</span></label>
                      <input id="st-region" className={`${field} mt-1.5 max-w-sm`} maxLength={LIMITS.region} value={draft.region} onChange={e => set("region", e.target.value)} placeholder="For example, Tiruppur" />
                    </div>
                  </>
                )}
                {current.key === "pain" && (
                  <>
                    <Chips name="What was hard" options={optionsFor(PAINS, buyer)} value={draft.pains} onChange={v => set("pains", v)} />
                    <div>
                      <label htmlFor="st-moment" className="text-[13px] font-medium">The moment it hurt <span className="text-muted-foreground">(optional, your words)</span></label>
                      <textarea id="st-moment" rows={2} maxLength={LIMITS.moment} value={draft.moment} onChange={e => set("moment", e.target.value)} placeholder="Our buyer in Germany gave us two weeks to send Scope 1 and 2."
                        className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                      <p className="mt-1 text-right text-[12px] text-muted-foreground">{draft.moment.length}/{LIMITS.moment}</p>
                    </div>
                  </>
                )}
                {current.key === "friction" && <Chips name="What got easier" options={optionsFor(FRICTIONS, buyer)} value={draft.frictions} onChange={v => set("frictions", v)} />}
                {current.key === "evidence" && (
                  <>
                    <p className="text-[13px] font-medium">What you can see</p>
                    <Chips name="What you can see" options={optionsFor(VISIBILITY, buyer)} value={draft.visibility} onChange={v => set("visibility", v)} />
                    <p className="pt-2 text-[13px] font-medium">What you can show</p>
                    <Chips name="What you can show" options={optionsFor(EVIDENCE, buyer)} value={draft.evidence} onChange={v => set("evidence", v)} />
                  </>
                )}
                {current.key === "opened" && (
                  <>
                    <Chips name="What it opened up" options={optionsFor(OPPORTUNITIES, buyer)} value={draft.opportunities} onChange={v => set("opportunities", v)} />
                    <div className="rounded-2xl border border-border p-4">
                      <p className="text-[14px] font-medium">Add a number <span className="font-normal text-muted-foreground">(optional)</span></p>
                      {draft.metrics.length > 0 && (
                        <ul className="mt-3 space-y-1.5 text-[14px]">
                          {draft.metrics.map(m => (
                            <li key={m.id} className="flex items-center justify-between gap-3">
                              <span>{METRICS.find(d => d.id === m.id)?.label}: <strong className="tabular-nums">{m.value}</strong> · {m.basis === "independent" ? `verified by ${m.verifier}` : BASES.find(b => b.id === m.basis)?.label.toLowerCase()}</span>
                              <button type="button" onClick={() => set("metrics", draft.metrics.filter(x => x.id !== m.id))} className="text-[13px] text-muted-foreground underline">Remove</button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_8rem]">
                        <select aria-label="Which number" value={metricDraft.id} onChange={e => setMetricDraft(m => ({ ...m, id: e.target.value }))} className={field}>
                          <option value="">Choose a number</option>
                          {METRICS.map(m => <option key={m.id} value={m.id}>{m.label} ({m.unit})</option>)}
                        </select>
                        <input aria-label="Value" inputMode="decimal" value={metricDraft.value} onChange={e => setMetricDraft(m => ({ ...m, value: e.target.value.replace(/[^\d.]/g, "").slice(0, 10) }))} placeholder="0" className={field} />
                      </div>
                      <div role="radiogroup" aria-label="How do you know it" className="mt-2 flex flex-wrap gap-2">
                        {BASES.filter(b => b.id !== "calculated").map(b => (
                          <button key={b.id} type="button" role="radio" aria-checked={metricDraft.basis === b.id} onClick={() => setMetricDraft(m => ({ ...m, basis: b.id as StoryMetric["basis"] }))}
                            className={`min-h-10 rounded-full border px-3.5 text-[13px] ${metricDraft.basis === b.id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{b.label}</button>
                        ))}
                      </div>
                      {metricDraft.basis === "independent" && (
                        <input aria-label="Verified by" maxLength={LIMITS.verifier} value={metricDraft.verifier} onChange={e => setMetricDraft(m => ({ ...m, verifier: e.target.value }))} placeholder="Who verified it (firm name)" className={`${field} mt-2`} />
                      )}
                      <button type="button" onClick={addMetric} className="mt-3 h-10 rounded-full border border-border px-4 text-[14px] font-medium">Add number</button>
                      <p className="mt-2 text-[12.5px] text-muted-foreground">Every number is shown with how it is known. A third-party verification is shown only after our editors confirm it.</p>
                    </div>
                  </>
                )}
                {current.key === "words" && (
                  <div>
                    <label htmlFor="st-quote" className="sr-only">Your words</label>
                    <textarea id="st-quote" rows={3} maxLength={LIMITS.quote} value={draft.quote} onChange={e => set("quote", e.target.value)} placeholder="What would you tell another owner who just got the same email from a buyer?"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    <p className="mt-1 text-right text-[12px] text-muted-foreground">{draft.quote.length}/{LIMITS.quote}</p>
                  </div>
                )}
                {current.key === "credit" && (
                  <>
                    <div role="radiogroup" aria-label="How we credit you" className="grid gap-2 sm:grid-cols-3">
                      {ATTRIBUTIONS.map(a => (
                        <button key={a.id} type="button" role="radio" aria-checked={draft.attribution === a.id} onClick={() => set("attribution", a.id as AttributionId)}
                          className={`min-h-12 rounded-2xl border px-4 py-3 text-[15px] font-medium ${draft.attribution === a.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{a.label}</button>
                      ))}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {draft.attribution === "named" && (
                        <>
                          <div><label htmlFor="st-name" className="text-[13px] font-medium">Your name</label><input id="st-name" autoComplete="name" className={`${field} mt-1.5`} value={draft.name} onChange={e => set("name", e.target.value)} />{fieldErrors.name && <p className="mt-1 text-[13px] text-destructive">{fieldErrors.name}</p>}</div>
                          <div><label htmlFor="st-role" className="text-[13px] font-medium">Your role <span className="text-muted-foreground">(optional)</span></label><input id="st-role" className={`${field} mt-1.5`} value={draft.role} onChange={e => set("role", e.target.value)} /></div>
                        </>
                      )}
                      {draft.attribution !== "anonymous" && (
                        <div><label htmlFor="st-company" className="text-[13px] font-medium">Company</label><input id="st-company" autoComplete="organization" className={`${field} mt-1.5`} value={draft.company} onChange={e => set("company", e.target.value)} />{fieldErrors.company && <p className="mt-1 text-[13px] text-destructive">{fieldErrors.company}</p>}</div>
                      )}
                      {!user && (
                        <div><label htmlFor="st-email" className="text-[13px] font-medium">Work email <span className="text-muted-foreground">(never published)</span></label><input id="st-email" type="email" autoComplete="email" className={`${field} mt-1.5`} value={email} onChange={e => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: "" })); }} />{fieldErrors.email && <p className="mt-1 text-[13px] text-destructive">{fieldErrors.email}</p>}</div>
                      )}
                    </div>
                    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden"><input id="st-website" tabIndex={-1} autoComplete="off" /></div>

                    <fieldset className="space-y-3 rounded-2xl border border-border p-4">
                      <legend className="px-1 text-[14px] font-medium">Your choice</legend>
                      <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-snug">
                        <input type="radio" name="st-choice" checked={choice === "publish"} onChange={() => setChoice("publish")} className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]" />
                        <span><strong>Publish my story.</strong> {publishConsentText(draft.attribution, draft.company)}</span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-snug">
                        <input type="radio" name="st-choice" checked={choice === "private"} onChange={() => setChoice("private")} className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]" />
                        <span><strong>Only use my feedback privately.</strong> {PRIVATE_CONSENT_TEXT}</span>
                      </label>
                      {user && figures && (figures.documents > 0 || figures.verifiedKg > 0) && (
                        <label className="flex cursor-pointer items-start gap-3 border-t border-border pt-3 text-[14px] leading-snug">
                          <input type="checkbox" checked={includeAccount} onChange={e => setIncludeAccount(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]" />
                          <span><strong>Add my account figures.</strong> {ACCOUNT_CONSENT_TEXT}</span>
                        </label>
                      )}
                      <p className="text-[12.5px] text-muted-foreground">Changed your mind later? Use the link in your confirmation email, or reach us as set out in our <Link to="/legal/privacy" className="underline underline-offset-2">Privacy Policy</Link>. Publishing terms are in our <Link to="/legal/terms" className="underline underline-offset-2">Terms</Link>.</p>
                    </fieldset>
                  </>
                )}
              </div>

              {error && <p className="mt-5 text-[14px] text-destructive" role="alert">{error}</p>}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {step < STEPS.length - 1 ? (
                  <button type="button" disabled={!canNext[step]} onClick={() => go(step + 1)} className="h-12 rounded-full bg-primary px-8 text-[15px] font-medium text-primary-foreground disabled:opacity-40">
                    {canNext[step] ? (step === 4 ? "Next: the payoff" : "Next") : "Choose an answer"}
                  </button>
                ) : (
                  <button type="button" disabled={sending || !choice} onClick={submit} className="h-12 rounded-full bg-primary px-8 text-[15px] font-medium text-primary-foreground disabled:opacity-40">
                    {sending ? "Sending…" : choice === "private" ? "Send my feedback" : "Send my story for review"}
                  </button>
                )}
                {(current.key === "opened" || current.key === "words") && <button type="button" onClick={() => go(step + 1)} className="text-[14px] text-muted-foreground underline underline-offset-2">Skip</button>}
              </div>
            </div>
          )}
        </div>

        {/* Live story: desktop beside the questions; phones open it from the bar */}
        <aside className="hidden min-w-0 lg:block" aria-label="Your story so far">
          <div className="sticky top-6 rounded-3xl border border-border bg-card p-6 shadow-[0_30px_60px_-45px_hsl(var(--foreground)/.45)]">
            <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your story, as it will read</p>
            {preview ? <StoryView story={preview} compact /> : <p className="text-[15px] text-muted-foreground">Answer the first question and your story starts writing itself here.</p>}
          </div>
        </aside>
      </main>

      {step >= 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setShowPreview(true)} className="flex h-12 w-full items-center justify-between rounded-full border border-border px-5 text-[15px] font-medium">
            <span>Preview my story</span><span className="tabular-nums text-muted-foreground">{strength}%</span>
          </button>
        </div>
      )}
      {showPreview && (
        <div role="dialog" aria-modal="true" aria-label="Your story so far" className="fixed inset-0 z-50 overflow-y-auto bg-background px-4 pb-10 pt-5 lg:hidden">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your story, as it will read</p>
            <button type="button" onClick={() => setShowPreview(false)} className="h-10 rounded-full border border-border px-4 text-[14px]">Close</button>
          </div>
          <div className="mt-5">{preview ? <StoryView story={preview} compact /> : <p className="text-muted-foreground">Answer the first question to begin.</p>}</div>
        </div>
      )}
    </div>
  );
};

export default ShareStory;
