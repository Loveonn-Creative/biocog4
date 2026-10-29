import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, Ship } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { STATIC_PAGE_META } from "@/lib/seo/seoMeta";
import { calculateCBAM, CBAM_SECTORS, DEFAULT_EU_ETS_PRICE } from "@/lib/cbamEngine";
import { CBAM_INDIA_FAQS, CBAM_INDIA_PATH, CBAM_MILESTONES, CBAM_PRODUCTS, DATA_SOURCES, VERIFIER_CHECKS, type CbamProduct } from "@/data/cbamIndia";
import { sectorHref } from "@/data/cbamSectorCosts";
import { CbamTalkButton } from "@/components/cbam/CbamTalk";
import "./cbamIndia.css";

// /cbam. For Indian steel and aluminium exporters whose EU buyers now ask for
// plant emissions data. Every euro on the page comes from the official engine.

const eur = (n: number) => `€${Math.round(n).toLocaleString("en-GB")}`;
const t2 = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

function useCosts(p: CbamProduct, tonnes: number, own: number) {
  return useMemo(() => {
    const base = { sectorId: p.sectorId, productionRouteId: p.routeId, countryCode: "IN", supplierName: "", tonnage: tonnes, carbonPricePaid: null, euEtsPrice: DEFAULT_EU_ETS_PRICE };
    const def = calculateCBAM({ ...base, actualEmissionsIntensity: null });
    const act = calculateCBAM({ ...base, actualEmissionsIntensity: own });
    return { def, act };
  }, [p, tonnes, own]);
}

const prefersReduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function CbamIndia() {
  const meta = STATIC_PAGE_META[CBAM_INDIA_PATH];
  const [pid, setPid] = useState(CBAM_PRODUCTS[0].id);
  const product = CBAM_PRODUCTS.find((p) => p.id === pid) ?? CBAM_PRODUCTS[0];
  const defaultValue = CBAM_SECTORS.find((s) => s.id === product.sectorId)?.productionRoutes.find((r) => r.id === product.routeId)?.defaultIntensity ?? 0;
  const [tonnes, setTonnes] = useState(1000);
  const [own, setOwn] = useState(product.own);
  useEffect(() => setOwn(product.own), [product]);
  const { def, act } = useCosts(product, tonnes, own);
  const y26d = def.yearlyResults[0].netCbamCost, y26a = act.yearlyResults[0].netCbamCost;
  const max = Math.max(y26d, 1);
  const [year, setYear] = useState(2028);
  const yd = def.yearlyResults.find((r) => r.year === year)!, ya = act.yearlyResults.find((r) => r.year === year)!;
  const peak = Math.max(...def.yearlyResults.map((r) => r.costPerTonne), 1);

  return (
    <>
      <SEOHead title={meta.title} description={meta.description} canonical={CBAM_INDIA_PATH} faqSchema={CBAM_INDIA_FAQS}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "CBAM for Indian exporters", url: CBAM_INDIA_PATH }]} />
      <MinimalNav />
      <main className="cbi">
        {/* 1. The shipment: default value against the plant's own figure */}
        <section className="cbi-hero">
          <div className="cbi-hero-copy">
            <p className="cbi-eyebrow">CBAM for Indian exporters</p>
            <h1 className="cbi-title">Your EU buyer now pays for your emissions. <span>Make them pay on your real number.</span></h1>
            <p className="cbi-lede">Without verified plant data, every tonne you ship is charged at the EU's default value for India, plus a mark-up that rises every year. Senseible gets your actual figure measured, verified and in your buyer's hands.</p>
            <div className="cbi-ctas">
              <Link to="/cbam-suite" className="cbi-btn cbi-btn-primary">Start my CBAM data <ArrowRight className="h-4 w-4" /></Link>
              <CbamTalkButton page="cbam" label="Talk to us" className="cbi-btn" />
            </div>
          </div>

          <div className="cbi-dock" aria-label="CBAM cost on one shipment">
            <div className="cbi-dock-head"><Ship className="h-4 w-4" aria-hidden="true" /> One shipment to the EU, imported in 2026</div>
            <div className="cbi-chips" role="group" aria-label="Product">
              {CBAM_PRODUCTS.map((p) => (
                <button key={p.id} type="button" className="cbi-chip" aria-pressed={p.id === pid} onClick={() => setPid(p.id)}>{p.label}</button>
              ))}
            </div>
            <label className="cbi-range">
              <span>Tonnes shipped <b>{tonnes.toLocaleString("en-IN")} t</b></span>
              <input type="range" min={100} max={10000} step={100} value={tonnes} onChange={(e) => setTonnes(+e.target.value)} />
            </label>
            <label className="cbi-range">
              <span>Your plant's figure <b>{t2(own)} t CO2e/t</b></span>
              <input type="range" min={product.ownMin} max={defaultValue} step={0.05} value={own} onChange={(e) => setOwn(+e.target.value)} />
            </label>
            <div className="cbi-bills" aria-live="polite">
              <div className="cbi-bill">
                <span className="cbi-bill-k">On the EU default ({t2(defaultValue)} + 10%)</span>
                <span className="cbi-bill-v">{eur(y26d)}</span>
                <i className="cbi-bar cbi-bar-def" style={{ width: `${(y26d / max) * 100}%` }} />
              </div>
              <div className="cbi-bill">
                <span className="cbi-bill-k">On your verified figure</span>
                <span className="cbi-bill-v cbi-good">{eur(y26a)}</span>
                <i className="cbi-bar cbi-bar-act" style={{ width: `${(y26a / max) * 100}%` }} />
              </div>
              <p className="cbi-gap"><b>{eur(Math.max(0, y26d - y26a))}</b> off your buyer's CBAM bill on this shipment. Money they would otherwise ask you to cut from your price.</p>
            </div>
            <p className="cbi-fine">Commission default value for India and benchmarks, certificate price {eur(DEFAULT_EU_ETS_PRICE)} (Q3 2026). Your figure is an example: move it to your plant.</p>
          </div>
        </section>

        {/* 2. The clock: mark-up rises while free allocation falls */}
        <section className="cbi-sec">
          <h2 className="cbi-h2">The gap widens every year</h2>
          <p className="cbi-sub">Pick a year. Default values get dearer while the EU's free allocation runs down to zero.</p>
          <div className="cbi-years" role="group" aria-label="Import year">
            {def.yearlyResults.map((r) => {
              const a = act.yearlyResults.find((x) => x.year === r.year)!;
              return (
                <button key={r.year} type="button" className="cbi-year" aria-pressed={r.year === year} onClick={() => setYear(r.year)}>
                  <span className="cbi-col"><i className="cbi-col-def" style={{ height: `${(r.costPerTonne / peak) * 100}%` }} /><i className="cbi-col-act" style={{ height: `${(a.costPerTonne / peak) * 100}%` }} /></span>
                  <span className="cbi-year-l">{String(r.year).slice(2)}</span>
                </button>
              );
            })}
          </div>
          <div className="cbi-yearcard" aria-live="polite">
            <div><span>{year} per tonne, default</span><b>{eur(yd.costPerTonne)}</b></div>
            <div><span>Per tonne, your figure</span><b className="cbi-good">{eur(ya.costPerTonne)}</b></div>
            <div><span>Free allocation left</span><b>{Math.round(yd.freeAllocationPct * 1000) / 10}%</b></div>
          </div>
          <ol className="cbi-miles">
            {CBAM_MILESTONES.map((m) => <li key={m.when}><b>{m.when}</b><span>{m.what}</span></li>)}
          </ol>
          <p className="cbi-sub">Your buyer needs that status before your goods land. <Link to="/cbam-authorised-declarant" className="font-semibold text-foreground underline decoration-primary/50 underline-offset-4 hover:decoration-primary">Who has to be the authorised declarant, and what they need from you</Link>.</p>
        </section>

        {/* 3. Data at source: every meter feeds one ledger */}
        <DataAtSource />

        {/* 4. What the verifier checks */}
        <VerifierCheck />

        {/* 5. Goods */}
        <section className="cbi-sec">
          <h2 className="cbi-h2">Built for the plants CBAM hits first</h2>
          <div className="cbi-goods">
            <Link to={sectorHref("steel")}>Steel: billets, hot-rolled, wire rod, pipes</Link>
            <Link to="/answers/cbam-default-value-india-fasteners">Fasteners and forgings</Link>
            <Link to={sectorHref("aluminium")}>Aluminium extrusions and wire</Link>
            <Link to="/answers/cbam-default-value-india-cement-clinker">Cement and clinker</Link>
            <Link to="/answers/cbam-default-value-india-dap-npk">Fertilisers</Link>
          </div>
        </section>

        {/* 6. Answers */}
        <section className="cbi-sec">
          <h2 className="cbi-h2">Straight answers</h2>
          <div className="cbi-faq">
            {CBAM_INDIA_FAQS.map((f) => (
              <details key={f.question}><summary>{f.question}</summary><p>{f.answer}</p></details>
            ))}
          </div>
        </section>

        <section className="cbi-close">
          <h2>Your buyer's declaration is due 30 September 2027. Your data has to be ready first.</h2>
          <div className="cbi-ctas">
            <Link to="/cbam-suite" className="cbi-btn cbi-btn-primary">Start my CBAM data <ArrowRight className="h-4 w-4" /></Link>
            <CbamTalkButton page="cbam" label="Discuss pricing or your plant" className="cbi-btn cbi-btn-ghost" />
            <Link to="/cbam-calculator" className="cbi-btn cbi-btn-ghost">Estimate my cost first <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function DataAtSource() {
  const [lit, setLit] = useState<string[]>(() => (prefersReduced() ? DATA_SOURCES.map((d) => d.id) : ["bills"]));
  const [focus, setFocus] = useState("bills");
  const toggle = (id: string) => { setFocus(id); setLit((l) => (l.includes(id) ? l : [...l, id])); };
  const f = DATA_SOURCES.find((d) => d.id === focus)!;
  return (
    <section className="cbi-sec">
      <h2 className="cbi-h2">Measured at the source, not guessed at year end</h2>
      <p className="cbi-sub">We install what your plant is missing and connect what it already has. Tap each source.</p>
      <div className="cbi-flow">
        <div className="cbi-sources" role="group" aria-label="Data sources">
          {DATA_SOURCES.map((d) => (
            <button key={d.id} type="button" className="cbi-src" data-lit={lit.includes(d.id)} aria-pressed={focus === d.id} onClick={() => toggle(d.id)}>
              <i aria-hidden="true" />{d.name}
            </button>
          ))}
        </div>
        <div className="cbi-ledger" data-count={lit.length} aria-live="polite">
          <span className="cbi-ledger-k">One ledger, {lit.length} of {DATA_SOURCES.length} sources</span>
          <p className="cbi-ledger-v">{f.reads}</p>
          <p className="cbi-ledger-f">Every reading timestamped and fingerprinted. A trust layer flags figures that do not add up before anyone can call them green.</p>
        </div>
      </div>
    </section>
  );
}

function VerifierCheck() {
  const [n, setN] = useState(() => (prefersReduced() ? VERIFIER_CHECKS.length : 0));
  const timer = useRef<number | null>(null);
  const run = () => {
    if (prefersReduced()) { setN(VERIFIER_CHECKS.length); return; }
    setN(0);
    let i = 0;
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => { i += 1; setN(i); if (i >= VERIFIER_CHECKS.length && timer.current) window.clearInterval(timer.current); }, 260);
  };
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  return (
    <section className="cbi-sec cbi-verify">
      <div>
        <h2 className="cbi-h2">A verifier checks how you got the number, not just the number</h2>
        <p className="cbi-sub">This is the file they open. Senseible builds it as your data comes in, then it is verified by our in-house verifier or an external verifier you choose.</p>
        <button type="button" className="cbi-btn" onClick={run}>{n >= VERIFIER_CHECKS.length ? "Run it again" : "Run the check"}</button>
      </div>
      <ul className="cbi-checks">
        {VERIFIER_CHECKS.map((c, i) => (
          <li key={c} data-done={i < n}><span className="cbi-tick" aria-hidden="true"><Check className="h-3.5 w-3.5" /></span>{c}</li>
        ))}
      </ul>
    </section>
  );
}
