import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import {
  FACTOR_HUB_ANSWER, FACTOR_HUB_META, FACTOR_HUB_PATH, FACTOR_PAGES, factorAnswer, factorFaqs, factorKg, factorMeta, factorPath, findFactor,
  type FactorPage,
} from "@/data/factorLibrary";

// /emission-factors and /emission-factors/:slug. Numbers come from the live
// factor table, so the page and the invoice pipeline always agree.

const fmt = (n: number, dp = 2) => n.toLocaleString("en-IN", { maximumFractionDigits: dp });

/** A count-up that eases to the new value; jumps straight there with reduced motion. */
function useCountUp(target: number) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setShown(target); return; }
    const start = performance.now(), a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 450);
      const v = a + (target - a) * (1 - Math.pow(1 - k, 3));
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
}

/** One invoice line: edit the quantity and the CO2 counts up beside it. */
function InvoiceLine({ f }: { f: FactorPage }) {
  const [qty, setQty] = useState(String(f.exampleQty));
  const n = Number(qty.replace(/,/g, ""));
  const kg = Number.isFinite(n) && n > 0 ? factorKg(f, n) : 0;
  const shown = useCountUp(kg);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-xs uppercase tracking-wider text-muted-foreground sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_minmax(0,1fr)]">
        <span>Item (HSN {f.hsn})</span><span className="text-right sm:text-left">Quantity</span>
        <span className="hidden sm:block">×</span><span className="hidden text-right sm:block">kg CO2</span>
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_minmax(0,1fr)]">
        <span className="truncate font-medium">{f.name}</span>
        <label className="flex items-center justify-end gap-2 sm:justify-start">
          <input aria-label={`Quantity in ${f.unitPlural}`} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)}
            className="w-24 rounded-md border border-dashed border-primary/50 bg-background px-2 py-1 text-right font-mono text-sm" />
          <span className="text-sm text-muted-foreground">{f.unitPlural}</span>
        </label>
        <span className="hidden font-mono text-sm text-muted-foreground sm:block">{f.value}</span>
        <span className="col-span-2 text-right font-mono text-2xl font-semibold text-primary tabular-nums sm:col-span-1" aria-live="polite">{fmt(shown)}</span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{fmt(kg / 1000, 3)} tonnes CO2 · Scope {f.scope}. Change the quantity to match your invoice.</p>
    </div>
  );
}

function Detail({ f }: { f: FactorPage }) {
  const meta = factorMeta(f);
  const faqs = factorFaqs(f);
  const others = FACTOR_PAGES.filter((o) => o.slug !== f.slug);
  return (
    <>
      <SEOHead title={meta.title} description={meta.description} canonical={factorPath(f.slug)} faqSchema={faqs}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Emission factors", url: FACTOR_HUB_PATH }, { name: f.name, url: factorPath(f.slug) }]} />
      <nav className="text-sm text-muted-foreground"><Link to={FACTOR_HUB_PATH} className="hover:text-foreground">Emission factors</Link> / {f.name}</nav>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{f.name} emission factor (India): {f.value} kg CO2 per {f.unit}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{factorAnswer(f)}</p>

      <section className="mt-10"><InvoiceLine f={f} /></section>

      <section className="mt-12 grid gap-x-10 gap-y-3 sm:grid-cols-2">
        {[
          ["Factor", `${f.value} kg CO2 per ${f.unit}`],
          ["Scope", f.scope === 1 ? "Scope 1 (fuel burned on site or in owned vehicles)" : "Scope 2 (purchased electricity, location-based)"],
          ["HSN heading", `${f.hsn} · ${f.hsnLabel}`],
          ["On invoices as", f.invoiceTerms],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 border-b border-border pb-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{k}</span><span>{v}</span>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">How the factor is derived</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">{f.basis}</p>
        {f.caveat && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{f.caveat}</p>}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Questions</h2>
        <dl className="mt-4 grid gap-5">
          {faqs.map((q) => (<div key={q.question}><dt className="font-medium">{q.question}</dt><dd className="mt-1 text-muted-foreground">{q.answer}</dd></div>))}
        </dl>
      </section>

      <section className="mt-12 rounded-2xl bg-carbon p-6 text-carbon-foreground sm:p-8">
        <h2 className="text-xl font-medium">Have the invoice?</h2>
        <p className="mt-2 text-carbon-foreground/70">Upload it and Senseible reads the quantity, applies this factor and keeps the source with the number.</p>
        <Link to="/" className="mt-5 inline-flex items-center gap-2 rounded-full bg-background px-5 py-2.5 font-medium text-foreground">Upload an invoice <ArrowRight className="h-4 w-4" /></Link>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Other factors</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {others.map((o) => <li key={o.slug}><Link to={factorPath(o.slug)} className="inline-block rounded-full border border-border px-3 py-1 text-sm hover:border-foreground/40">{o.name}</Link></li>)}
        </ul>
      </section>
    </>
  );
}

function Hub() {
  return (
    <>
      <SEOHead title={FACTOR_HUB_META.title} description={FACTOR_HUB_META.description} canonical={FACTOR_HUB_PATH}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Emission factors", url: FACTOR_HUB_PATH }]} />
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Emission factors for Indian invoices</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{FACTOR_HUB_ANSWER}</p>
      <div className="mt-10 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3 font-medium">Fuel or energy</th><th className="px-4 py-3 font-medium">Factor</th><th className="hidden px-4 py-3 font-medium sm:table-cell">HSN</th><th className="hidden px-4 py-3 font-medium sm:table-cell">Scope</th></tr>
          </thead>
          <tbody>
            {FACTOR_PAGES.map((f) => (
              <tr key={f.slug} className="border-t border-border">
                <td className="px-4 py-3"><Link to={factorPath(f.slug)} className="font-medium text-primary hover:underline">{f.name}</Link></td>
                <td className="px-4 py-3 font-mono">{f.value} kg/{f.unit}</td>
                <td className="hidden px-4 py-3 sm:table-cell">{f.hsn}</td>
                <td className="hidden px-4 py-3 sm:table-cell">{f.scope}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">Related: <Link to="/cbam-cost" className="underline">CBAM cost per tonne by sector</Link> · <Link to="/calculators" className="underline">All calculators</Link></p>
    </>
  );
}

export default function EmissionFactors() {
  const { slug } = useParams();
  const f = slug ? findFactor(slug) : undefined;
  return (
    <div className="min-h-screen bg-background">
      <MinimalNav />
      <main className="container mx-auto max-w-4xl px-4 py-24 sm:px-6 sm:py-28">
        {slug && !f ? (
          <p>That factor is not in the library. <Link to={FACTOR_HUB_PATH} className="underline">See all emission factors</Link>.</p>
        ) : f ? <Detail f={f} /> : <Hub />}
      </main>
      <Footer />
    </div>
  );
}
