import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, Download } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { STATIC_PAGE_META } from "@/lib/seo/seoMeta";
import { GreenLoanEntry } from "@/components/climate-finance/GreenLoanEntry";
import {
  CHECK_TERMS, CLUSTERS, EVIDENCE, GLS_FAQS, GLS_PATH, NEEDS, SCHEMES, SIZES, arrange, asksCluster, evidenceTally, sieve,
  type Cluster, type Need, type Scheme, type Size,
} from "@/data/greenLoanSchemes";
import { fittingSchemes, greenLoanFile, loanFileName } from "@/lib/leadMagnets/greenLoanFile";
import { downloadSendablePdf } from "@/lib/leadMagnets/sendableFile";
import "./greenLoanSchemes.css";

// /msme-green-loan-schemes. The hero sieves the ten routes with three taps
// (purpose, size, cluster). Its purpose question reshapes the page: what is the money
// for? The comparison re-sorts to the routes built for that need, the evidence
// tally below re-counts what those lenders ask for, and the closing strip draws
// how Senseible turns bills into that evidence. Facts: src/data/greenLoanSchemes.ts.

const EVIDENCE_LABEL = Object.fromEntries(EVIDENCE.map(e => [e.id, e.label]));

/* Hero: three taps sieve the ten routes down to the ones built for this project. */
// One plain line per route, shortened from its kind, funds and terms in SCHEMES.
const LINE: Record<string, string> = {
  adeetie: "BEE pays part of the interest on your bank loan",
  "4e": "SIDBI loan for the measures your energy audit recommends",
  gfs: "SIDBI loan for solar, efficiency and cleaner production",
  fmap: "Loan through SIDBI or a partner bank for listed technologies, solar and water",
  gift: "Helps bring a green loan down to a concessional rate",
  solar: "Term loan from your bank for the plant",
  machinery: "SIDBI loan to replace or add machines",
  working: "Working capital from your bank, for green work or tied to targets",
  psl: "Not a loan. The RBI category your bank files your loan under",
  cgtmse: "Not a loan. A guarantee so your bank can lend up to ₹10 crore without collateral, if it opts in",
};
function hint(s: Scheme, size: Size | null, cluster: Cluster | null): string {
  if (s.id === "adeetie") {
    const cut = size === "medium" ? "BEE cuts your interest by 3 percentage points" : size === "small" ? "BEE cuts your interest by 5 percentage points" : LINE.adeetie;
    return cluster === "unsure" ? `${cut}, if your unit is in one of the 60 named clusters` : cut;
  }
  return LINE[s.id] ?? s.kind;
}

function Tap<T extends string>({ q, value, options, onChange }: { q: string; value: T | null; options: { v: T; l: string }[]; onChange: (v: T | null) => void }) {
  return (
    <fieldset className="gls-sieve-q">
      <legend>{q}</legend>
      <div>
        {options.map(o => (
          <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(value === o.v ? null : o.v)}>{o.l}</button>
        ))}
      </div>
    </fieldset>
  );
}

interface SieveState { need: Need | null; setNeed: (n: Need | null) => void; size: Size | null; setSize: (s: Size | null) => void; cluster: Cluster | null; setCluster: (c: Cluster | null) => void }

function RouteSieve({ need, setNeed, size, setSize, cluster, setCluster }: SieveState) {
  const askCluster = asksCluster(need);
  const c = askCluster ? cluster : null;
  const rows = SCHEMES.map(s => ({ s, out: sieve(s, need, size, c) }));
  const fits = rows.filter(r => !r.out).length;
  const setAside = Object.entries(rows.reduce<Record<string, string[]>>((acc, r) => {
    if (r.out) (acc[r.out] ??= []).push(r.s.name);
    return acc;
  }, {}));
  return (
    <div className="gls-sieve">
      <Tap<Need> q="What is the money for?" value={need} onChange={setNeed} options={NEEDS.map(n => ({ v: n.id, l: n.label }))} />
      <Tap<Size> q="Your size" value={size} onChange={setSize} options={SIZES.map(x => ({ v: x.id, l: x.label }))} />
      {askCluster && (
        <Tap<Cluster> q="Is your unit in one of BEE's 60 named clusters, like Morbi, Firozabad or Ludhiana?" value={cluster} onChange={setCluster}
          options={CLUSTERS.map(x => ({ v: x.id, l: x.label }))} />
      )}
      <p className="gls-sieve-count" aria-live="polite">{need || size ? <><b>{fits}</b> of {SCHEMES.length} fit your project</> : <><b>{SCHEMES.length}</b> options. Tap above to narrow them.</>}</p>
      <ol className="gls-sieve-list">
        {rows.map(({ s, out }) => (
          <li key={s.id} data-out={Boolean(out)} aria-hidden={out ? true : undefined}>
            <div>
              <span className="gls-sieve-name">{s.name}</span>
              <span className="gls-sieve-why">{hint(s, size, c)}</span>
            </div>
          </li>
        ))}
      </ol>
      {setAside.length > 0 && (
        <ul className="gls-sieve-out">
          {setAside.map(([why, names]) => <li key={why}><b>{why}:</b> {names.join(", ")}</li>)}
        </ul>
      )}
      <a href="#compare" className="gls-sieve-go">Documents and terms for each <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
    </div>
  );
}

/* The loan file: one page for the bank's credit officer, built from the taps above. */
function LoanFile({ need, size, cluster }: { need: Need | null; size: Size | null; cluster: Cluster | null }) {
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const count = need ? fittingSchemes(need, size, cluster).length : 0;
  const download = async () => {
    if (!need) return;
    setBusy(true); setFailed(false);
    try { await downloadSendablePdf(greenLoanFile({ need, size, cluster, company }), loanFileName()); }
    catch { setFailed(true); }
    finally { setBusy(false); }
  };
  return (
    <div className="gls-file">
      <p className="gls-file-k">Your loan file, for the bank</p>
      <ul className="gls-file-list">
        <li>{need ? <><b>{count}</b> {count === 1 ? "scheme" : "schemes"} that fit, with their terms</> : "The schemes that fit, with their terms"}</li>
        <li>The papers each one asks for</li>
        <li>The bills that prove your energy saving</li>
      </ul>
      <label className="gls-file-name">
        <span>Company name <small>(optional)</small></span>
        <input type="text" value={company} onChange={e => setCompany(e.target.value)} maxLength={80} autoComplete="organization" />
      </label>
      <button type="button" className="gls-cta gls-file-btn" onClick={download} disabled={!need || busy}>
        <Download className="h-4 w-4" aria-hidden="true" /> {busy ? "Making your file" : "Download my loan file"}
      </button>
      <p className="gls-file-note" aria-live="polite">
        {failed ? "The file did not download. Try again." : need ? "One page, addressed to the credit officer. No sign-up." : "Tap what the money is for to build it."}
      </p>
    </div>
  );
}

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
  const [size, setSize] = useState<Size | null>(null);
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const fitCount = arrange(need).fit.length;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={meta.title} description={meta.description} canonical={GLS_PATH} faqSchema={GLS_FAQS}
        keywords={["green loan schemes for MSME", "SIDBI green loan", "energy efficiency loan", "ADEETIE", "SIDBI 4E", "rooftop solar loan MSME"]}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Green loan schemes for MSMEs", url: GLS_PATH }]} />
      <MinimalNav />
      <main className="gls">
        <header className="gls-hero">
          <div className="gls-hero-copy">
            <p className="gls-eyebrow">Green finance in India</p>
            <h1 className="gls-title">Green loan schemes for MSMEs. <span>Find the one built for your project.</span></h1>
            <p className="gls-lede">Ten options: SIDBI loans, BEE's interest cut, your bank's loans, and the RBI and CGTMSE rules that shape them. A few taps set aside the ones that do not fit your project.</p>
            <p className="gls-note">Senseible does not lend, arrange or approve loans.</p>
          </div>
          <RouteSieve need={need} setNeed={setNeed} size={size} setSize={setSize} cluster={cluster} setCluster={setCluster} />
          <LoanFile need={need} size={size} cluster={cluster} />
        </header>

        <section id="compare" className="gls-compare" aria-label="Compare green loan routes">
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
          <p className="gls-aside">Want the lender's side? See <Link to="/climate-finance">how credit teams use verified records</Link>.</p>
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
