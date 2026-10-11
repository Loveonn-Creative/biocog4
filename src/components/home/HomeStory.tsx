import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Landmark, Ship, Coins, Upload, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import { FlowVisual } from "./FlowVisual";
import { CbamExposure } from "./CbamExposure";

/**
 * The homepage story below the first viewport. The homepage speaks to one
 * audience: MSMEs turning their own documents into verified data they can
 * monetise (green loans, buyer and export requests, carbon credits). The
 * enterprise use case (supplier / Scope 3 automation) gets a single pointer
 * here and lives on its own pages. Loaded lazily so it never weighs on first paint.
 */
export const HomeStory = ({ onUpload, onSample }: { onUpload: () => void; onSample: () => void }) => {
  const t = useT();

  const steps = [
    {
      n: "01",
      title: t("home.how.1.title", "Capture"),
      body: t("home.how.1.body", "Upload an electricity bill, fuel slip or invoice, or take a photo. Each line item is read and classified to Scope 1, 2 or 3."),
    },
    {
      n: "02",
      title: t("home.how.2.title", "Multiply"),
      body: t("home.how.2.body", "Every line is multiplied by a published emission factor. One kWh of Indian grid power is 0.710 kgCO2 (CEA CO2 Baseline Database v21.0)."),
    },
    {
      n: "03",
      title: t("home.how.3.title", "Verify"),
      body: t("home.how.3.body", "Each document is hashed so it cannot be counted twice. More evidence narrows the uncertainty band, roughly with the square root of the number of records."),
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
      {/* The problem, in the visitor's words */}
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-16 sm:pt-24">
        <h2 className="text-[clamp(1.75rem,5vw,3.25rem)] font-semibold leading-[1.08] tracking-tight max-w-3xl [text-wrap:balance]">
          {t("home.problem.title", "Your bills already hold your carbon data.")}
        </h2>
        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl">
          {t("home.problem.body", "Banks, buyers and carbon markets now ask small businesses for verified emissions. Senseible turns the invoices and energy bills you already keep into a verified record you can take to a green loan, a buyer or a carbon credit check.")}
        </p>
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
      <section aria-labelledby="who-title" className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-16 sm:pt-24">
        <h2 id="who-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("home.unlock.title", "What verified data unlocks")}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
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
          {t("home.cbam.sub", "Since 1 January 2026, EU importers owe a certificate for each tonne of CO2 embedded in these goods, above a shrinking free allowance. Verified data from you is the cheapest way down.")}
        </p>
        <div className="mt-6">
          <CbamExposure />
        </div>
      </section>

      {/* Act */}
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-16 sm:pt-24">
        <div className="rounded-3xl bg-foreground text-background p-6 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("home.act.title", "Start with one bill.")}</h2>
            <p className="mt-2 text-background/70">{t("home.act.body", "Free audit-ready carbon report from your first bill.")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={onUpload} className="inline-flex items-center justify-center gap-2 rounded-full bg-background text-foreground px-5 py-3 text-sm font-medium">
              <Upload className="w-4 h-4" /> {t("home.act.upload", "Upload a bill")}
            </button>
            <button onClick={onSample} className="inline-flex items-center justify-center gap-2 rounded-full border border-background/30 px-5 py-3 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> {t("home.act.sample", "Try a sample invoice")}
            </button>
          </div>
        </div>
      </section>

      <div className="pb-20 sm:pb-24" aria-hidden="true" />
    </div>
  );
};

/**
 * Thumb-zone actions on phones, shown once the hero has scrolled away.
 */
export const StickyCta = ({ heroId, onUpload, onSample }: { heroId: string; onUpload: () => void; onSample: () => void }) => {
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
      <div className="flex gap-2">
        <button tabIndex={show ? 0 : -1} onClick={onUpload} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground py-3 text-sm font-medium">
          <Upload className="w-4 h-4" /> {t("home.act.upload", "Upload a bill")}
        </button>
        <button tabIndex={show ? 0 : -1} onClick={onSample} className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-sm font-medium">
          <Sparkles className="w-4 h-4" /> {t("home.act.sample_short", "Sample")}
        </button>
      </div>
    </div>
  );
};
