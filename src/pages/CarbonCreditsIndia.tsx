import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, RotateCcw } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { STATIC_PAGE_META } from "@/lib/seo/seoMeta";
import { BEE_FEES, CCI_FAQS, CCI_PATH, INSTRUMENTS, ROUTES, SITUATIONS, beeFees, type RouteId } from "@/data/carbonCreditsIndia";
import "./carbonCreditsIndia.css";

// /carbon-credits-india. The page is a route the reader walks: who they are,
// what changed, then the market that fits, what it takes and what to watch.
// The line on the left draws as they choose (still when motion is reduced).

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function RouteFinder() {
  const [who, setWho] = useState<RouteId | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const situation = SITUATIONS.find((s) => s.id === who);
  const card = who && pick ? ROUTES[`${who}:${pick}`] : null;
  const stage = card ? 3 : who ? 2 : 1;
  const reset = () => { setWho(null); setPick(null); };

  return (
    <div className="cci-finder" data-stage={stage}>
      <svg className="cci-rail" viewBox="0 0 24 600" preserveAspectRatio="none" aria-hidden="true">
        <line x1="12" y1="0" x2="12" y2="600" className="cci-rail-base" />
        <line x1="12" y1="0" x2="12" y2="600" className="cci-rail-ink" />
      </svg>

      <ol className="cci-stops">
        <li className="cci-stop is-on">
          <span className="cci-node" aria-hidden="true">1</span>
          <h2 className="cci-stop-q">Where are you starting from?</h2>
          <div className="cci-choices" role="group" aria-label="Your situation">
            {SITUATIONS.map((s) => (
              <button key={s.id} type="button" aria-pressed={who === s.id} className="cci-chip"
                onClick={() => { setWho(s.id); setPick(null); }}>{s.who}</button>
            ))}
          </div>
        </li>

        <li className={`cci-stop ${who ? "is-on" : ""}`} aria-hidden={!who}>
          <span className="cci-node" aria-hidden="true">2</span>
          {situation ? (
            <>
              <h2 className="cci-stop-q">{situation.ask}</h2>
              <div className="cci-choices" role="group" aria-label={situation.ask}>
                {situation.choices.map((c) => (
                  <button key={c.id} type="button" aria-pressed={pick === c.id} className="cci-chip" onClick={() => setPick(c.id)}>{c.label}</button>
                ))}
              </div>
            </>
          ) : <p className="cci-stop-wait">Pick a starting point above.</p>}
        </li>

        <li className={`cci-stop ${card ? "is-on" : ""}`} aria-live="polite">
          <span className="cci-node" aria-hidden="true">3</span>
          {card ? (
            <article className="cci-card">
              <p className="cci-eyebrow">Your route</p>
              <h2 className="cci-market">{card.market}</h2>
              <p className="cci-verdict">{card.verdict}</p>
              <ol className="cci-steps">{card.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              <p className="cci-watch"><b>Watch for</b> {card.watch}</p>
              <div className="cci-links">
                {card.links.map((l) => (
                  <Link key={l.to} to={l.to} className="cci-link">{l.label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
                ))}
              </div>
              <button type="button" onClick={reset} className="cci-reset"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Try another route</button>
            </article>
          ) : <p className="cci-stop-wait">Your route appears here.</p>}
        </li>
      </ol>
    </div>
  );
}

function UnitLens() {
  const [id, setId] = useState<string>(INSTRUMENTS[0].id);
  const it = INSTRUMENTS.find((i) => i.id === id)!;
  return (
    <div className="cci-lens">
      <div className="cci-lens-tabs" role="tablist" aria-label="Instrument">
        {INSTRUMENTS.map((i) => (
          <button key={i.id} role="tab" type="button" aria-selected={i.id === id} className="cci-lens-tab" onClick={() => setId(i.id)}>{i.name}</button>
        ))}
      </div>
      <div className="cci-lens-panel" role="tabpanel" key={it.id}>
        <p className="cci-lens-one">One certificate =</p>
        <p className="cci-lens-unit">{it.unit}</p>
        <dl className="cci-lens-facts">
          <div><dt>Who earns it</dt><dd>{it.who}</dd></div>
          <div><dt>Where it trades</dt><dd>{it.where}</dd></div>
        </dl>
        <Link to={it.link} className="cci-link">How it works <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
      </div>
    </div>
  );
}

// Slider positions map to tonnes on a log scale, 100 to 100,000 a year.
const toTonnes = (v: number) => Math.round(10 ** (2 + v * 3) / 10) * 10;

function FeeMeter() {
  const [v, setV] = useState(0.33);
  const tonnes = toTonnes(v);
  const f = useMemo(() => beeFees(tonnes), [tonnes]);
  const parts = [
    { k: "Registration", n: f.registration, c: "cci-seg-a" },
    { k: "Account and upkeep", n: f.account + f.maintenance, c: "cci-seg-b" },
    { k: "Issuance at ₹5 a credit", n: f.issuance, c: "cci-seg-c" },
  ];
  return (
    <div className="cci-meter">
      <label htmlFor="cci-tonnes" className="cci-meter-label">Reductions your project expects each year</label>
      <p className="cci-meter-tonnes"><span>{tonnes.toLocaleString("en-IN")}</span> t CO2e a year</p>
      <input id="cci-tonnes" type="range" min={0} max={1} step={0.01} value={v} onChange={(e) => setV(Number(e.target.value))} className="cci-range" aria-valuetext={`${tonnes} tonnes a year`} />
      <div className="cci-meter-out">
        <div>
          <p className="cci-big">{inr(f.perCredit)}</p>
          <p className="cci-small">per credit, only to cover BEE's own fees over a ten-year crediting period</p>
        </div>
        <div>
          <p className="cci-mid">{inr(f.total)}</p>
          <p className="cci-small">BEE fees for {f.credits.toLocaleString("en-IN")} credits</p>
        </div>
      </div>
      <div className="cci-bar" aria-hidden="true">
        {parts.map((p) => <i key={p.k} className={p.c} style={{ width: `${(p.n / f.total) * 100}%` }} />)}
      </div>
      <ul className="cci-legend">
        {parts.map((p) => <li key={p.k}><i className={p.c} aria-hidden="true" />{p.k}: {inr(p.n)}</li>)}
      </ul>
      <p className="cci-note">Two accredited agencies, one to validate and one to verify, charge on top at their own rates. Registration is {inr(BEE_FEES.registration[0].fee)} up to 15,000 t a year, then {inr(BEE_FEES.registration[1].fee)} and {inr(BEE_FEES.registration[2].fee)}.</p>
    </div>
  );
}

export default function CarbonCreditsIndia() {
  const meta = STATIC_PAGE_META[CCI_PATH];
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={meta.title} description={meta.description} canonical={CCI_PATH} faqSchema={CCI_FAQS}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Carbon credits in India", url: CCI_PATH }]} />
      <MinimalNav />
      <main className="cci">
        <header className="cci-hero">
          <p className="cci-eyebrow">Carbon credits in India</p>
          <h1 className="cci-title">Everyone says there is money in carbon credits. <span>Here is the route that fits you.</span></h1>
          <p className="cci-lede">Three taps. You get the market that applies, what it takes, and what usually goes wrong. No price promises: India's carbon market has not set one yet.</p>
        </header>

        <section aria-label="Find your route"><RouteFinder /></section>

        <section className="cci-section">
          <h2 className="cci-h2">Four things get called carbon credits</h2>
          <p className="cci-sub">Only two of them are tonnes of CO2e. Mixing them up is the most common mistake in Indian credit pitches.</p>
          <UnitLens />
        </section>

        <section className="cci-section">
          <h2 className="cci-h2">What does it cost before you earn anything?</h2>
          <p className="cci-sub">Slide to your project's size. This is BEE's published fee schedule, nothing else.</p>
          <FeeMeter />
        </section>

        <section className="cci-section">
          <h2 className="cci-h2">Straight answers</h2>
          <div className="cci-faq">
            {CCI_FAQS.map((f) => (
              <details key={f.question}>
                <summary>{f.question}</summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="cci-more">Comparing where to buy, sell or register? <Link to="/carbon-credit-platforms">Carbon credit platforms for 2027, compared</Link>.</p>

        <section className="cci-close">
          <h2>Every route starts with a year of numbers you can prove.</h2>
          <p>Upload an electricity bill or fuel invoice and see its emissions, with the factor behind every line. That record is what a verifier, a buyer or a lender will ask for first.</p>
          <div className="cci-close-actions">
            <Link to="/" className="cci-cta">Upload a bill <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link to="/carbon-credits" className="cci-cta-ghost">Check your credit potential</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
