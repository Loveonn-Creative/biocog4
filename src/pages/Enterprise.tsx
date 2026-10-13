import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Download, Lock, Check } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { useT } from "@/lib/i18n/useT";
import { loadSupabase } from "@/integrations/supabase/lazyClient";
import { toast } from "sonner";
import { SupplyGraphVisual } from "@/components/enterprise/SupplyGraphVisual";
import { RecordTransform } from "@/components/enterprise/RecordTransform";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import { SectionNav } from "@/components/enterprise/suite/SectionNav";
import { DataToDecision } from "@/components/enterprise/suite/DataToDecision";
import {
  WhenNear, scrollToSection, LazySuiteDashboard, LazyOneClickCollect, LazySignalFeed,
  LazyLiabilityToProfit, LazyBiocogMind, LazyStandardsPrism, LazyBenchmarkProof,
} from "@/components/enterprise/suite/lazy";
import {
  ingestionChannels, scaleControls, controlAndSecurity, outputs,
  supplierCountOptions, type Capability,
} from "@/data/enterpriseCapabilities";

const TEMPLATE_URL = "/templates/supplier-list-template.csv";

const NAV_GROUPS = [
  { id: "suite", label: "Suite", sections: ["ent-d2d", "ent-suite"] },
  { id: "scope3", label: "Scope 3", sections: ["ent-agents", "ent-signals", "ent-scale"] },
  { id: "decide", label: "Decisions", sections: ["ent-profit", "ent-mind"] },
  { id: "standards", label: "Standards", sections: ["ent-standards"] },
  { id: "proof", label: "Proof and trust", sections: ["ent-proof", "ent-control", "ent-audit", "ent-integrate"] },
];

// What an enquiry is about. Section buttons pre-select one, so the reply
// starts from what the visitor was looking at.
const INTERESTS = [
  "Scope 3 and supplier emissions", "Product carbon footprint (PCF)", "Life cycle assessment (LCA)",
  "Decarbonisation strategy to net zero", "Double materiality assessment", "Audit-ready reporting",
  "Sensors, satellite and live feeds", "CBAM exposure",
];

/** A capability line with its honest status. */
const CapabilityList = ({ items, prefix }: { items: Capability[]; prefix: string }) => {
  const t = useT();
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map(c => (
        <li key={c.key} className="flex items-start justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="text-sm sm:text-base">{t(`${prefix}.${c.key}`, c.label)}</p>
            {c.note && <p className="text-xs text-muted-foreground mt-0.5">{t(`${prefix}.${c.key}.note`, c.note)}</p>}
          </div>
          <StatusBadge status={c.status} />
        </li>
      ))}
    </ul>
  );
};

/** One idea per screen. */
const Beat = ({ id, n, title, line, children }: { id: string; n: string; title: string; line?: string; children: React.ReactNode }) => (
  <section id={id} aria-labelledby={`${id}-title`} className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-16 sm:py-24 scroll-mt-16">
    <p className="font-mono text-xs text-muted-foreground">{n}</p>
    <h2 id={`${id}-title`} className="mt-2 text-[clamp(1.6rem,4.5vw,2.75rem)] font-semibold leading-[1.1] tracking-tight max-w-3xl [text-wrap:balance]">{title}</h2>
    {line && <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl">{line}</p>}
    <div className="mt-8 sm:mt-10">{children}</div>
  </section>
);

/** Illustrative spend curve: a few suppliers carry most spend; the long tail starts on estimates. */
const TierCurve = () => {
  const t = useT();
  const pts = Array.from({ length: 41 }, (_, i) => {
    const x = i / 40;
    const y = 1 - Math.pow(1 - x, 4.2);
    return `${8 + x * 284},${152 - y * 136}`;
  }).join(" ");
  return (
    <figure className="rounded-3xl border border-border p-4 sm:p-6">
      <svg viewBox="0 0 300 170" className="w-full h-auto" role="img" aria-label={t("ent.tier.aria", "Illustration: cumulative spend rises steeply across the first suppliers, then flattens across the long tail")}>
        <rect x="8" y="16" width="60" height="136" fill="hsl(var(--primary))" opacity="0.08" />
        <rect x="68" y="16" width="224" height="136" fill="hsl(var(--warning))" opacity="0.06" />
        <polyline points={pts} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.6" />
        <line x1="68" y1="16" x2="68" y2="152" stroke="hsl(var(--foreground))" strokeDasharray="3 3" opacity="0.5" />
        <line x1="8" y1="152" x2="292" y2="152" stroke="hsl(var(--border))" />
      </svg>
      <figcaption className="mt-3 grid grid-cols-2 gap-3 text-xs sm:text-sm">
        <div><p className="font-medium">{t("ent.tier.top", "Top spend")}</p><p className="text-muted-foreground">{t("ent.tier.top.line", "Primary data and documents")}</p></div>
        <div><p className="font-medium">{t("ent.tier.tail", "Long tail")}</p><p className="text-muted-foreground">{t("ent.tier.tail.line", "Spend-based estimates, upgraded over time")}</p></div>
        <p className="col-span-2 text-[11px] text-muted-foreground">{t("ent.tier.note", "Illustration, not customer data.")}</p>
      </figcaption>
    </figure>
  );
};

const Enterprise = () => {
  const t = useT();
  const [example, setExample] = useState(0);
  const [form, setForm] = useState({ email: "", company: "", suppliers: "", stack: "" });
  const [interests, setInterests] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showSticky, setShowSticky] = useState(false);

  const onSelect = useCallback((i: number) => setExample(i), []);

  useEffect(() => {
    const hero = document.getElementById("ent-hero");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting), { threshold: 0.1 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  const toForm = () => void scrollToSection("ent-talk");
  /** From a section's "plan this with us": pre-select the topic, then go to the form. */
  const ask = useCallback((interest: string) => {
    setInterests(prev => (prev.includes(interest) ? prev : [...prev, interest]));
    void scrollToSection("ent-talk");
  }, []);
  const toggleInterest = (i: string) => setInterests(prev => (prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = form.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !form.company.trim() || !form.suppliers) {
      toast.error(t("ent.form.invalid", "Add a work email, company and supplier count."));
      return;
    }
    setSending(true);
    try {
      const supabase = await loadSupabase();
      // Existing contact path; enterprise details travel in the message, no new tables.
      const { data, error } = await supabase.functions.invoke("send-contact-notification", {
        body: {
          name: form.company.trim().slice(0, 120),
          email: email.slice(0, 254),
          company: form.company.trim().slice(0, 160),
          category: "enterprise",
          message: [
            "Enterprise enquiry from /enterprise",
            `Suppliers: ${form.suppliers}`,
            `Interested in: ${interests.length ? interests.join(", ") : "not given"}`,
            form.stack.trim() ? `Stack: ${form.stack.trim().slice(0, 1500)}` : "Stack: not given",
          ].join("\n"),
          newsletter: false,
        },
      });
      if (error || !data?.success) throw error || new Error("not accepted");
      setSent(true);
    } catch {
      toast.error(t("ent.form.error", "That did not send. Please try again or email impact@senseible.earth."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ent-anim min-h-screen bg-background text-foreground">
      <SEOHead title="" description="" canonical="/enterprise" />
      <MinimalNav />
      <SectionNav groups={NAV_GROUPS} visible={showSticky} onTalk={toForm} />

      {/* Hero: the room, quiet */}
      <header id="ent-hero" className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-24 sm:pt-28 pb-8 grid gap-10 md:grid-cols-[1.05fr_1fr] md:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{t("ent.hero.eyebrow", "For enterprises")}</p>
          <h1 className="mt-3 text-[clamp(2rem,6vw,3.75rem)] font-semibold leading-[1.04] tracking-tight [text-wrap:balance]">
            {t("ent.hero.title", "Supplier emissions, without the chasing.")}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl">
            {t("ent.hero.line", "Agents collect what your suppliers already have and turn it into Scope 3 records you can audit.")}
          </p>
          <p className="mt-4 text-sm text-muted-foreground max-w-xl">
            {t("ent.hero.status", "Live today: documents to verified records. Custom: integrations and supplier-network features built to your requirements. Every capability on this page is labelled.")}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <button onClick={toForm} className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background px-6 py-3 text-sm font-medium">
              {t("ent.cta.talk", "Talk to us about your suppliers")} <ArrowRight className="w-4 h-4" />
            </button>
            <a href={TEMPLATE_URL} download className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-secondary">
              <Download className="w-4 h-4" /> {t("ent.cta.template", "Supplier list template")}
            </a>
          </div>
        </div>
        <SupplyGraphVisual onSelect={onSelect} />
      </header>

      {/* 01 Scattered data to one decision: scroll-driven assembly */}
      <Beat id="ent-d2d" n="01" title={t("ent.d2d.title", "Unstructured data in. The simplest next decision out.")} line={t("ent.d2d.line", "Supply chains and enterprise systems produce data in every shape. Senseible turns it into one ledger you can act on.")}>
        <DataToDecision />
      </Beat>

      {/* 02 The full suite: a working dashboard */}
      <Beat id="ent-suite" n="02" title={t("ent.suite.title", "The full suite, on one verified ledger")} line={t("ent.suite.line", "Product footprints, life cycle studies, net-zero strategy, double materiality, Scope 3 and reporting. Pick a module to see what goes in and what comes out.")}>
        <WhenNear minH={420}><LazySuiteDashboard onAsk={ask} /></WhenNear>
      </Beat>

      {/* 03 Scope 3: one click from collection to audit-ready */}
      <Beat id="ent-agents" n="03" title={t("ent.b1.title2", "Custom-built for Scope 3: one click from collection to audit-ready")} line={t("ent.b1.line2", "Press run to watch a supplier wave move through each stage. Then tap a supplier in the network above, or pick an input below, to see the record it becomes.")}>
        <WhenNear minH={460}><LazyOneClickCollect onAsk={ask} /></WhenNear>
        <div className="mt-10"><RecordTransform index={example} onChange={setExample} /></div>
      </Beat>

      {/* 04 Agents, sensors, satellite and live feeds */}
      <Beat id="ent-signals" n="04" title={t("ent.feed.h", "Agents, sensors, satellite and a live feed")} line={t("ent.feed.line", "Most suppliers start from documents and estimates; sensors upgrade the data later. Switch channels to see what each adds.")}>
        <WhenNear minH={640}><LazySignalFeed /></WhenNear>
      </Beat>

      {/* Beat 2: scale without breaking */}
      <Beat id="ent-scale" n="05" title={t("ent.b2.title", "A thousand suppliers, one queue for humans")} line={t("ent.b2.line", "Primary data where the spend is. Estimates for the long tail. People only see what the checks flag.")}>
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <TierCurve />
          <CapabilityList items={scaleControls} prefix="ent.scale" />
        </div>
      </Beat>

      {/* 06 Liability to decision to profit: CBAM engine */}
      <Beat id="ent-profit" n="06" title={t("ent.liab.title", "Emissions, from liability to decision to profit")} line={t("ent.liab.line", "The same steel, priced at EU default values and at what your verified data shows. Move the sliders.")}>
        <WhenNear minH={460}><LazyLiabilityToProfit /></WhenNear>
      </Beat>

      {/* 07 Biocog superintelligence */}
      <Beat id="ent-mind" n="07" title={t("ent.mind.title", "Biocog superintelligence")} line={t("ent.mind.line", "Biocog reads the scope ledger as the single source of truth and answers from it. Ask a question.")}>
        <WhenNear minH={420}><LazyBiocogMind /></WhenNear>
      </Beat>

      {/* 08 Standards prism */}
      <Beat id="ent-standards" n="08" title={t("ent.std.title", "Comply with the world's top standards, from one record")} line={t("ent.std.line", "Each framework gets its own disclosure structure from the same verified data. Pick one to see what the record fills.")}>
        <WhenNear minH={520}><LazyStandardsPrism /></WhenNear>
      </Beat>

      {/* 09 Proof */}
      <Beat id="ent-proof" n="09" title={t("ent.bench.title", "A breakthrough in supplier emissions")}>
        <WhenNear minH={400}><LazyBenchmarkProof /></WhenNear>
      </Beat>

      {/* Beat 3: suppliers stay in control */}
      <Beat id="ent-control" n="10" title={t("ent.b3.title", "The supplier keeps its data")} line={t("ent.b3.line", "Figures and proof travel to the buyer. Invoices stay with the supplier.")}>
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="rounded-3xl border border-border p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4" aria-hidden="true" />
              <p className="text-sm font-medium">{t("ent.b3.record", "Supplier record")}</p>
              <StatusBadge status="custom" />
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                { buyer: t("ent.b3.buyerA", "Buyer A"), on: true },
                { buyer: t("ent.b3.buyerB", "Buyer B"), on: false },
              ].map(b => (
                <li key={b.buyer} className="flex items-center justify-between rounded-2xl bg-secondary/50 px-4 py-3">
                  <span>{b.buyer}</span>
                  <span className={`inline-flex items-center gap-2 text-xs ${b.on ? "text-primary" : "text-muted-foreground"}`}>
                    <span className={`h-4 w-7 rounded-full p-0.5 ${b.on ? "bg-primary" : "bg-border"}`} aria-hidden="true">
                      <span className={`block h-3 w-3 rounded-full bg-background transition-transform ${b.on ? "translate-x-3" : ""}`} />
                    </span>
                    {b.on ? t("ent.b3.shared", "Figures and hashes shared") : t("ent.b3.notshared", "Not shared")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <CapabilityList items={controlAndSecurity} prefix="ent.sec" />
            <p className="mt-4 text-sm text-muted-foreground">
              {t("ent.b3.nocert", "No third-party security certification is claimed.")}{" "}
              <Link to="/trust" className="underline underline-offset-4 text-foreground">{t("ent.b3.trust", "Security detail")}</Link>
            </p>
          </div>
        </div>
      </Beat>

      {/* Beat 4: audit-ready output */}
      <Beat id="ent-audit" n="11" title={t("ent.b4.title", "Every number has a trail")} line={t("ent.b4.line", "Open any figure and walk back to the document it came from.")}>
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <ol className="relative border-l border-foreground/20 pl-5 space-y-5">
            {[
              { k: t("ent.trail.figure", "Reported figure"), v: "2,982 kgCO2e", s: "live" as const },
              { k: t("ent.trail.document", "Source document"), v: "sha256 9f2c…a71e", s: "live" as const },
              { k: t("ent.trail.factor", "Factor"), v: "0.710 kgCO2/kWh, CEA v21.0", s: "live" as const },
              { k: t("ent.trail.method", "Method version"), v: "BIOCOG_MVR_INDIA_v1.0", s: "live" as const },
              { k: t("ent.trail.confidence", "Confidence"), v: "0.95 (CONF_v1.0)", s: "live" as const },
              { k: t("ent.trail.reviewer", "Reviewer"), v: t("ent.trail.reviewer.v", "Named sign-off"), s: "custom" as const },
            ].map(row => (
              <li key={row.k} className="relative">
                <span className="absolute -left-[1.42rem] top-1.5 h-2.5 w-2.5 rounded-full border border-foreground bg-background" aria-hidden="true" />
                <div className="flex items-center gap-2"><p className="text-xs text-muted-foreground">{row.k}</p><StatusBadge status={row.s} /></div>
                <p className="font-mono text-sm mt-0.5 break-all">{row.v}</p>
              </li>
            ))}
          </ol>
          <CapabilityList items={outputs} prefix="ent.out" />
        </div>
      </Beat>

      {/* Beat 5: custom integrations */}
      <Beat id="ent-integrate" n="12" title={t("ent.b5.title", "Fits your stack")} line={t("ent.b5.line", "The API is being designed with the first enterprise teams. This is the shape we are working towards.")}>
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <div className="rounded-3xl bg-foreground text-background p-5 overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-background/60">{t("ent.api.preview", "API preview")}</span>
              <span className="rounded-full border border-background/30 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-background/70">{t("ent.status.custom", "Custom")}</span>
            </div>
            <pre className="font-mono text-[11px] sm:text-xs leading-relaxed whitespace-pre">{`POST /v1/suppliers/{id}/documents
→ 202 { "record_id": "rec_…" }

webhook  record.verified
{
  "supplier_id": "sup_…",
  "scope": 2,
  "co2e_kg": 2982,
  "confidence": 0.95,
  "source_sha256": "9f2c…a71e",
  "method": "BIOCOG_MVR_INDIA_v1.0"
}`}</pre>
          </div>
          <div>
            <CapabilityList items={ingestionChannels.filter(c => ["erp", "sftp", "csv", "api", "iot"].includes(c.key))} prefix="ent.in" />
            <p className="mt-4 text-sm text-muted-foreground">{t("ent.b5.stack", "Tell us what you run in the form below. It decides what we build next.")}</p>
          </div>
        </div>
      </Beat>

      {/* Talk */}
      <section id="ent-talk" aria-labelledby="ent-talk-title" className="mx-auto w-full max-w-5xl px-4 sm:px-6 pb-28 sm:pb-24 scroll-mt-16">
        <div className="rounded-3xl border border-border p-5 sm:p-10 grid gap-8 md:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 id="ent-talk-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("ent.talk.title", "Start with your supplier list")}</h2>
            <p className="mt-3 text-muted-foreground">{t("ent.talk.line", "Send three details. We reply with how your first wave of suppliers would run.")}</p>
            <div className="mt-6 flex flex-col gap-3 text-sm">
              <a href={TEMPLATE_URL} download className="inline-flex items-center gap-2 font-medium underline underline-offset-4"><Download className="w-4 h-4" />{t("ent.cta.template", "Supplier list template")}</a>
              <Link to="/calculators/supplier-emissions-risk" className="inline-flex items-center gap-2 underline underline-offset-4">{t("ent.talk.calc", "Score suppliers now with the free calculator")}</Link>
              <Link to="/pricing" className="inline-flex items-center gap-2 underline underline-offset-4">{t("ent.talk.pricing", "Plans and pricing")}</Link>
            </div>
          </div>
          {sent ? (
            <div className="flex flex-col items-start justify-center gap-3" role="status">
              <Check className="w-6 h-6 text-primary" aria-hidden="true" />
              <p className="text-lg font-medium">{t("ent.form.sent", "Received. We will reply from impact@senseible.earth.")}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4" noValidate>
              <label className="grid gap-1.5 text-sm">
                <span>{t("ent.form.email", "Work email")}</span>
                <input type="email" required autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-11 rounded-xl border border-input bg-background px-3" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span>{t("ent.form.company", "Company")}</span>
                <input required autoComplete="organization" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="h-11 rounded-xl border border-input bg-background px-3" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span>{t("ent.form.suppliers", "Number of suppliers")}</span>
                <select required value={form.suppliers} onChange={e => setForm({ ...form, suppliers: e.target.value })} className="h-11 rounded-xl border border-input bg-background px-3">
                  <option value="" disabled>{t("ent.form.choose", "Choose")}</option>
                  {supplierCountOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <fieldset className="grid gap-2 text-sm">
                <legend className="mb-1.5">{t("ent.form.interest", "What are you exploring? (optional)")}</legend>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(i => {
                    const on = interests.includes(i);
                    return (
                      <button key={i} type="button" aria-pressed={on} onClick={() => toggleInterest(i)}
                        className={`rounded-full px-3 py-1.5 text-xs transition-colors ${on ? "bg-foreground text-background" : "border border-border hover:bg-secondary"}`}>
                        {t(`ent.interest.${INTERESTS.indexOf(i)}`, i)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <label className="grid gap-1.5 text-sm">
                <span>{t("ent.form.stack", "Your stack (optional)")}</span>
                <textarea rows={2} value={form.stack} onChange={e => setForm({ ...form, stack: e.target.value })} placeholder={t("ent.form.stack.ph", "e.g. SAP, Coupa, SharePoint")} className="rounded-xl border border-input bg-background px-3 py-2" />
              </label>
              <button type="submit" disabled={sending} className="h-11 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-60">
                {sending ? t("ent.form.sending", "Sending") : t("ent.form.submit", "Send")}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Thumb-zone action on phones */}
      <div className={`sm:hidden fixed inset-x-0 bottom-0 z-40 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-background/95 backdrop-blur border-t border-border transition-transform duration-300 ${showSticky ? "translate-y-0" : "translate-y-full"}`} aria-hidden={!showSticky}>
        <button tabIndex={showSticky ? 0 : -1} onClick={toForm} className="w-full rounded-full bg-foreground text-background py-3 text-sm font-medium">
          {t("ent.cta.talk", "Talk to us about your suppliers")}
        </button>
      </div>

      <Footer />
    </div>
  );
};

export default Enterprise;
