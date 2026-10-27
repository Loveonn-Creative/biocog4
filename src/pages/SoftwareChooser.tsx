import { useMemo, useState } from "react";
import { analyticsEvents } from "@/lib/analytics";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Copy, Download, Plus, X } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { STATIC_PAGE_META } from "@/lib/seo/seoMeta";
import {
  CRITERIA, RATING_LABELS, SC_PATH, WEIGHT_LABELS, checklist, checklistText, scoreVendor, startWeights,
  type Rating, type Weight, type Weights,
} from "@/data/softwareChooser";
import "./softwareChooser.css";

// /carbon-accounting-software-india. The scorecard is the page: the reader
// weighs what matters, a receipt of questions prints beside it, and the same
// weights then score the vendors they are talking to. No vendor facts are ours.

const WEIGHTS: Weight[] = [0, 1, 2, 3];
const RATINGS: Rating[] = [0, 1, 2];

function Receipt({ w }: { w: Weights }) {
  const items = checklist(w);
  const [copied, setCopied] = useState(false);
  const text = checklistText(w);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked: download still works */ }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = "carbon-software-checklist.txt"; a.click();
    URL.revokeObjectURL(url);
    analyticsEvents.resourceDownload("software-checklist", "txt", "software-chooser");
  };
  return (
    <aside className="sc-receipt" aria-label="Your checklist">
      <div className="sc-receipt-head">
        <p className="sc-receipt-title">Your checklist</p>
        <p className="sc-receipt-count">{items.length} questions</p>
      </div>
      <ol className="sc-receipt-list">
        {items.map((c) => (
          <li key={c.id} className={`sc-line w${w[c.id]}`}>
            <span className="sc-line-tag">{WEIGHT_LABELS[w[c.id]]}</span>
            <span className="sc-line-ask">{c.ask}</span>
          </li>
        ))}
        {!items.length && <li className="sc-line-empty">Weigh at least one thing to start your list.</li>}
      </ol>
      <div className="sc-receipt-actions">
        <button type="button" onClick={copy} disabled={!items.length}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}</button>
        <button type="button" onClick={download} disabled={!items.length}><Download className="h-4 w-4" /> Download</button>
      </div>
    </aside>
  );
}

function Vendors({ w }: { w: Weights }) {
  const items = checklist(w);
  const [names, setNames] = useState<string[]>(["Vendor A", "Vendor B"]);
  const [active, setActive] = useState(0);
  const [ratings, setRatings] = useState<Record<string, Rating | undefined>[]>([{}, {}]);
  const scores = useMemo(() => ratings.map((r) => scoreVendor(w, r)), [ratings, w]);
  const rate = (id: string, r: Rating) => setRatings((all) => all.map((v, i) => (i === active ? { ...v, [id]: r } : v)));
  const add = () => { if (names.length >= 3) return; setNames([...names, `Vendor ${"ABC"[names.length]}`]); setRatings([...ratings, {}]); setActive(names.length); };
  const remove = (i: number) => {
    if (names.length <= 1) return;
    setNames(names.filter((_, k) => k !== i)); setRatings(ratings.filter((_, k) => k !== i)); setActive(0);
  };

  return (
    <div className="sc-vendors">
      <div className="sc-tabs" role="tablist" aria-label="Vendors">
        {names.map((n, i) => (
          <div key={i} className={`sc-tab ${i === active ? "is-on" : ""}`}>
            <button role="tab" type="button" aria-selected={i === active} onClick={() => setActive(i)} className="sc-tab-btn">
              <span className="sc-tab-name">{n || "Unnamed"}</span>
              <span className="sc-tab-score">{scores[i].score}</span>
            </button>
            {names.length > 1 && <button type="button" onClick={() => remove(i)} aria-label={`Remove ${n}`} className="sc-tab-x"><X className="h-3.5 w-3.5" /></button>}
          </div>
        ))}
        {names.length < 3 && <button type="button" onClick={add} className="sc-tab-add"><Plus className="h-4 w-4" /> Add</button>}
      </div>

      <div className="sc-panel" role="tabpanel">
        <label className="sc-name">
          <span>Name</span>
          <input value={names[active]} maxLength={40} onChange={(e) => setNames(names.map((n, i) => (i === active ? e.target.value : n)))} />
        </label>
        <ul className="sc-rate-list">
          {items.map((c) => (
            <li key={c.id} className="sc-rate">
              <span className="sc-rate-label">{c.label}{w[c.id] === 3 && <em> must</em>}</span>
              <span className="sc-seg" role="group" aria-label={`${c.label} for ${names[active]}`}>
                {RATINGS.map((r) => (
                  <button key={r} type="button" aria-pressed={ratings[active][c.id] === r} onClick={() => rate(c.id, r)}>{RATING_LABELS[r]}</button>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <ScoreDial s={scores[active]} name={names[active]} />
      </div>
    </div>
  );
}

function ScoreDial({ s, name }: { s: ReturnType<typeof scoreVendor>; name: string }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <div className="sc-dial" aria-live="polite">
      <svg viewBox="0 0 80 80" className="sc-dial-svg" aria-hidden="true">
        <circle cx="40" cy="40" r={r} className="sc-dial-track" />
        <circle cx="40" cy="40" r={r} className="sc-dial-ink" strokeDasharray={c} strokeDashoffset={c * (1 - s.score / 100)} />
      </svg>
      <div>
        <p className="sc-dial-num">{s.score}<span>/100</span></p>
        <p className="sc-dial-sub">{name || "This vendor"}, against your weights. {s.rated} of {s.total} rated.</p>
        {s.dealbreakers.length > 0 && <p className="sc-dial-flag">Fails a must: {s.dealbreakers.join(", ")}</p>}
      </div>
    </div>
  );
}

export default function SoftwareChooser() {
  const meta = STATIC_PAGE_META[SC_PATH];
  const [w, setW] = useState<Weights>(startWeights);
  const picked = checklist(w);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={meta.title} description={meta.description} canonical={SC_PATH}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Choosing carbon accounting software", url: SC_PATH }]} />
      <MinimalNav />
      <main className="sc">
        <header className="sc-hero">
          <p className="sc-eyebrow">Buyer's scorecard</p>
          <h1 className="sc-title">Every demo looks good. <span>Your questions decide.</span></h1>
          <p className="sc-lede">Set what matters to your business. Your checklist prints as you go, and the same weights then score each vendor you talk to.</p>
        </header>

        <section className="sc-board" aria-label="Weigh what matters">
          <ul className="sc-criteria">
            {CRITERIA.map((c) => (
              <li key={c.id} className={`sc-crit w${w[c.id]}`}>
                <div className="sc-crit-text">
                  <p className="sc-crit-label">{c.label}</p>
                  <p className="sc-crit-why">{c.why}</p>
                </div>
                <span className="sc-weights" role="group" aria-label={`How much ${c.label} matters`}>
                  {WEIGHTS.map((k) => (
                    <button key={k} type="button" aria-pressed={w[c.id] === k} onClick={() => setW({ ...w, [c.id]: k })}>{WEIGHT_LABELS[k]}</button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <Receipt w={w} />
        </section>

        <section className="sc-section">
          <h2 className="sc-h2">Score the vendors on your shortlist</h2>
          <p className="sc-sub">After each demo, mark what you actually saw. A "must" marked No is flagged, whatever the total.</p>
          <Vendors w={w} />
        </section>

        <section className="sc-section">
          <h2 className="sc-h2">Our answers to your list</h2>
          <p className="sc-sub">Senseible, held to the same questions. Where we make no claim, we say so.</p>
          <ul className="sc-ours">
            {picked.map((c) => (
              <li key={c.id}>
                <p className="sc-ours-q">{c.label}</p>
                <p className={c.senseible ? "sc-ours-a" : "sc-ours-a is-none"}>{c.senseible ?? "We make no claim here yet. Ask us, as you would ask anyone."}</p>
              </li>
            ))}
          </ul>
          <p className="sc-more">Comparing with a tool you already know? <Link to="/vs/sweep">Sweep</Link>, <Link to="/vs/persefoni">Persefoni</Link>, <Link to="/vs/watershed">Watershed</Link>, <Link to="/vs/updapt-esg">Updapt</Link>.</p>
        </section>

        <section className="sc-close">
          <h2>The fastest test is your own bill.</h2>
          <p>Upload one electricity bill or GST invoice and check the first three answers on your list yourself, before any call.</p>
          <Link to="/" className="sc-cta">Test it on a bill <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
