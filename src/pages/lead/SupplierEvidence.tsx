import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { SupplierNetwork } from "@/components/lead/SupplierNetwork";
import { Choice, CopyButton, LeadHeader, Scribble, StickyCta } from "@/components/lead/LeadKit";
import { fmtInt, leadEvents } from "@/components/lead/leadEvents";
import { PRESSURE_LABEL, SUPPLIER_REQUEST, planSummary, supplierEvidencePlan, type Pressure } from "@/lib/leadMagnets/supplierEvidence";
import { SUPPLIER_EVIDENCE_FAQS, SUPPLIER_EVIDENCE_META } from "@/data/leadMagnets";

const PAGE = "supplier_evidence";
const MONTHS = [3, 6, 9, 12] as const;

const Field = ({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label>
    {hint && <p className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>}
    <div className="mt-2">{children}</div>
  </div>
);

const SupplierEvidence = () => {
  const [suppliers, setSuppliers] = useState(120);
  const [withData, setWithData] = useState(18);
  const [months, setMonths] = useState<(typeof MONTHS)[number]>(6);
  const [pressure, setPressure] = useState<Pressure>("assurance");
  const engaged = useRef(false);
  const plan = useMemo(() => supplierEvidencePlan({ suppliers, withData, months, pressure }), [suppliers, withData, months, pressure]);

  useEffect(() => { leadEvents.view(PAGE); }, []);
  const touch = () => { if (!engaged.current) { engaged.current = true; leadEvents.engage(PAGE); } };

  // Form
  const [form, setForm] = useState({ name: "", email: "", company: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const toForm = () => {
    leadEvents.cta(PAGE, "get_plan");
    document.getElementById("plan")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => document.getElementById("lead-name")?.focus({ preventScroll: true }), 500);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.website) { setState("sent"); return; } // honeypot: bots fill hidden fields
    setState("sending"); setError("");
    const message = `${planSummary(plan, pressure)}\nRequested: supplier evidence plan (lead page /scope-3-supplier-evidence).`;
    const { data, error: fnError } = await supabase.functions.invoke("send-contact-notification", {
      body: { name: form.name.trim(), email: form.email.trim(), company: form.company.trim(), category: "enterprise", message, newsletter: false },
    });
    if (fnError || !data?.success) {
      setError(await getFunctionErrorMessage(fnError, "That did not go through. Please try again, or write to impact@senseible.earth."));
      setState("error");
      return;
    }
    leadEvents.submit(PAGE, { suppliers_band: suppliers < 50 ? "<50" : suppliers < 250 ? "50-250" : suppliers < 1000 ? "250-1000" : "1000+", months, pressure });
    setState("sent");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title={SUPPLIER_EVIDENCE_META.title}
        description={SUPPLIER_EVIDENCE_META.description}
        canonical={SUPPLIER_EVIDENCE_META.path}
        keywords={["scope 3 supplier data", "category 1 purchased goods emissions", "supplier emissions evidence", "scope 3 assurance", "supplier engagement emissions"]}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Scope 3 supplier evidence", url: SUPPLIER_EVIDENCE_META.path }]}
        faqSchema={SUPPLIER_EVIDENCE_FAQS.map(f => ({ question: f.q, answer: f.a }))}
      />
      <LeadHeader />

      <main>
        {/* 1. Relevance: the job and the fear, with the tool in the first screen */}
        <section className="relative overflow-x-clip pt-20 md:pt-24">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-12 md:pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-primary">For procurement and sustainability heads</p>
              <h1 className="mt-4 text-[2.15rem] font-semibold leading-[1.08] tracking-tight [text-wrap:balance] md:text-[3.25rem]">
                Can you defend your Scope 3 number, <Scribble>one supplier</Scribble> at a time?
              </h1>
              <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-muted-foreground">
                When assurance or a customer asks where a Category 1 figure came from, the spend-based estimate is the line that gets challenged. See what you can defend today, and what it takes to close the gap before you report.
              </p>

              <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-[0_30px_60px_-45px_hsl(var(--foreground)/.4)] sm:p-6" onPointerDown={touch} onKeyDown={touch}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="suppliers" label="Suppliers behind ~80% of your spend">
                    <input id="suppliers" type="number" inputMode="numeric" min={1} max={20000} value={suppliers}
                      onChange={e => { const v = Math.max(1, Math.min(20000, Number(e.target.value) || 1)); setSuppliers(v); setWithData(w => Math.min(w, v)); }}
                      className="h-12 w-full rounded-xl border border-input bg-background px-4 text-lg tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </Field>
                  <Field id="withData" label="Of those, how many send activity data?">
                    <input id="withDataNum" type="number" inputMode="numeric" min={0} max={suppliers} value={plan.withData} aria-label="Suppliers sending activity data"
                      onChange={e => setWithData(Math.max(0, Math.min(suppliers, Number(e.target.value) || 0)))}
                      className="h-12 w-full rounded-xl border border-input bg-background px-4 text-lg tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    <input id="withData" type="range" min={0} max={suppliers} step={1} value={plan.withData} onChange={e => setWithData(Number(e.target.value))}
                      className="mt-2 h-6 w-full accent-[hsl(var(--primary))]" aria-valuetext={`${plan.withData} suppliers`} />
                  </Field>
                </div>
                <div className="mt-5">
                  <Field id="months" label="Months until you report or get assured">
                    <Choice<string> name="Months until you report" value={String(months)} options={MONTHS.map(m => ({ id: String(m), label: `${m}` }))} onChange={v => setMonths(Number(v) as (typeof MONTHS)[number])} />
                  </Field>
                </div>
                <div className="mt-5">
                  <Field id="pressure" label="Who will ask first?">
                    <Choice<Pressure> name="Who will ask first" value={pressure} options={(Object.keys(PRESSURE_LABEL) as Pressure[]).map(id => ({ id, label: PRESSURE_LABEL[id] }))} onChange={setPressure} />
                  </Field>
                </div>
              </div>
            </div>

            {/* 2. Credible value: the answer, drawn and stated */}
            <div className="flex flex-col lg:pt-10">
              <SupplierNetwork evidence={plan.dots.evidence} estimate={plan.dots.estimate} perDot={plan.perDot} />
              <div className="order-first mb-4 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card lg:order-none lg:mb-0 lg:mt-6" aria-live="polite">
                <div className="p-4">
                  <div className="text-2xl font-semibold tabular-nums">{plan.coveragePct}%</div>
                  <div className="mt-1 text-[13px] leading-snug text-muted-foreground">of these suppliers backed by bills</div>
                </div>
                <div className="p-4">
                  <div className="text-2xl font-semibold tabular-nums">{fmtInt(plan.missing)}</div>
                  <div className="mt-1 text-[13px] leading-snug text-muted-foreground">still a spend estimate</div>
                </div>
                <div className="p-4">
                  <div className="text-2xl font-semibold tabular-nums">{fmtInt(plan.perMonth)}<span className="text-base font-normal text-muted-foreground">/mo</span></div>
                  <div className="mt-1 text-[13px] leading-snug text-muted-foreground">to cover them in {months} months</div>
                </div>
              </div>
              <button type="button" onClick={toForm} className="mt-5 hidden h-12 w-full rounded-full bg-primary text-[15px] font-medium text-primary-foreground transition-transform hover:-translate-y-px md:block">
                Get my supplier evidence plan →
              </button>
            </div>
          </div>
        </section>

        {/* 3. The objection they will face, in the reviewer's own words */}
        <section className="border-y border-border bg-secondary/40">
          <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">What {PRESSURE_LABEL[pressure].toLowerCase()} will ask about the {fmtInt(plan.missing)} estimated suppliers</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {plan.questions.map((q, i) => (
                <li key={q} className="rounded-2xl border border-border bg-background p-5">
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                  <p className="mt-2 text-[17px] leading-snug">“{q}”</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
              The GHG Protocol ranks Category 1 methods from supplier-specific to spend-based, and judges data on technology, time, geography, completeness and reliability. A spend estimate scores lowest on most of them. A supplier's own bills move a line up the ladder.
            </p>
          </div>
        </section>

        {/* 4. Mechanism: why this works when questionnaires stall */}
        <section className="mx-auto max-w-6xl px-5 py-14 md:py-20">
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">Suppliers already have the evidence. It is on their bills.</h2>
          <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">Small suppliers rarely finish questionnaires. They can forward an electricity bill. Senseible reads it and gives you a line you can show a reviewer.</p>
          <div className="mt-10 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <div className="rounded-2xl border border-border p-5">
              <div className="text-sm text-muted-foreground">Supplier sends</div>
              <div className="mt-3 rounded-lg border border-dashed border-border p-3 font-mono text-[13px]">Electricity bill, Mar 2026<br />Units consumed: 4,200 kWh</div>
            </div>
            <div className="hidden items-center text-2xl text-muted-foreground md:flex" aria-hidden="true">→</div>
            <div className="rounded-2xl border border-border p-5">
              <div className="text-sm text-muted-foreground">Senseible records</div>
              <div className="mt-3 rounded-lg bg-secondary p-3 font-mono text-[13px] leading-relaxed">4,200 kWh × 0.710 kg/kWh<br />= 2,982 kg CO₂, Scope 2<br />factor source shown, file hashed</div>
            </div>
            <div className="hidden items-center text-2xl text-muted-foreground md:flex" aria-hidden="true">→</div>
            <div className="rounded-2xl border border-primary/40 p-5">
              <div className="text-sm text-muted-foreground">You can show</div>
              <p className="mt-3 text-[15px] leading-relaxed">Method, factor, source and the document, for every supplier line. The same bill cannot be counted twice.</p>
            </div>
          </div>
        </section>

        {/* 5. A useful give-away, before any contact details */}
        <section className="mx-auto max-w-6xl px-5 pb-14 md:pb-20">
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Send this to your wave 1 suppliers today</h2>
                <p className="mt-1 text-[15px] text-muted-foreground">It asks for documents they already keep, not a questionnaire.</p>
              </div>
              <CopyButton text={SUPPLIER_REQUEST} label="Copy the request" onCopy={() => leadEvents.cta(PAGE, "copy_request")} />
            </div>
            <pre className="mt-5 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-secondary/60 p-5 font-sans text-[15px] leading-relaxed text-foreground">{SUPPLIER_REQUEST}</pre>
          </div>
        </section>

        {/* 6. One action, with their numbers already in it */}
        <section id="plan" className="scroll-mt-6 border-t border-border bg-foreground text-background">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:py-20 lg:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight [text-wrap:balance] md:text-4xl">Your supplier evidence plan, for {fmtInt(plan.missing)} suppliers in {months} months</h2>
              <ul className="mt-6 space-y-3 text-[16px] leading-relaxed text-background/80">
                <li>• Three waves, largest spend first: {plan.waves.map(w => `${fmtInt(w.suppliers)} by month ${w.byMonth}`).join(", ")}.</li>
                <li>• Which suppliers to ask for which documents, by what they sell you.</li>
                <li>• A sample evidence record for one of your supplier lines.</li>
                <li>• If it helps, a scope for running wave 1 with Senseible.</li>
              </ul>
              <p className="mt-6 text-sm text-background/60">We reply within 24 hours. No newsletter.</p>
            </div>

            {state === "sent" ? (
              <div className="rounded-3xl bg-background p-6 text-foreground md:p-8" role="status">
                <h3 className="text-2xl font-semibold">Plan request received</h3>
                <p className="mt-2 text-muted-foreground">We have your numbers, so you will not need to explain them twice. Expect a reply within 24 hours.</p>
                <p className="mt-6 text-sm font-medium">While you wait</p>
                <p className="mt-1 text-sm text-muted-foreground">Send the request above to your largest suppliers. Replies take time, so starting now saves weeks.</p>
                <div className="mt-4"><CopyButton text={SUPPLIER_REQUEST} label="Copy the supplier request" /></div>
              </div>
            ) : (
              <form onSubmit={submit} className="rounded-3xl bg-background p-6 text-foreground md:p-8" noValidate={false}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="lead-name" className="text-sm font-medium">Name</label>
                    <input id="lead-name" required autoComplete="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={120}
                      className="mt-1.5 h-12 w-full rounded-xl border border-input bg-background px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div>
                    <label htmlFor="lead-email" className="text-sm font-medium">Work email</label>
                    <input id="lead-email" required type="email" autoComplete="email" inputMode="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} maxLength={254}
                      className="mt-1.5 h-12 w-full rounded-xl border border-input bg-background px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div>
                    <label htmlFor="lead-company" className="text-sm font-medium">Company</label>
                    <input id="lead-company" required autoComplete="organization" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} maxLength={160}
                      className="mt-1.5 h-12 w-full rounded-xl border border-input bg-background px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="website" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
                </div>
                <div className="mt-5 rounded-xl bg-secondary/60 p-3 text-[13px] leading-relaxed text-muted-foreground">
                  Sent with your request: {fmtInt(plan.suppliers)} suppliers, {fmtInt(plan.withData)} with activity data, {months} months, {PRESSURE_LABEL[pressure].toLowerCase()}.
                </div>
                {state === "error" && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
                <button type="submit" disabled={state === "sending"} className="mt-5 h-12 w-full rounded-full bg-primary text-[15px] font-medium text-primary-foreground disabled:opacity-60">
                  {state === "sending" ? "Sending…" : "Send me my plan"}
                </button>
                <p className="mt-3 text-center text-xs text-muted-foreground">Used only to reply to you. <Link to="/legal" className="underline underline-offset-2">Privacy</Link></p>
              </form>
            )}
          </div>
        </section>

        {/* 7. Remaining objections, answered plainly */}
        <section className="mx-auto max-w-3xl px-5 py-14 md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight">Before you ask</h2>
          <div className="mt-6 divide-y divide-border border-y border-border">
            {SUPPLIER_EVIDENCE_FAQS.map(f => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-medium">
                  {f.q}<span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-sm text-muted-foreground">How we handle data and calculations: <Link to="/trust" className="underline underline-offset-2">Trust and methodology</Link>. Enterprise capabilities and their status: <Link to="/enterprise" className="underline underline-offset-2">Enterprise</Link>.</p>
        </section>
      </main>

      <Footer />
      <StickyCta label="Get my supplier evidence plan" onClick={toForm} hideWhenVisible="plan" />
    </div>
  );
};

export default SupplierEvidence;
