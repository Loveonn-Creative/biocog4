import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import {
  CBAM_HUB_ANSWER, CBAM_HUB_META, CBAM_HUB_PATH, CBAM_PRICE, CBAM_SECTOR_COSTS, CBAM_YEARS, cbamAnswer, cbamFaqs, cbamSectorMeta, cbamSectorPath, findSectorCosts, SECTOR_OWNER_PAGE, sectorHref,
  type SectorCosts,
} from "@/data/cbamSectorCosts";
import { FREE_ALLOCATION_PCT } from "@/lib/cbamEngine";

// /cbam-cost and /cbam-cost/:sector. Same engine as /cbam-calculator.

const eur = (n: number) => `€${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** Drag through the years: each production route's bar grows as free allocation ends. */
function YearScrubber({ s }: { s: SectorCosts }) {
  const [year, setYear] = useState(2026);
  const max = Math.max(...s.routes.map((r) => r.perTonne[2034]), 1);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <label htmlFor="cbam-year" className="text-sm text-muted-foreground">Year</label>
        <span className="font-mono text-2xl font-semibold">{year}</span>
      </div>
      <input id="cbam-year" type="range" min={2026} max={2034} step={1} value={year} onChange={(e) => setYear(Number(e.target.value))} className="mt-2 w-full accent-primary" />
      <p className="mt-1 text-xs text-muted-foreground">{Math.round(FREE_ALLOCATION_PCT[year] * 100)}% of the EU benchmark still allocated free in {year}.</p>
      <ul className="mt-5 grid gap-3">
        {s.routes.map((r) => (
          <li key={r.routeId}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{r.routeName}</span>
              <span className="shrink-0 font-mono font-medium tabular-nums">{eur(r.perTonne[year])}/t</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(r.perTonne[year] / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Detail({ s }: { s: SectorCosts }) {
  const meta = cbamSectorMeta(s);
  const faqs = cbamFaqs(s);
  return (
    <>
      <SEOHead title={meta.title} description={meta.description} canonical={cbamSectorPath(s.sector.id)} faqSchema={faqs}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "CBAM cost by sector", url: CBAM_HUB_PATH }, { name: s.sector.name, url: cbamSectorPath(s.sector.id) }]} />
      <nav className="text-sm text-muted-foreground"><Link to={CBAM_HUB_PATH} className="hover:text-foreground">CBAM cost by sector</Link> / {s.sector.name}</nav>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">CBAM cost per tonne of {s.sector.name.toLowerCase()}, 2026 to 2034</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{cbamAnswer(s)}</p>

      <section className="mt-10"><YearScrubber s={s} /></section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Cost per tonne by year (€)</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-3 text-left font-medium">{s.sector.routeKind === "product" ? "Product" : "Route"}</th>{CBAM_YEARS.map((y) => <th key={y} className="px-3 py-3 font-medium">{y}</th>)}</tr>
            </thead>
            <tbody>
              {s.routes.map((r) => (
                <tr key={r.routeId} className="border-t border-border">
                  <td className="px-3 py-2 text-left">{r.routeName}<span className="block text-xs text-muted-foreground">{r.intensity} tCO2/t default</span></td>
                  {CBAM_YEARS.map((y) => <td key={y} className="px-3 py-2 font-mono tabular-nums">{r.perTonne[y].toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Assumptions: EU default values with the default-value mark-up{s.sector.routeKind === "product" ? " (India defaults by product, direct emissions only)" : ""}, certificate price held at {eur(CBAM_PRICE)} (Q3 2026), origin India with no carbon price paid at origin. Estimates, not a CBAM declaration.</p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Covered CN codes</h2>
        <ul className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          {s.sector.cnCodes.map((c) => <li key={c.code}><span className="font-mono">{c.code}</span> · {c.description}</li>)}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Questions</h2>
        <dl className="mt-4 grid gap-5">
          {faqs.map((q) => (<div key={q.question}><dt className="font-medium">{q.question}</dt><dd className="mt-1 text-muted-foreground">{q.answer}</dd></div>))}
        </dl>
      </section>

      <section className="mt-12 rounded-2xl bg-carbon p-6 text-carbon-foreground sm:p-8">
        <h2 className="text-xl font-medium">Work it out for your shipment</h2>
        <p className="mt-2 text-carbon-foreground/70">Enter your tonnage, route, origin and actual emissions if you have them.</p>
        <Link to="/cbam-calculator" className="mt-5 inline-flex items-center gap-2 rounded-full bg-background px-5 py-2.5 font-medium text-foreground">Open the CBAM calculator <ArrowRight className="h-4 w-4" /></Link>
      </section>

      <p className="mt-10 text-sm text-muted-foreground">Other sectors: {CBAM_SECTOR_COSTS.filter((o) => o.sector.id !== s.sector.id).map((o, i) => (
        <span key={o.sector.id}>{i > 0 && " · "}<Link to={sectorHref(o.sector.id)} className="underline">{o.sector.name}</Link></span>
      ))}</p>
    </>
  );
}

function Hub() {
  return (
    <>
      <SEOHead title={CBAM_HUB_META.title} description={CBAM_HUB_META.description} canonical={CBAM_HUB_PATH}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "CBAM cost by sector", url: CBAM_HUB_PATH }]} />
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">CBAM cost per tonne by sector</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{CBAM_HUB_ANSWER}</p>
      <div className="mt-10 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[520px] text-right text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3 text-left font-medium">Sector (default route)</th><th className="px-4 py-3 font-medium">2026</th><th className="px-4 py-3 font-medium">2030</th><th className="px-4 py-3 font-medium">2034</th></tr>
          </thead>
          <tbody>
            {CBAM_SECTOR_COSTS.map((s) => (
              <tr key={s.sector.id} className="border-t border-border">
                <td className="px-4 py-3 text-left"><Link to={sectorHref(s.sector.id)} className="font-medium text-primary hover:underline">{s.sector.name}</Link><span className="block text-xs text-muted-foreground">{s.headline.routeName}</span></td>
                {[2026, 2030, 2034].map((y) => <td key={y} className="px-4 py-3 font-mono tabular-nums">{eur(s.headline.perTonne[y])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">€ per tonne of product, EU default values, certificate price {eur(CBAM_PRICE)}, origin India. Related: <Link to="/cbam-calculator" className="underline">CBAM calculator</Link> · <Link to="/emission-factors" className="underline">Emission factors</Link></p>
    </>
  );
}

export default function CbamCost() {
  const { sector } = useParams();
  const s = sector ? findSectorCosts(sector) : undefined;
  if (sector && SECTOR_OWNER_PAGE[sector]) return <Navigate to={SECTOR_OWNER_PAGE[sector]} replace />;
  return (
    <div className="min-h-screen bg-background">
      <MinimalNav />
      <main className="container mx-auto max-w-4xl px-4 py-24 sm:px-6 sm:py-28">
        {sector && !s ? (
          <p>That sector is not covered here. <Link to={CBAM_HUB_PATH} className="underline">See all CBAM sectors</Link>.</p>
        ) : s ? <Detail s={s} /> : <Hub />}
      </main>
      <Footer />
    </div>
  );
}
