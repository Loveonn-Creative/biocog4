import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { Footer } from "@/components/Footer";
import { BillDoodle } from "@/components/lead/BillDoodle";
import { Choice, CopyButton, LeadHeader, Scribble, StickyCta } from "@/components/lead/LeadKit";
import { leadEvents } from "@/components/lead/leadEvents";
import { HashScramble, Stamp, TickList, useTypewriter } from "@/components/lead/LeadMotion";
import { useInView } from "@/components/platform/Reveal";
import { ASKER, estimateAnnual, estimateBand, replyText, type Asker } from "@/lib/leadMagnets/msmeCarbonReply";
import { MSME_CARBON_FAQS, MSME_CARBON_META } from "@/data/leadMagnets";

const PAGE = "msme_carbon_number";

const NumberField = ({ id, label, hint, unit, value, onChange }: { id: string; label: string; hint: string; unit: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label>
    <p className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>
    <div className="relative mt-2">
      <input id={id} type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={value}
        onChange={e => onChange(e.target.value.replace(/[^\d.]/g, "").slice(0, 9))}
        className="h-14 w-full rounded-xl border border-input bg-background pl-4 pr-16 text-xl tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{unit}</span>
    </div>
  </div>
);

const MsmeCarbonNumber = () => {
  const navigate = useNavigate();
  const [asker, setAsker] = useState<Asker>("eu_buyer");
  const [kwh, setKwh] = useState("");
  const [diesel, setDiesel] = useState("");
  const engaged = useRef(false);
  const reported = useRef("");
  const estimate = useMemo(() => estimateAnnual({ kwhPerMonth: Number(kwh), dieselLitresPerMonth: Number(diesel) }), [kwh, diesel]);
  const info = ASKER[asker];

  useEffect(() => { leadEvents.view(PAGE); }, []);
  useEffect(() => {
    if (!estimate) return;
    const key = `${asker}|${estimateBand(estimate.totalTonnes)}`;
    const t = window.setTimeout(() => { if (reported.current !== key) { reported.current = key; leadEvents.result(PAGE, { asker, band: estimateBand(estimate.totalTonnes) }); } }, 1200);
    return () => window.clearTimeout(t);
  }, [estimate, asker]);
  const touch = () => { if (!engaged.current) { engaged.current = true; leadEvents.engage(PAGE); } };
  // One tap: the picker opens here, and the chosen bill is read on the home
  // page without a second upload.
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = (where: string) => { leadEvents.cta(PAGE, `upload_${where}`); fileRef.current?.click(); };
  const onPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    leadEvents.cta(PAGE, "upload_picked");
    navigate("/", { state: { pendingFile: file } });
  };
  const reply = estimate ? replyText(asker, estimate) : "";
  const [motionOk, setMotionOk] = useState(false);
  useEffect(() => { try { setMotionOk(!window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch { /* keep still */ } }, []);
  const replySection = useInView<HTMLDivElement>(0.35);
  const typedReply = useTypewriter(reply, replySection.inView);
  const proof = useInView<HTMLDivElement>(0.35);
  const tonnes = estimate ? `≈ ${estimate.totalTonnes.toLocaleString("en-IN", { maximumFractionDigits: 1 })} t` : "≈ ? t";
  const mailto = `mailto:?subject=${encodeURIComponent(asker === "self" ? "My carbon number" : "Our carbon number: reply to send")}&body=${encodeURIComponent(`${reply}\n\n${info.title}:\n${info.needs.map(n => `- ${n}`).join("\n")}\n\nWork it out again: https://senseible.earth${MSME_CARBON_META.path}`)}`;

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <SEOHead
        title={MSME_CARBON_META.title}
        description={MSME_CARBON_META.description}
        canonical={MSME_CARBON_META.path}
        keywords={["carbon footprint for MSME", "buyer asked for carbon emissions", "CBAM supplier data India", "electricity bill carbon footprint", "green loan emissions baseline"]}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Your carbon number", url: MSME_CARBON_META.path }]}
        faqSchema={MSME_CARBON_FAQS.map(f => ({ question: f.q, answer: f.a }))}
      />
      <LeadHeader />

      <main>
        {/* 1. Relevance: the request that just landed, and an answer in the first screen */}
        <section className="overflow-x-clip pt-20 md:pt-24">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-12 md:pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-primary">For MSME owners and exporters</p>
              <h1 className="mt-4 text-[2.15rem] font-semibold leading-[1.08] tracking-tight [text-wrap:balance] md:text-[3.25rem]">
                Your buyer asked for your carbon number. <Scribble>Reply this week.</Scribble>
              </h1>
              <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
                No consultant, no forms. Type the units from your electricity bill and see your number now. Free, no sign-up.
              </p>

              <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-[0_30px_60px_-45px_hsl(var(--foreground)/.4)] sm:p-6" onPointerDown={touch} onKeyDown={touch}>
                <p className="text-sm font-medium">Who asked?</p>
                <div className="mt-2">
                  <Choice<Asker> name="Who asked" value={asker} options={(Object.keys(ASKER) as Asker[]).map(id => ({ id, label: ASKER[id].label }))} onChange={setAsker} />
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <NumberField id="kwh" label="Electricity a month" hint="“Units consumed” on your bill" unit="kWh" value={kwh} onChange={setKwh} />
                  <NumberField id="diesel" label="Diesel a month, if any" hint="Generator or vehicles" unit="litres" value={diesel} onChange={setDiesel} />
                </div>
              </div>
            </div>

            {/* 2. Credible value: the number, on the bill it comes from */}
            <div className="flex flex-col lg:pt-6">
              <BillDoodle kwh={Number(kwh) || 0} tonnes={estimate?.totalTonnes ?? null} to={info.to.replace(/^our /, "")} />
              <div className="order-first mb-2 rounded-2xl border border-border bg-card p-5 lg:order-none lg:mb-0 lg:mt-4" aria-live="polite">
                {estimate ? (
                  <>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-3xl font-semibold tabular-nums">≈ {estimate.totalTonnes.toLocaleString("en-IN", { maximumFractionDigits: 1 })} <span className="text-lg font-normal text-muted-foreground">tonnes CO₂ a year</span></div>
                    </div>
                    <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                      <div className="bg-primary transition-[width] duration-500" style={{ width: `${estimate.electricityPct}%` }} />
                      <div className="bg-foreground/40 transition-[width] duration-500" style={{ width: `${100 - estimate.electricityPct}%` }} />
                    </div>
                    <p className="mt-2 text-[13px] text-muted-foreground">{estimate.electricityPct}% electricity, {100 - estimate.electricityPct}% diesel. Estimate from the numbers you typed, at {estimate.factors.grid.toFixed(3)} kg CO₂/kWh and {estimate.factors.diesel} kg CO₂/litre.</p>
                  </>
                ) : (
                  <p className="text-[15px] text-muted-foreground">Type your monthly units to see your number. Most bills print it next to “Units consumed” or “kWh”.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. What the person asking needs, and a reply to send now */}
        <section className="border-y border-border bg-secondary/40">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1fr_1.1fr] md:gap-14 md:py-24">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{info.title}</h2>
              <p className="mt-4 max-w-[30rem] text-[16px] leading-relaxed text-muted-foreground">{info.why}</p>
              <TickList key={asker} items={info.needs} className="mt-8" />
            </div>
            <div ref={replySection.ref} className="rounded-3xl border border-border bg-background p-5 shadow-[0_30px_60px_-50px_hsl(var(--foreground)/.5)] md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-medium">{asker === "self" ? "Your number, in one line" : "Your reply, ready to send"}</h3>
                {estimate && (
                  <div className="flex flex-wrap gap-2">
                    <CopyButton text={reply} onCopy={() => leadEvents.cta(PAGE, "copy_reply")} />
                    <a href={`https://wa.me/?text=${encodeURIComponent(reply)}`} target="_blank" rel="noopener noreferrer" onClick={() => leadEvents.cta(PAGE, "whatsapp_reply")}
                      className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-secondary">WhatsApp</a>
                    <a href={mailto} onClick={() => leadEvents.cta(PAGE, "email_self")}
                      className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-secondary">Email it to me</a>
                  </div>
                )}
              </div>
              <pre className="mt-5 min-h-[10rem] whitespace-pre-wrap rounded-2xl bg-secondary/60 p-4 font-sans text-[15px] leading-relaxed text-foreground md:p-5" aria-live="off">
                {estimate ? typedReply : "Type your electricity units above and your reply appears here."}
              </pre>
              {estimate && <p className="mt-3 text-[13px] text-muted-foreground">Email it to yourself with the checklist, so it is waiting when the follow-up comes.</p>}
            </div>
          </div>
        </section>

        {/* 4. The line to remember: the bill already holds the number; typing replies, uploading proves */}
        <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <h2 className="max-w-3xl text-[2rem] font-semibold leading-[1.1] tracking-tight [text-wrap:balance] md:text-[3rem]">Your electricity bill already knows your carbon number.</h2>
          <p className="mt-4 text-lg text-muted-foreground">Typing it gets you a reply. Uploading it gets you proof.</p>
          <div ref={proof.ref} className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-dashed border-border p-6 md:p-8">
              <div className="text-sm text-muted-foreground">Typed by you</div>
              <div className="mt-4 text-4xl font-semibold tabular-nums text-muted-foreground md:text-5xl"><span className="lead-wobble">{tonnes}</span></div>
              <p className="mt-5 text-lg font-medium">Good for replying today</p>
              <ul className="mt-3 space-y-2 text-[15px] text-muted-foreground">
                <li>From numbers you typed</li>
                <li>No document behind it</li>
                <li>A buyer or bank cannot check it</li>
              </ul>
            </div>
            <div className="relative rounded-3xl border-2 border-primary/50 bg-card p-6 md:p-8">
              <Stamp start={proof.inView} className="absolute right-5 top-5">Fingerprinted</Stamp>
              <div className="text-sm text-primary">Read from your bill</div>
              <div className="mt-4 text-4xl font-semibold tabular-nums md:text-5xl">{tonnes}</div>
              <div className="mt-2 truncate text-[12px] text-muted-foreground">SHA-256 <HashScramble start={proof.inView} target="7f3a9c2e41b8d06f5ac91e37" /></div>
              <p className="mt-4 text-lg font-medium">What buyers and banks can check</p>
              <ul className="mt-3 space-y-2 text-[15px] text-foreground/80">
                <li>Built from your actual bills</li>
                <li>Factor and source shown on every line</li>
                <li>Each bill fingerprinted, so it is never counted twice</li>
              </ul>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={onPicked} />
          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
            <button type="button" onClick={() => upload("main")} className="h-14 rounded-full bg-primary px-8 text-base font-medium text-primary-foreground transition-transform hover:-translate-y-px">
              Upload one electricity bill, free →
            </button>
            <span className="text-sm text-muted-foreground">Photo or PDF. Free for up to 10 bills a month.</span>
          </div>
          <Link to="/esg-report-sample" onClick={() => leadEvents.cta(PAGE, "sample_report")} className="mt-6 inline-block text-[15px] font-medium text-primary underline-offset-4 hover:underline">See what a finished report looks like →</Link>
        </section>

        {/* 4b. Climate finance: what the record is for at a bank */}
        <section className="mx-auto max-w-6xl px-5 pb-16 md:pb-24">
          <div className="grid items-center gap-6 rounded-3xl bg-foreground p-6 text-background md:grid-cols-[1.3fr_1fr] md:p-10">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Going to a bank for a green loan?</h2>
              <p className="mt-3 max-w-[32rem] text-[16px] leading-relaxed text-background/75">Lenders ask for a starting baseline they can check. A bill-backed record is that baseline.</p>
              <Link to="/green-loan-check" onClick={() => leadEvents.cta(PAGE, "green_loan_check")} className="mt-6 inline-flex h-12 items-center rounded-full bg-background px-6 text-[15px] font-medium text-foreground transition-transform hover:-translate-y-px">Check your green loan fit →</Link>
            </div>
            <svg viewBox="0 0 320 90" className="h-auto w-full max-w-sm justify-self-center text-background" aria-hidden="true">
              <path id="lead-loan-path" d="M20 60 C 90 10, 150 80, 200 40 S 280 20, 300 40" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="2" strokeDasharray="4 6" />
              <circle r="5" cx={motionOk ? 0 : 300} cy={motionOk ? 0 : 40} className="fill-primary">
                {motionOk && <animateMotion dur="3.2s" repeatCount="indefinite" path="M20 60 C 90 10, 150 80, 200 40 S 280 20, 300 40" />}
              </circle>
              <text x="8" y="84" className="fill-current text-[12px]" opacity=".7">Bills</text>
              <text x="178" y="76" className="fill-current text-[12px]" opacity=".7">Record</text>
              <text x="276" y="24" className="fill-current text-[12px]" opacity=".7">Lender</text>
            </svg>
          </div>
        </section>

        {/* 5. Fears, answered plainly */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-5 py-14 md:py-20">
            <h2 className="text-2xl font-semibold tracking-tight">Before you start</h2>
            <div className="mt-6 divide-y divide-border border-y border-border">
              {MSME_CARBON_FAQS.map(f => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-medium">
                    {f.q}<span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
            <p className="mt-8 text-sm text-muted-foreground">How calculations and data are handled: <Link to="/trust" className="underline underline-offset-2">Trust and methodology</Link>.</p>
          </div>
        </section>
      </main>

      <Footer />
      <StickyCta label="Upload a bill, free" onClick={() => upload("sticky")} hideWhenVisible="none" />
    </div>
  );
};

export default MsmeCarbonNumber;
