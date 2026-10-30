import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, ChevronDown } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { STATIC_PAGE_META, canonicalUrl } from "@/lib/seo/seoMeta";
import {
  GUIDE_BY_ID, GUIDE_BY_PATH, MARK_LABEL, formatDay, itemListLd, lastChecked, rankFor,
  type Fit, type Guide, type Mark, type Situation,
} from "@/data/softwareGuides";
import "./softwareGuides.css";

// The nine software guides share this page. One interaction carries the
// meaning: the reader says who they are, the list re-orders by fit (each item
// slides to its new place) and says why it fits, and the comparison table and
// "how to choose" list put the criteria that matter for that reader first.
// Facts and sources: src/data/softwareGuides.ts.

function fitWord(fit: number) {
  if (fit >= 0.75) return "Strong fit";
  if (fit >= 0.4) return "Some fit";
  return "Little fit";
}

/** Lower-cases a leading word, but leaves acronyms and names (EU, CSRD, Indian) alone. */
function lowerFirst(t: string) {
  const w = t.split(" ")[0];
  if (w.length > 1 && w === w.toUpperCase()) return t;
  return /^(Indian|India|Scope|SOC|ISO|BRSR|CBAM)\b/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1);
}

/** What a situation weighs most, in words, for the live summary line. */
function weighedMost(g: Guide, s: Situation): string[] {
  const crit = Object.fromEntries(g.criteria.map(c => [c.id, c.short]));
  return Object.entries(s.weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => lowerFirst(k.startsWith("tag:") ? g.tagLabels[k.slice(4)] : crit[k]));
}

/** Slides re-ordered items from their old place to the new one. Skipped under reduced motion. */
function useFlip(order: string) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const prev = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, number>();
    nodes.current.forEach((el, k) => next.set(k, el.offsetTop));
    if (!reduce && prev.current.size) {
      nodes.current.forEach((el, k) => {
        const before = prev.current.get(k);
        const after = next.get(k);
        if (before == null || after == null || before === after) return;
        el.style.transition = "none";
        el.style.transform = `translateY(${before - after}px)`;
        requestAnimationFrame(() => {
          el.style.transition = "transform .5s cubic-bezier(.2,.7,.2,1)";
          el.style.transform = "";
        });
      });
    }
    prev.current = next;
  }, [order]);
  return (k: string) => (el: HTMLElement | null) => { if (el) nodes.current.set(k, el); else nodes.current.delete(k); };
}

function MarkDot({ m, note }: { m: Mark; note?: string }) {
  return (
    <span className={`sg-mark m-${m}`} title={note ?? MARK_LABEL[m]}>
      <span className="sr-only">{MARK_LABEL[m]}</span>
    </span>
  );
}

function Item({ g, f, rank, chosen, refFn }: { g: Guide; f: Fit; rank: number; chosen: boolean; refFn: (el: HTMLElement | null) => void }) {
  const p = f.product;
  const [open, setOpen] = useState(false);
  const detailId = `sg-d-${p.id}`;
  return (
    <li ref={refFn} className={`sg-item ${p.isSenseible ? "is-ours" : ""}`}>
      <span className="sg-rank" aria-hidden="true">{rank}</span>
      <div className="sg-body">
        <div className="sg-head">
          <h3 className="sg-name">{p.name}</h3>
          {p.isSenseible && <span className="sg-ours">Made by Senseible</span>}
        </div>
        {p.vendor && !p.name.toLowerCase().includes(p.vendor.toLowerCase().split(" ")[0]) && <p className="sg-vendor">{p.vendor}</p>}
        {p.status && <p className="sg-status">{p.status}</p>}
        {p.who && <p className="sg-who">{p.who}</p>}
        {p.rating && <p className="sg-rating">{p.rating.score} on {p.rating.site} ({p.rating.count} reviews)</p>}

        {chosen && (
          <div className="sg-fit">
            <div className="sg-fit-row">
              <span className="sg-fit-track" aria-hidden="true"><span className="sg-fit-ink" style={{ transform: `scaleX(${Math.max(f.fit, 0.02)})` }} /></span>
              <span className="sg-fit-word">{fitWord(f.fit)}</span>
            </div>
            {(f.reasons.length > 0 || f.gaps.length > 0) && (
              <ul className="sg-why">
                {f.reasons.map(r => <li key={r} className="is-hit">{r}</li>)}
                {f.gaps.map(r => <li key={r} className="is-gap">{r}</li>)}
              </ul>
            )}
          </div>
        )}

        <dl className="sg-facts">
          {p.bestFor && <div><dt>Best for</dt><dd>{p.bestFor}</dd></div>}
          {p.pricing && <div><dt>{g.priceLabel ?? "Pricing"}</dt><dd>{p.pricing}</dd></div>}
        </dl>

        <button type="button" className="sg-toggle" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen(o => !o)}>
          {open ? "Hide details" : "Capabilities and limits"} <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
        <div id={detailId} className="sg-detail" hidden={!open}>
          <ul className="sg-caps">
            {g.criteria.map(c => {
              const cap = p.caps[c.id] ?? { v: "unknown" as Mark };
              return (
                <li key={c.id}>
                  <MarkDot m={cap.v} />
                  <span><b>{c.short}</b> <span className="sg-cap-v">{MARK_LABEL[cap.v]}</span>{cap.note ? <>. {cap.note}</> : null}</span>
                </li>
              );
            })}
          </ul>
          <div className="sg-sl">
            {p.strengths.length > 0 && <div><p className="sg-sl-h">Strengths</p><ul>{p.strengths.map(s => <li key={s}>{s}</li>)}</ul></div>}
            {p.limits.length > 0 && <div><p className="sg-sl-h">Limits</p><ul>{p.limits.map(s => <li key={s}>{s}</li>)}</ul></div>}
          </div>
          {p.free && <p className="sg-free"><b>Free plan or trial:</b> {p.free}</p>}
        </div>
      </div>
    </li>
  );
}

function Table({ g, ranked, keyCols }: { g: Guide; ranked: Fit[]; keyCols: Set<string> }) {
  return (
    <div className="sg-table-wrap" role="region" aria-label={`${g.h1}: side by side`} tabIndex={0}>
      <table className="sg-table">
        <thead>
          <tr>
            <th scope="col" className="sg-th-name">Tool</th>
            {g.criteria.map(c => (
              <th key={c.id} scope="col" className={keyCols.has(c.id) ? "is-key" : undefined} title={c.label}>{c.short}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranked.map(f => (
            <tr key={f.product.id} className={f.product.isSenseible ? "is-ours" : undefined}>
              <th scope="row" className="sg-th-name">{f.product.name}</th>
              {g.criteria.map(c => {
                const cap = f.product.caps[c.id] ?? { v: "unknown" as Mark };
                return <td key={c.id} className={keyCols.has(c.id) ? "is-key" : undefined}><MarkDot m={cap.v} note={cap.note} /></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SoftwareGuide({ path }: { path: string }) {
  const g = GUIDE_BY_PATH[path];
  const meta = STATIC_PAGE_META[path];
  const [sitId, setSitId] = useState<string | null>(null);
  const sit = g.situations.find(s => s.id === sitId) ?? null;
  const ranked = useMemo(() => rankFor(g, sitId), [g, sitId]);
  const flipRef = useFlip(ranked.map(f => f.product.id).join("|"));
  const keyCols = useMemo(() => new Set(sit ? Object.keys(sit.weights).filter(k => !k.startsWith("tag:")) : []), [sit]);
  const choose = useMemo(() => {
    if (!sit) return g.criteria;
    return [...g.criteria].sort((a, b) => (sit.weights[b.id] ?? 0) - (sit.weights[a.id] ?? 0));
  }, [g, sit]);
  const checked = formatDay(lastChecked(g.id));
  const ld = useMemo(() => JSON.stringify(itemListLd(g, canonicalUrl)), [g]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={meta.title} description={meta.description} canonical={path} type="article" keywords={g.keywords}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: g.h1, url: path }]} />
      <Helmet><script type="application/ld+json">{ld}</script></Helmet>
      <MinimalNav />
      <main className="sg">
        <header className="sg-hero">
          <p className="sg-eyebrow">Buyer’s guide <span aria-hidden="true">·</span> <time dateTime={lastChecked(g.id)}>Checked {checked}</time></p>
          <h1 className="sg-title">{g.h1}</h1>
          <p className="sg-lede">{g.lede}</p>
          <p className="sg-disclosure">{g.disclosure}</p>
        </header>

        <section className="sg-pick" aria-label="Your situation">
          <p className="sg-pick-q" id="sg-pick-q">Which one is you?</p>
          <div className="sg-chips" role="radiogroup" aria-labelledby="sg-pick-q">
            {g.situations.map(s => (
              <button key={s.id} type="button" role="radio" aria-checked={sitId === s.id} className="sg-chip"
                onClick={() => setSitId(sitId === s.id ? null : s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <p className="sg-pick-sum" aria-live="polite">
            {sit
              ? <>Ranked for you. Weighed most: {weighedMost(g, sit).join(", ")}. <button type="button" className="sg-clear" onClick={() => setSitId(null)}>Show the plain list</button></>
              : <>{ranked.length} {ranked.length === 1 ? "entry" : "entries"}, ordered by how many of the checks below each one meets.</>}
          </p>
        </section>

        <ol className="sg-list" aria-label={sit ? `Ranked for: ${sit.label}` : "All entries"}>
          {ranked.map((f, i) => (
            <Item key={f.product.id} g={g} f={f} rank={i + 1} chosen={!!sit} refFn={flipRef(f.product.id)} />
          ))}
        </ol>

        {g.context && (
          <section className="sg-section sg-context">
            <h2 className="sg-h2">{g.context.title}</h2>
            <ul>{g.context.points.map(pt => <li key={pt}>{pt}</li>)}</ul>
          </section>
        )}

        <section className="sg-section">
          <h2 className="sg-h2">Side by side</h2>
          <p className="sg-sub">{sit ? "Columns that matter for you are shaded." : "Pick your situation above and the columns that matter for you are shaded."} The notes behind each mark are in each tool’s details above.</p>
          <p className="sg-legend">
            <span><MarkDot m="yes" /> Yes</span><span><MarkDot m="partly" /> Partly</span><span><MarkDot m="no" /> No</span><span><MarkDot m="unknown" /> Not stated on its site</span>
          </p>
          <Table g={g} ranked={ranked} keyCols={keyCols} />
        </section>

        <section className="sg-section">
          <h2 className="sg-h2">How to choose</h2>
          <p className="sg-sub">The checks behind every mark above, and the question to put to each vendor.</p>
          <ol className="sg-choose">
            {choose.map(c => (
              <li key={c.id} className={sit && sit.weights[c.id] ? "is-key" : undefined}>
                <p className="sg-choose-l">{c.label}{sit && sit.weights[c.id] ? <span className="sg-choose-tag">Matters for you</span> : null}</p>
                <p className="sg-choose-a">Ask: “{c.ask}”</p>
              </li>
            ))}
          </ol>
          {g.next && (
            <p className="sg-next">{g.next.lead} <Link to={g.next.to}>{g.next.label} <ArrowRight className="inline h-4 w-4" aria-hidden="true" /></Link></p>
          )}
        </section>

        {g.related.length > 0 && (
          <nav className="sg-related" aria-label="Related guides">
            <p className="sg-related-h">Related guides</p>
            <ul>
              {g.related.map(id => (
                <li key={id}><Link to={GUIDE_BY_ID[id].path}>{GUIDE_BY_ID[id].h1} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></li>
              ))}
            </ul>
          </nav>
        )}
      </main>
      <Footer />
    </div>
  );
}
