import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { STATIC_PAGE_META } from "@/lib/seo/seoMeta";
import { GreenLoanEntry } from "@/components/climate-finance/GreenLoanEntry";
import { CHECK_TERMS, EVIDENCE, GLS_FAQS, GLS_PATH, NEEDS, arrange, evidenceTally, type Need } from "@/data/greenLoanSchemes";
import "./greenLoanSchemes.css";

// /msme-green-loan-schemes. One question reshapes the page: what is the money
// for? The comparison re-sorts to the routes built for that need, the evidence
// tally below re-counts what those lenders ask for, and the closing strip draws
// how Senseible turns bills into that evidence. Facts: src/data/greenLoanSchemes.ts.

const EVIDENCE_LABEL = Object.fromEntries(EVIDENCE.map(e => [e.id, e.label]));

function NeedSwitch({ need, setNeed, fitCount }: { need: Need | null; setNeed: (n: Need | null) => void; fitCount: number }) {
  const opts: { id: Need | null; label: string }[] = [{ id: null, label: "Show all" }, ...NEEDS];
  return (
    <div className="gls-switch">
      <p className="gls-switch-q" id="gls-need-q">What is the money for?</p>
      <div className="gls-switch-opts" role="radiogroup" aria-labelledby="gls-need-q">
        {opts.map(o => (
          <button key={o.label} type="button" role="radio" aria-checked={need === o.id} onClick={() => setNeed(o.id)} className="gls-need">
            {o.label}
          </button>
        ))}
      </div>
      <p className="gls-switch-count" aria-live="polite">
        {need ? <><b>{fitCount}</b> of 10 routes fit {NEEDS.find(n => n.id === need)?.label.toLowerCase()}</> : <>All 10 routes, side by side</>}
      </p>
    </div>
  );
}

function Comparison({ need }: { need: Need | null }) {
  const { fit, rest } = arrange(need);
  // Phones show who it suits and what it pays for; papers and terms open on tap.
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <div className="gls-table">
      <div className="gls-thead" aria-hidden="true">
        <span>Route</span><span>Who it suits</span><span>What it pays for</span><span>What the lender asks for</span><span>Terms</span>
      </div>
      <ol className="gls-rows">
        {fit.map((s, i) => (
          <li key={`${need ?? "all"}-${s.id}`} className="gls-row" style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }}>
            <div className="gls-cell gls-name">
              <h3>{s.name}</h3>
              <p className="gls-kind">{s.kind}</p>
              <Link to={s.more.to} className="gls-more">{s.more.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            </div>
            <dl className="gls-cells">
              <div className="gls-cell"><dt>Who it suits</dt><dd>{s.suits}</dd></div>
              <div className="gls-cell"><dt>What it pays for</dt><dd>{s.funds}</dd></div>
              <div className={`gls-cell gls-extra ${open[s.id] ? "is-open" : ""}`} id={`gls-x-${s.id}`}>
                <dt>What the lender asks for</dt>
                <dd>{s.asks.length
                  ? <ul className="gls-asks">{s.asks.map(a => <li key={a}>{EVIDENCE_LABEL[a]}</li>)}</ul>
                  : s.asksNote}
                </dd>
              </div>
              <div className={`gls-cell gls-extra ${open[s.id] ? "is-open" : ""}`}>
                <dt>Terms</dt>
                <dd>
                  <ul className="gls-terms">
                    {s.terms.map(t => <li key={t} className={t === CHECK_TERMS ? "gls-check-terms" : undefined}>{t}</li>)}
                  </ul>
                  <p className="gls-where">{s.check}</p>
                </dd>
              </div>
            </dl>
            <button type="button" className="gls-toggle" aria-expanded={!!open[s.id]} aria-controls={`gls-x-${s.id}`}
              onClick={() => setOpen(o => ({ ...o, [s.id]: !o[s.id] }))}>
              {open[s.id] ? "Hide papers and terms" : "Papers and terms"} <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      {rest.length > 0 && (
        <p className="gls-rest">
          <span>Not built for this:</span> {rest.map(s => s.name).join(", ")}.
        </p>
      )}
    </div>
  );
}

function EvidenceTally({ need }: { need: Need | null }) {
  const { fit } = arrange(need);
  const tally = evidenceTally(fit);
  return (
    <ul className="gls-tally">
      {tally.map(({ item, count }) => (
        <li key={item.id} className={`gls-bar ${item.senseible ? "is-bills" : ""}`}>
          <div className="gls-bar-head">
            <span className="gls-bar-label">{item.label}</span>
            <span className="gls-bar-count">{count} of {fit.length}</span>
          </div>
          <span className="gls-bar-track" aria-hidden="true"><span className="gls-bar-ink" style={{ transform: `scaleX(${count / fit.length})` }} /></span>
          {item.senseible && <span className="gls-bar-tag">{item.senseible}</span>}
        </li>
      ))}
    </ul>
  );
}

const STEPS = [
  { t: "Upload your bills", b: "Electricity bills and fuel invoices, as photos or PDFs. No forms to fill." },
  { t: "Each bill is checked and kept as a record", b: "Each line shows the units used and how the emissions were worked out. The same bill is never counted twice." },
  { t: "A file your lender can check", b: "Finance evidence on your dashboard counts verified records only, ready to show your bank." },
];

function BillToLender() {
  const ref = useRef<HTMLOListElement>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setDrawn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setDrawn(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <ol ref={ref} className={`gls-steps ${drawn ? "is-drawn" : ""}`}>
      {STEPS.map((s, i) => (
        <li key={s.t} className="gls-step" style={{ transitionDelay: `${i * 220}ms` }}>
          <span className="gls-step-n" aria-hidden="true">{i + 1}</span>
          <h3>{s.t}</h3>
          <p>{s.b}</p>
        </li>
      ))}
    </ol>
  );
}

export default function GreenLoanSchemes() {
  const meta = STATIC_PAGE_META[GLS_PATH];
  const [need, setNeed] = useState<Need | null>(null);
  const fitCount = arrange(need).fit.length;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={meta.title} description={meta.description} canonical={GLS_PATH} faqSchema={GLS_FAQS}
        keywords={["green loan schemes for MSME", "SIDBI green loan", "energy efficiency loan", "ADEETIE", "SIDBI 4E", "rooftop solar loan MSME"]}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Green loan schemes for MSMEs", url: GLS_PATH }]} />
      <MinimalNav />
      <main className="gls">
        <header className="gls-hero">
          <p className="gls-eyebrow">Green finance in India</p>
          <h1 className="gls-title">Green loan schemes for MSMEs. <span>Find the one built for your project.</span></h1>
          <p className="gls-lede">SIDBI and your bank lend for different projects, BEE cuts the interest on some, and RBI and CGTMSE rules change what a bank will do. Pick what the money is for, and see who each route suits, what it pays for and the papers the lender will want.</p>
          <p className="gls-note">Senseible does not lend, arrange or approve loans.</p>
        </header>

        <section className="gls-compare" aria-label="Compare green loan routes">
          <NeedSwitch need={need} setNeed={setNeed} fitCount={fitCount} />
          <Comparison need={need} />
        </section>

        <section className="gls-section">
          <h2 className="gls-h2">The same papers come up again and again</h2>
          <p className="gls-sub">What the routes above ask for, counted. The green rows are where Senseible helps, from bills you already keep.</p>
          <EvidenceTally need={need} />
          <div className="gls-mid-cta">
            <Link to="/green-loan-check" className="gls-cta">Check your readiness, free <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <p>Two minutes. You get a checklist of what to prepare, not a loan decision.</p>
          </div>
        </section>

        <section className="gls-section">
          <h2 className="gls-h2">From a pile of bills to a file a lender reads</h2>
          <p className="gls-sub">You already keep the bills. Senseible reads them and keeps each one as proof.</p>
          <BillToLender />
          <GreenLoanEntry className="mt-8" />
          <p className="gls-aside">Want the lender's side? See <Link to="/climate-finance">how credit teams use verified records</Link>. Comparing lenders on limits, your share and repayment? See <Link to="/green-loans-msme-india">green loans for MSMEs, compared</Link>.</p>
        </section>

        <section className="gls-section">
          <h2 className="gls-h2">Questions owners ask</h2>
          <div className="gls-faq">
            {GLS_FAQS.map(f => (
              <details key={f.question}>
                <summary>{f.question}<ChevronDown className="h-4 w-4" aria-hidden="true" /></summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="gls-close">
          <h2>Know what you are missing before the bank tells you.</h2>
          <p>Answer a few one-tap questions and see what a credit team will ask for, and where you stand today.</p>
          <Link to="/green-loan-check" className="gls-cta">Start the free check <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
