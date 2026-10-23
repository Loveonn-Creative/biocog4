import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Landmark, Ship, Coins, Upload } from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import { FlowVisual } from "./FlowVisual";
import { AskCards } from "./AskCards";
import { CbamExposure } from "./CbamExposure";

/**
 * The homepage story below the first viewport. The homepage speaks to one
 * audience: MSMEs turning their own documents into verified data they can
 * monetise (green loans, buyer and export requests, carbon credits). The
 * enterprise use case (supplier / Scope 3 automation) gets a single pointer
 * here and lives on its own pages. Loaded lazily so it never weighs on first paint.
 */
export const HomeStory = ({ onUpload }: { onUpload: () => void }) => {
  const t = useT();

  const steps = [
    {
      n: "01",
      title: t("home.how.1.title", "Capture"),
      body: t("home.how.1.body", "Upload an electricity bill, fuel slip or invoice, or take a photo. Each line item is read and classified to Scope 1, 2 or 3."),
    },
    {
      n: "02",
      title: t("home.how.2.title", "Calculate"),
      body: t("home.how.2.body", "Every line is multiplied by a published emission factor. One kWh of Indian grid power is 0.710 kgCO2 (CEA CO2 Baseline Database v21.0)."),
    },
    {
      n: "03",
      title: t("home.how.3.title", "Verify"),
      body: t("home.how.3.body", "Each file gets a fingerprint, so it is never counted twice. The more bills you add, the tighter the range on your total (it narrows roughly with the square root of the number of records)."),
    },
    {
      n: "04",
      title: t("home.how.4.title", "Use it"),
      body: t("home.how.4.body", "Take the same verified record to a green loan application, a buyer or export request, or a carbon credit check."),
    },
  ];

  // What verified data unlocks for an MSME: the MRV-to-monetise path.
  const outcomes = [
    {
      icon: Landmark,
      who: t("home.unlock.loan.title", "Green loans"),
      line: t("home.unlock.loan.line", "Lenders can underwrite against figures tied to your own bills, not a self-declared number."),
      to: "/climate-finance",
      cta: t("home.unlock.loan.cta", "How lenders use it"),
    },
    {
      icon: Ship,
      who: t("home.unlock.buyer.title", "Buyer and export requests"),
      line: t("home.unlock.buyer.line", "Answer buyer questionnaires and EU CBAM data requests from one verified record."),
      to: "/climate-intelligence/eu-cbam-explained-emerging-market-exporters",
      cta: t("home.unlock.buyer.cta", "CBAM in 2026"),
    },
    {
      icon: Coins,
      who: t("home.unlock.credits.title", "Carbon credits"),
      line: t("home.unlock.credits.line", "Verified reductions that clear additionality can become credit-ready signals for buyers."),
      to: "/carbon-credits",
      cta: t("home.unlock.credits.cta", "How credits work"),
    },
  ];

  return (
    <div className="relative z-10 w-full">
      {/* The problem: first the request that brings an MSME here, then the answer. */}
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-20 sm:pt-28 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <AskCards />
        <div>
          <h2 className="text-[clamp(1.75rem,5vw,3.25rem)] font-semibold leading-[1.08] tracking-tight [text-wrap:balance]">
            {t("home.problem.title", "Your bills already hold your carbon data.")}
          </h2>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
            {t("home.problem.body", "Banks, buyers and carbon markets now ask small businesses for verified emissions. Senseible turns the invoices and energy bills you already keep into a verified record you can take to a green loan, a buyer or a carbon credit check.")}
          </p>
        </div>
      </section>

      {/* How it works, with the model */}
      <section aria-labelledby="how-title" className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-14 sm:pt-20">
        <h2 id="how-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {t("home.how.title", "From an invoice to finance-ready data")}
        </h2>
        <div className="mt-6">
          <FlowVisual />
        </div>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(s => (
            <li key={s.n} className="border-t border-foreground/80 pt-4">
              <p className="font-mono text-xs text-muted-foreground">{s.n}</p>
              <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Who it is for */}
      <section aria-labelledby="who-title" className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-8 sm:pt-16">
        <h2 id="who-title" className="text-[clamp(1.6rem,4vw,2.5rem)] font-semibold tracking-tight leading-tight">{t("home.unlock.title", "What verified data unlocks")}</h2>
        <OneRecordConnector />
        <div className="mt-2 md:mt-0 grid gap-4 md:grid-cols-3">
          {outcomes.map(a => (
            <Link key={a.who} to={a.to} className="group rounded-3xl border border-border p-5 sm:p-6 hover:border-foreground/40 transition-colors">
              <a.icon className="w-5 h-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold">{a.who}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a.line}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                {a.cta} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
        {/* The one place the enterprise use case appears on the homepage. */}
        <p className="mt-6 text-sm text-muted-foreground">
          {t("home.enterprise.pointer", "Sourcing from MSMEs? Automate supplier (Scope 3) emissions for your supply chain.")}{" "}
          <Link to="/enterprise" className="font-medium text-foreground underline underline-offset-4">
            {t("home.enterprise.link", "For enterprises")}
          </Link>
        </p>
      </section>

      {/* CBAM exposure */}
      <section aria-labelledby="cbam-title" className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-16 sm:pt-24">
        <h2 id="cbam-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {t("home.cbam.title", "Exporting to the EU? What CBAM costs your buyer")}
        </h2>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          {t("home.cbam.sub", "Since 1 January 2026, EU importers owe a certificate for each tonne of CO2 embedded in these goods, above a shrinking free allowance. Sending them your verified data is the cheapest way to cut that cost.")}
        </p>
        <div className="mt-6">
          <CbamExposure />
        </div>
      </section>

      {/* Act */}
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-16 sm:pt-24">
        <div className="rounded-3xl bg-primary text-primary-foreground p-6 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("home.act.title", "Start with one bill.")}</h2>
            <p className="mt-2 text-primary-foreground/85">{t("home.act.body", "Your first carbon report is free, with every evidence tied to the bill.")}</p>
          </div>
          <button onClick={onUpload} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-background text-foreground px-5 py-3 text-sm font-medium">
            <Upload className="w-4 h-4" /> {t("home.act.upload", "Upload a bill")}
          </button>
        </div>
      </section>

      <div className="pb-20 sm:pb-24" aria-hidden="true" />
    </div>
  );
};

/**
 * One verified record branching into the three uses below it. The lines draw
 * once as the section arrives (desktop, where the cards sit in a row).
 */
const OneRecordConnector = () => {
  const t = useT();
  const ref = useRef<SVGSVGElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const draw = (delay: number) => ({ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: `stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1) ${delay}ms` });
  return (
    <div className="hidden md:block relative mt-6" aria-hidden="true">
      <div className="mx-auto w-fit rounded-full border border-primary/40 bg-primary/[0.06] px-3 py-1 font-mono text-xs text-primary">{t("home.unlock.record", "1 verified record")}</div>
      <svg ref={ref} viewBox="0 0 300 36" preserveAspectRatio="none" className="block w-full h-10 text-primary/50">
        <path d="M150 0 C150 18, 50 14, 50 36" fill="none" stroke="currentColor" strokeWidth="1.2" pathLength={1} style={draw(0)} vectorEffect="non-scaling-stroke" />
        <path d="M150 0 L150 36" fill="none" stroke="currentColor" strokeWidth="1.2" pathLength={1} style={draw(120)} vectorEffect="non-scaling-stroke" />
        <path d="M150 0 C150 18, 250 14, 250 36" fill="none" stroke="currentColor" strokeWidth="1.2" pathLength={1} style={draw(240)} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
};

/**
 * Thumb-zone actions on phones, shown once the hero has scrolled away.
 */
export const StickyCta = ({ heroId, onUpload }: { heroId: string; onUpload: () => void }) => {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0.15 });
    io.observe(hero);
    return () => io.disconnect();
  }, [heroId]);

  return (
    <div
      className={`sm:hidden fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 bg-background/95 backdrop-blur border-t border-border transition-transform duration-300 ${show ? "translate-y-0" : "translate-y-full"}`}
      aria-hidden={!show}
    >
      <button tabIndex={show ? 0 : -1} onClick={onUpload} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground py-3 text-sm font-medium">
        <Upload className="w-4 h-4" /> {t("home.act.upload", "Upload a bill")}
      </button>
    </div>
  );
};
