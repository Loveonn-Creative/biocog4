import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Factory, Ship, Building2, Upload, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import { FlowVisual } from "./FlowVisual";
import { CbamExposure } from "./CbamExposure";

/**
 * The homepage story below the first viewport: the visitor's problem, how a
 * bill becomes verified data, who it serves, what CBAM costs, and a
 * disambiguation line. Loaded lazily so it never weighs on first paint.
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
      body: t("home.how.4.body", "Send the same verified record to an EU buyer, a CBAM data request, a BRSR customer or a green loan application."),
    },
  ];

  const audiences = [
    {
      icon: Factory,
      who: t("home.who.msme.who", "MSME owners"),
      line: t("home.who.msme.line", "Answer buyer and bank questions from the bills you already keep. No consultant, no spreadsheet."),
      to: "/calculators",
      cta: t("home.who.msme.cta", "Free calculators"),
    },
    {
      icon: Ship,
      who: t("home.who.exporter.who", "Exporters"),
      line: t("home.who.exporter.line", "Give EU buyers verified emissions per tonne, so they do not fall back on default values with a mark-up."),
      to: "/climate-intelligence/eu-cbam-explained-emerging-market-exporters",
      cta: t("home.who.exporter.cta", "CBAM in 2026"),
    },
    {
      icon: Building2,
      who: t("home.who.buyer.who", "EU buyers and enterprises"),
      line: t("home.who.buyer.line", "Collect supplier emissions you can trace back to source documents, with factors and versions attached."),
      to: "/trust",
      cta: t("home.who.buyer.cta", "How verification works"),
    },
  ];

  return (
    <div className="relative z-10 w-full">
      {/* The problem, in the visitor's words */}
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-16 sm:pt-24">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{t("home.problem.eyebrow", "The problem")}</p>
        <h2 className="mt-3 text-[clamp(1.75rem,5vw,3.25rem)] font-semibold leading-[1.08] tracking-tight max-w-3xl">
          {t("home.problem.title", "Your buyer wants your carbon numbers. Your numbers are sitting in a folder of bills.")}
        </h2>
        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl">
          {t("home.problem.body", "EU importers now pay CBAM on steel, aluminium, cement and fertilisers, brands ask suppliers for Scope 1 and 2, and lenders ask for baselines. Senseible turns the documents you already have into figures each of them can check.")}
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
        <h2 id="who-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("home.who.title", "Who uses it")}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {audiences.map(a => (
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
      </section>

      {/* CBAM exposure */}
      <section aria-labelledby="cbam-title" className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-16 sm:pt-24">
        <h2 id="cbam-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {t("home.cbam.title", "What CBAM costs your EU buyer")}
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
            <p className="mt-2 text-background/70">{t("home.act.body", "Free to start. Every figure shows its emission factor and source.")}</p>
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

      {/* Disambiguation */}
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-12 pb-20 sm:pb-24">
        <p className="text-sm text-muted-foreground max-w-2xl">
          <strong className="text-foreground">{t("home.notsensibull.title", "Senseible is not Sensibull.")}</strong>{" "}
          {t("home.notsensibull.body", "Senseible (senseible.earth) is a carbon accounting platform; Sensibull is an unrelated options-trading app.")}{" "}
          <Link to="/vs/sensibull" className="underline underline-offset-2">{t("home.notsensibull.link", "The difference")}</Link>
        </p>
      </section>
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
