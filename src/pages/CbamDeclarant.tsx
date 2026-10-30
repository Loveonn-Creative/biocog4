import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, Ship } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { STATIC_PAGE_META } from "@/lib/seo/seoMeta";
import { CBAM_SECTORS } from "@/lib/cbamEngine";
import { markupFor, type CbamSector } from "@/lib/cbam/official";
import {
  CBAM_DECLARANT_FAQS, CBAM_DECLARANT_PATH, DECLARANT_MILESTONES, FERT_PCT, FIRST_DECLARATION_ISO, MARKUP_SCHEDULE, PACK_ROWS, THRESHOLD_TONNES,
  type Clears,
} from "@/data/cbamDeclarant";
import "./cbamDeclarant.css";

// /cbam-authorised-declarant. For Indian exporters (and their EU buyers) asking
// who the authorised CBAM declarant is and what it needs from the supplier.
// Sources live in src/data/cbamDeclarant.ts. Default values and mark-ups come
// from src/lib/cbam/official.ts through the CBAM engine.
// Sections: a shipment path from plant to declarant, a 50-tonne fill line, a dated clock with a
// today marker, a default-or-actual swap, and a supplier pack that fills in.

const prefersReduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useInView<T extends Element>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(() => prefersReduced() || typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (seen || !ref.current) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

export default function CbamDeclarant() {
  const meta = STATIC_PAGE_META[CBAM_DECLARANT_PATH];
  return (
    <>
      <SEOHead title={meta.title} description={meta.description} canonical={CBAM_DECLARANT_PATH} faqSchema={CBAM_DECLARANT_FAQS}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "CBAM for Indian exporters", url: "/cbam" }, { name: "Authorised CBAM declarant", url: CBAM_DECLARANT_PATH }]} />
      <MinimalNav />
      <main className="cbd">
        <Hero />
        <Threshold />
        <Clock />
        <DefaultOrActual />
        <Pack />

        <section className="cbd-sec">
          <h2 className="cbd-h2">Straight answers</h2>
          <div className="cbd-faq">
            {CBAM_DECLARANT_FAQS.map((f) => (
              <details key={f.question}><summary>{f.question}</summary><p>{f.answer}</p></details>
            ))}
          </div>
        </section>

        <section className="cbd-close">
          <h2>Your buyer files by 30 September 2027. Start your plant's numbers with the fuel and power bills you already have.</h2>
          <Link to="/cbam-suite" className="cbd-btn cbd-btn-primary">Build my CBAM data <ArrowRight className="h-4 w-4" /></Link>
        </section>
      </main>
      <Footer />
    </>
  );
}

/* 1. One shipment, India to the EU: tap a stop to see what happens there and what you send. */
type StopId = "plant" | "customs" | "declarant";
function Hero() {
  const [clears, setClears] = useState<Clears>("buyer");
  const [at, setAt] = useState<StopId>("declarant");
  const ddp = clears === "seller";
  // Lines follow PACK_ROWS (plant, goods, emissions; free allocation and verifier) and
  // findDeclarant(clears, "over"): who holds the status, and the account-number check.
  const files = ddp ? "An EU customs representative, or an EU company of your own, files the declaration. Your Indian company cannot." : "Your buyer, or its customs representative, files the declaration.";
  const stops: { id: StopId; name: string; sub: string; data: boolean; happens: string; send: string[] }[] = [
    { id: "plant", name: "Your plant", sub: "India", data: true,
      happens: "The goods are made, and their emissions are counted by product and period.",
      send: [PACK_ROWS[0], "Your goods by CN code (the EU's 8\u2011digit product code), with how each is made", "Emissions per tonne of each good, from fuel (direct) and electricity (indirect)"] },
    { id: "customs", name: "EU customs", sub: "Port of entry", data: false,
      happens: `Above ${THRESHOLD_TONNES} tonnes a year, customs releases the goods only to an authorised CBAM declarant.`,
      send: [ddp
        ? "Only a company based in the EU can be a declarant. Under DDP that is an indirect customs representative who agrees to take the role, or an EU company of your own."
        : "Ask your buyer for its CBAM account number and the EU country that authorised it. There is no public register to check."] },
    { id: "declarant", name: "Declarant", sub: "Files CBAM", data: true,
      happens: `${files} It reports the emissions from making your goods: your verified figure, or the EU default with a mark-up if you send nothing.`,
      send: ["Your verifier's name and their report", "Free allocation per tonne, which cuts the certificates your buyer owes"] },
  ];
  const idx = stops.findIndex((s) => s.id === at);
  const stop = stops[idx];
  return (
    <section className="cbd-hero">
      <div>
        <p className="cbd-eyebrow">Authorised CBAM declarant</p>
        <h1 className="cbd-title">Who files CBAM for your shipment, and what they need from you</h1>
        <p className="cbd-lede">Since 1 January 2026, once your EU buyer imports more than {THRESHOLD_TONNES} tonnes a year of steel, aluminium, cement and fertilisers combined, the goods clear only through an authorised CBAM declarant. That is a company in the EU, never you. It still needs your plant's figures.</p>
        <Link to="/cbam-suite" className="cbd-btn cbd-btn-primary cbd-hero-cta">Build my CBAM data <ArrowRight className="h-4 w-4" /></Link>
        <p className="cbd-cta-note">Free. Builds your emissions report, the file a verifier checks and the pack for your buyer.</p>
      </div>

      <div className="cbd-route" aria-label="One shipment, India to the EU">
        <div className="cbd-route-top">
          <p className="cbd-route-head">One shipment, India to the EU</p>
          <div className="cbd-clears" role="group" aria-label="Who clears the goods into the EU?">
            <button type="button" aria-pressed={clears === "buyer"} onClick={() => setClears("buyer")}>Buyer clears</button>
            <button type="button" aria-pressed={clears === "seller"} onClick={() => setClears("seller")}>We ship DDP</button>
          </div>
        </div>
        <div className="cbd-path" style={{ "--at": idx } as React.CSSProperties}>
          <span className="cbd-path-line" aria-hidden="true"><i /></span>
          <span className="cbd-ship" aria-hidden="true"><Ship className="h-4 w-4" /></span>
          <ol>
            {stops.map((s) => (
              <li key={s.id}>
                <button type="button" className="cbd-stop-btn" aria-pressed={s.id === at} onClick={() => setAt(s.id)}>
                  <span className="cbd-dot" aria-hidden="true" />
                  <span className="cbd-stop-name">{s.name}</span>
                  <span className="cbd-stop-sub">{s.sub}</span>
                  <span className="cbd-stop-tag" data-data={s.data}>{s.data ? "You send" : "Nothing from you"}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className="cbd-here" aria-live="polite" key={at + clears}>
          <p className="cbd-here-k">What happens here</p>
          <p className="cbd-here-v">{stop.happens}</p>
          <p className="cbd-here-k">Your part</p>
          <ul className="cbd-here-send">{stop.send.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

/* 2. The 50-tonne line fills with every supplier's tonnes to one buyer. */
function Threshold() {
  const [mine, setMine] = useState(20);
  const [others, setOthers] = useState(40);
  const total = mine + others;
  const scale = 120;
  const over = total > THRESHOLD_TONNES;
  return (
    <section className="cbd-sec">
      <h2 className="cbd-h2">50 tonnes is your buyer's total, not yours</h2>
      <p className="cbd-sub">Counted per importer, per calendar year, by weight of goods across steel, aluminium, cement and fertilisers together. Your 30 tonnes and another supplier's 30 tonnes to the same buyer make 60.</p>
      <div className="cbd-fill-wrap">
        <div className="cbd-sliders">
          <label className="cbd-range"><span>Your goods to this buyer <b>{mine} t</b></span>
            <input type="range" min={0} max={60} step={5} value={mine} onChange={(e) => setMine(+e.target.value)} /></label>
          <label className="cbd-range"><span>Other suppliers to the same buyer <b>{others} t</b></span>
            <input type="range" min={0} max={60} step={5} value={others} onChange={(e) => setOthers(+e.target.value)} /></label>
        </div>
        <div className="cbd-fill" data-over={over}>
          <div className="cbd-track" role="img" aria-label={`${total} tonnes against the 50-tonne line`}>
            <i className="cbd-seg cbd-seg-mine" style={{ width: `${(mine / scale) * 100}%` }} />
            <i className="cbd-seg cbd-seg-others" style={{ left: `${(mine / scale) * 100}%`, width: `${(others / scale) * 100}%` }} />
            <span className="cbd-line" style={{ left: `${(THRESHOLD_TONNES / scale) * 100}%` }}><em>50 t</em></span>
          </div>
          <p className="cbd-fill-v" aria-live="polite"><b>{total} t</b> {over ? "Over the line. Your buyer needs declarant status and will likely ask for your plant's data." : "Under the line. Exempt for these goods, until the year's total crosses 50 t."}</p>
          <p className="cbd-fill-f">Hydrogen and electricity have no threshold. Any amount needs a declarant.</p>
        </div>
      </div>
    </section>
  );
}

/* 3. The clock: dated stops, a line drawn to today, days left to the first declaration. */
function Clock() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const start = Date.parse(DECLARANT_MILESTONES[0].iso);
  const end = Date.parse(FIRST_DECLARATION_ISO);
  const now = Date.now();
  const pos = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const daysLeft = Math.ceil((end - now) / 86400000);
  const at = (iso: string) => ((Date.parse(iso) - start) / (end - start)) * 100;
  return (
    <section className="cbd-sec">
      <h2 className="cbd-h2">The status comes before the shipment</h2>
      <p className="cbd-sub">{daysLeft > 0 ? <>Your buyer's first declaration is <b className="cbd-days">{daysLeft.toLocaleString("en-IN")} days</b> away. Verification takes time, so book a verifier early in 2027.</> : <>The first declaration date has passed. Each year's imports are declared by 30 September of the next year.</>}</p>
      <div className="cbd-clock" ref={ref} data-seen={seen}>
        <div className="cbd-rail" aria-hidden="true">
          <i className="cbd-rail-done" style={{ width: seen ? `${pos * 100}%` : "0%" }} />
          {daysLeft > 0 && <span className="cbd-today" style={{ left: `${pos * 100}%` }}><em>Today</em></span>}
          {DECLARANT_MILESTONES.map((m) => <span key={m.iso} className="cbd-stop" data-past={Date.parse(m.iso) <= now} style={{ left: `${at(m.iso)}%` }} />)}
        </div>
        <ol className="cbd-stops">
          {DECLARANT_MILESTONES.map((m) => (
            <li key={m.iso} data-past={Date.parse(m.iso) <= now}><b>{m.when}</b><span>{m.what}</span></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* 4. Default or actual: the same declaration line, swapped. */
const SWAP_PRODUCTS = [
  { id: "hr", label: "Hot-rolled steel", sectorId: "steel", routeId: "bf-bof", official: "iron_steel" as CbamSector },
  { id: "al", label: "Aluminium profiles", sectorId: "aluminium", routeId: "bars-profiles", official: "aluminium" as CbamSector },
];
const YEARS = [2026, 2027, 2028];
const t2 = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function DefaultOrActual() {
  const [mode, setMode] = useState<"default" | "actual">("default");
  const [pid, setPid] = useState(SWAP_PRODUCTS[0].id);
  const [year, setYear] = useState(2026);
  const p = SWAP_PRODUCTS.find((x) => x.id === pid) ?? SWAP_PRODUCTS[0];
  const dv = CBAM_SECTORS.find((s) => s.id === p.sectorId)?.productionRoutes.find((r) => r.id === p.routeId)?.defaultIntensity ?? 0;
  const mu = markupFor(p.official, year);
  const rows = mode === "default"
    ? [
      ["Basis", "EU default value for India"],
      [`Per tonne of ${p.official === "aluminium" ? "aluminium" : "steel"}`, `${t2(dv)} + ${Math.round(mu * 100)}% = ${t2(dv * (1 + mu))} t CO2e`],
      ["Evidence", "None needed"],
      ["Who pays", "Your buyer pays more, then asks you for a lower price"],
    ]
    : [
      ["Basis", "Your plant's actual value"],
      ["Per tonne", "Your own number, for each product"],
      ["Evidence", "A report from an accredited CBAM verifier"],
      ["Mark-up", "None"],
    ];
  return (
    <section className="cbd-sec">
      <h2 className="cbd-h2">Send nothing, and the declarant files the EU default for India</h2>
      <p className="cbd-sub">Defaults need no proof, but carry a mark-up of {MARKUP_SCHEDULE} ({FERT_PCT} for fertilisers). Your actual value has to be verified, and it carries no mark-up.</p>
      <div className="cbd-swap">
        <div className="cbd-swap-controls">
          <div className="cbd-toggle" role="group" aria-label="What you send">
            <button type="button" aria-pressed={mode === "default"} onClick={() => setMode("default")}>You send nothing</button>
            <button type="button" aria-pressed={mode === "actual"} onClick={() => setMode("actual")}>You send verified data</button>
          </div>
          <div className="cbd-chips" role="group" aria-label="Product">
            {SWAP_PRODUCTS.map((x) => <button key={x.id} type="button" className="cbd-chip" aria-pressed={x.id === pid} onClick={() => setPid(x.id)}>{x.label}</button>)}
          </div>
          <div className="cbd-chips" role="group" aria-label="Year imported">
            {YEARS.map((y) => <button key={y} type="button" className="cbd-chip" aria-pressed={y === year} disabled={mode === "actual"} onClick={() => setYear(y)}>{y === 2028 ? "2028 onwards" : y}</button>)}
          </div>
        </div>
        <div className="cbd-decl" data-mode={mode} aria-live="polite">
          <p className="cbd-decl-head">In your buyer's declaration: {p.label.toLowerCase()}, imported {mode === "default" ? year : "this year"}</p>
          <dl key={mode + pid + year}>
            {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </div>
      </div>
      <p className="cbd-links">
        <Link to="/cbam-calculator">Estimate your cost <ArrowUpRight className="h-4 w-4" /></Link>
        <Link to="/cbam-cost">Cost by sector <ArrowUpRight className="h-4 w-4" /></Link>
      </p>
    </section>
  );
}

/* 5. The pack the declarant asks for, filling line by line. */
function Pack() {
  const [ref, seen] = useInView<HTMLOListElement>();
  return (
    <section className="cbd-sec cbd-pack">
      <div>
        <h2 className="cbd-h2">The main lines the declarant needs from you</h2>
        <p className="cbd-sub">Each figure must name the plant that made the goods and the period it covers. Senseible's free CBAM suite builds these from your fuel, power and production records, and keeps your suppliers' and verifier's reports with them. You send it as one pack, by CN code (the EU's 8&#8209;digit product code), with the source of every number.</p>
        <p className="cbd-pack-links">
          <Link to="/cbam-suite" className="cbd-btn cbd-btn-primary">Build my CBAM data <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/cbam-suite/supplier-pack" className="cbd-text-link">See the supplier pack <ArrowUpRight className="h-4 w-4" /></Link>
        </p>
      </div>
      <ol className="cbd-sheet" ref={ref} data-seen={seen}>
        {PACK_ROWS.map((r, i) => (
          <li key={r} style={{ transitionDelay: seen && !prefersReduced() ? `${i * 120}ms` : "0ms" }}>
            <span className="cbd-tick" aria-hidden="true"><Check className="h-3.5 w-3.5" /></span>
            <span className="cbd-sheet-item">{r}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
