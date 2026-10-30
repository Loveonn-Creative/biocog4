import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Search } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { STATIC_PAGE_META } from "@/lib/seo/seoMeta";
import { prefersReducedMotion } from "@/components/services/motion/kit";
import {
  ATTRIBUTES, BILL_DOCS, BRSR_FAQS, BRSR_HUB_PATH, FIELDS, NEEDS, RULE_ROWS, RUNGS, SUPPLIER_LINES,
  principle6, type FieldId, type RungId,
} from "@/data/brsrHub";
import "./brsrReporting.css";

// /brsr-reporting. A hub for BRSR and BRSR Core. Each section carries one device:
// a hero where the reader picks their side and the value chain asks light up, a jump bar that follows the reader, a market-cap ladder, a nine-part wheel,
// a then-and-now flip, a bill board whose totals recount, and a live answer filter.
// Facts and their sources live in src/data/brsrHub.ts.

const SECTIONS = [
  { id: "who-files", label: "Who files" },
  { id: "brsr-core", label: "BRSR Core" },
  { id: "value-chain", label: "Value chain" },
  { id: "from-bills", label: "From bills" },
  { id: "answers", label: "Find an answer" },
];

/** Becomes true once the element scrolls into view (at once when motion is reduced). */
function useSeen<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

/** Eases a number toward its target; jumps straight there when motion is reduced. */
function useTween(target: number, run: boolean, ms = 600) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (!run) return;
    if (prefersReducedMotion()) { from.current = target; setV(target); return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const val = a + (target - a) * (1 - (1 - p) ** 3);
      from.current = val;
      setV(val);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

/* ---------- Jump bar: follows the section in view ---------- */

function JumpBar() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
    }, { rootMargin: "-45% 0px -50% 0px" });
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el); });
    // Above the first section nothing is current.
    const first = document.getElementById(SECTIONS[0].id);
    const onScroll = () => { if (first && first.getBoundingClientRect().top > window.innerHeight * 0.5) setActive(null); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);
  return (
    <nav className="brh-jump" aria-label="On this page">
      <ol>
        {SECTIONS.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} aria-current={active === s.id ? "true" : undefined}>
              <span aria-hidden="true">{i + 1}</span>{s.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ---------- Who files: the ladder ---------- */

function Ladder() {
  const [id, setId] = useState<RungId>("top150");
  const [ref, seen] = useSeen<HTMLDivElement>();
  const rung = RUNGS.find((r) => r.id === id)!;
  const climb = [...RUNGS].sort((a, b) => a.step - b.step);
  return (
    <div className="brh-ladder" ref={ref} data-seen={seen}>
      <div className="brh-steps" role="radiogroup" aria-label="Your company">
        {climb.map((r) => (
          <button key={r.id} type="button" role="radio" aria-checked={r.id === id} onClick={() => setId(r.id)}
            className="brh-step" style={{ "--h": r.step, "--d": `${(r.step - 1) * 70}ms` } as CSSProperties}>
            <span className="brh-step-bar" aria-hidden="true" />
            <span className="brh-step-label">{r.label}</span>
          </button>
        ))}
      </div>
      <dl className="brh-verdict" aria-live="polite" key={rung.id}>
        <div><dt>BRSR</dt><dd>{rung.brsr}</dd></div>
        <div><dt>BRSR Core check</dt><dd>{rung.core}</dd></div>
        <div><dt>Value chain disclosure</dt><dd>{rung.valueChain}</dd></div>
      </dl>
    </div>
  );
}

/* ---------- BRSR Core: nine-part wheel ---------- */

const C = 120, R1 = 112, R0 = 66, GAP = 0.035;
const polar = (r: number, a: number) => [C + r * Math.sin(a), C - r * Math.cos(a)];
function arcPath(i: number) {
  const span = (Math.PI * 2) / 9;
  const a0 = i * span + GAP, a1 = (i + 1) * span - GAP;
  const [x0, y0] = polar(R1, a0), [x1, y1] = polar(R1, a1), [x2, y2] = polar(R0, a1), [x3, y3] = polar(R0, a0);
  return `M${x0} ${y0} A${R1} ${R1} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${R0} ${R0} 0 0 0 ${x3} ${y3} Z`;
}
const nudge = (i: number) => {
  const mid = ((i + 0.5) * Math.PI * 2) / 9;
  return `translate(${(6 * Math.sin(mid)).toFixed(2)}px, ${(-6 * Math.cos(mid)).toFixed(2)}px)`;
};
const GROUP_LABEL = { environment: "Environment", people: "People", business: "Business conduct" } as const;

function CoreWheel() {
  const [n, setN] = useState(1);
  const a = ATTRIBUTES[n - 1];
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!next) return;
    e.preventDefault();
    const to = ((n - 1 + next + 9) % 9) + 1;
    setN(to);
    (e.currentTarget.querySelector(`[data-n="${to}"]`) as SVGPathElement | null)?.focus();
  };
  return (
    <div className="brh-core">
      <div className="brh-wheel-wrap">
        <svg viewBox="0 0 240 240" className="brh-wheel">
          <g role="radiogroup" aria-label="BRSR Core attribute" onKeyDown={onKey}>
            {ATTRIBUTES.map((x, i) => (
              <path key={x.n} d={arcPath(i)} data-n={x.n} data-group={x.group} role="radio" aria-checked={x.n === n}
                aria-label={`${x.n}. ${x.name}`} tabIndex={x.n === n ? 0 : -1} className="brh-arc"
                style={{ transform: x.n === n ? nudge(i) : undefined }}
                onClick={() => setN(x.n)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setN(x.n); } }} />
            ))}
            {ATTRIBUTES.map((x, i) => {
              const [tx, ty] = polar((R0 + R1) / 2, ((i + 0.5) * Math.PI * 2) / 9);
              return <text key={x.n} x={tx} y={ty} className="brh-arc-n" data-on={x.n === n} aria-hidden="true">{x.n}</text>;
            })}
          </g>
          <text x={C} y={C - 4} className="brh-wheel-big" aria-hidden="true">{n}</text>
          <text x={C} y={C + 18} className="brh-wheel-small" aria-hidden="true">of 9</text>
        </svg>
        <ul className="brh-legend" aria-hidden="true">
          {(["environment", "people", "business"] as const).map((g) => <li key={g} data-group={g}><i />{GROUP_LABEL[g]}</li>)}
        </ul>
      </div>
      <article className="brh-attr" aria-live="polite" key={a.n}>
        <p className="brh-eyebrow">{GROUP_LABEL[a.group]}</p>
        <h3 className="brh-attr-name">{a.name}</h3>
        <p className="brh-attr-k">Asks for</p>
        <ul className="brh-attr-asks">{a.asks.map((s) => <li key={s}>{s}</li>)}</ul>
        <p className="brh-attr-k">Proved by</p>
        <p className="brh-attr-records">{a.records}</p>
        {a.fromBills && <p className="brh-attr-bills">{a.fromBills}</p>}
        {a.link && <Link to={a.link.to} className="brh-link">{a.link.label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
      </article>
    </div>
  );
}

/* ---------- Value chain: then and now ---------- */

function RuleFlip() {
  const [now, setNow] = useState(true);
  return (
    <div className="brh-flip" data-now={now}>
      <div className="brh-toggle" role="radiogroup" aria-label="Which rules">
        <button type="button" role="radio" aria-checked={!now} onClick={() => setNow(false)}>July 2023</button>
        <button type="button" role="radio" aria-checked={now} onClick={() => setNow(true)}>March 2025, now</button>
        <span className="brh-toggle-thumb" aria-hidden="true" />
      </div>
      <dl className="brh-rules" aria-live="polite">
        {RULE_ROWS.map((r) => (
          <div key={r.what} className="brh-rule">
            <dt>{r.what}</dt>
            <dd key={String(now)} className="brh-rule-now">{now ? r.y2025 : r.y2023}</dd>
            {now && <dd className="brh-rule-was"><span className="sr-only">Was: </span>{r.y2023}</dd>}
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ---------- From bills: totals recount as documents switch ---------- */

const fmt = (v: number, unit: string) => unit === "GJ"
  ? Math.round(v).toLocaleString("en-IN")
  : unit === "%" ? String(Math.round(v)) : v.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function FieldValue({ id, value, run, unit }: { id: FieldId; value: number; run: boolean; unit: string }) {
  const v = useTween(value, run);
  return <span className="brh-field-v" data-field={id}>{fmt(v, unit)}</span>;
}

function BillBoard() {
  const [on, setOn] = useState<string[]>(BILL_DOCS.map((d) => d.id));
  const [focus, setFocus] = useState<string | null>(null);
  const [ref, seen] = useSeen<HTMLDivElement>();
  const totals = useMemo(() => principle6(on), [on]);
  const lit = new Set(BILL_DOCS.find((d) => d.id === focus)?.feeds ?? []);
  const toggle = (id: string) => setOn((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  return (
    <div className="brh-board" ref={ref}>
      <ul className="brh-docs">
        {BILL_DOCS.map((d) => (
          <li key={d.id}>
            <button type="button" aria-pressed={on.includes(d.id)} className="brh-doc" onClick={() => toggle(d.id)}
              onMouseEnter={() => setFocus(d.id)} onMouseLeave={() => setFocus(null)} onFocus={() => setFocus(d.id)} onBlur={() => setFocus(null)}>
              <span className="brh-doc-name">{d.name}</span>
              <span className="brh-doc-qty">{d.qty.toLocaleString("en-IN")} {d.unit}</span>
              <span className="brh-doc-feeds">Feeds {d.scope === 1 ? "Scope 1" : "Scope 2"} and total energy</span>
              <span className="brh-doc-switch" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="brh-fields" aria-live="polite">
        {FIELDS.map((f) => (
          <div key={f.id} className="brh-field" data-lit={lit.has(f.id)}>
            <span className="brh-field-k">{f.label}</span>
            <span><FieldValue id={f.id} value={totals[f.id]} run={seen} unit={f.unit} /> <span className="brh-field-u">{f.unit}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Find an answer ---------- */

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, " ");
function Marked({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return <>{text.split(re).map((p, i) => i % 2 ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>)}</>;
}

function AnswerFinder() {
  const [q, setQ] = useState("");
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const groups = NEEDS.map((g) => ({
    ...g,
    hits: g.items.filter((it) => terms.every((t) => norm(`${it.q} ${g.label}`).includes(t))),
  })).filter((g) => g.hits.length);
  const count = groups.reduce((s, g) => s + g.hits.length, 0);
  return (
    <div className="brh-finder">
      <label htmlFor="brh-q" className="brh-finder-label">What are you stuck on?</label>
      <div className="brh-finder-box">
        <Search className="h-4 w-4" aria-hidden="true" />
        <input id="brh-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try PPP, diesel, waste or supplier" autoComplete="off" />
      </div>
      <p className="brh-finder-count" aria-live="polite">{count ? `${count} answer${count === 1 ? "" : "s"}` : "No match. Try a shorter word, or ask us below."}</p>
      <div className="brh-needs">
        {groups.map((g) => (
          <section key={g.id} className="brh-need" aria-labelledby={`need-${g.id}`}>
            <h3 id={`need-${g.id}`}>{g.label}</h3>
            <ul>
              {g.hits.map((it) => (
                <li key={it.slug}>
                  <Link to={`/answers/${it.slug}`}><Marked text={it.q} terms={terms} /><ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {!count && <Link to="/contact" className="brh-link">Ask us your question <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
    </div>
  );
}

/* ---------- Hero: pick your side, the value chain asks light up ---------- */

type Side = "supplier" | "listed";
// Asks: SUPPLIER_LINES[2]. Records: ATTRIBUTES 1 to 4. Only Scope 1 and 2 and
// energy are built from bills (ATTRIBUTES fromBills). Rules: RULE_ROWS and RUNGS.
const CHAIN_ASKS = [
  { ask: "Scope 1 and 2 emissions", record: "From fuel invoices and electricity bills", bills: true },
  { ask: "Total energy", record: "From electricity bills and fuel invoices", bills: true },
  { ask: "Water", record: "From water supply bills, borewell meter readings, tanker invoices", bills: false },
  { ask: "Waste", record: "From weighbridge slips, waste manifests, recycler receipts", bills: false },
];
const SIDE_COPY: Record<Side, { head: string; rule: string }> = {
  supplier: {
    head: "What your customer will ask you for",
    rule: "Your customer counts you only if you alone are 2% or more of its purchases or sales. No law makes you send figures. Your contract or its supplier code can.",
  },
  listed: {
    head: "What you ask each partner for",
    rule: "Include any partner that alone is 2% or more of your purchases or sales. You can stop once they cover 75%. Voluntary from FY 2025-26.",
  },
};

function ChainAsks() {
  const [side, setSide] = useState<Side>("supplier");
  const c = SIDE_COPY[side];
  return (
    <div className="brh-chain" data-side={side}>
      <div className="brh-chain-pick" role="radiogroup" aria-label="Your side of the value chain">
        <button type="button" role="radio" aria-checked={side === "supplier"} onClick={() => setSide("supplier")}>We're a supplier</button>
        <button type="button" role="radio" aria-checked={side === "listed"} onClick={() => setSide("listed")}>We're listed</button>
      </div>
      <div className="brh-chain-path" aria-hidden="true">
        <span className="brh-node" data-you={side === "supplier"}>Supplier{side === "supplier" && <em>You</em>}</span>
        <span className="brh-wire"><i key={side} /><b>{side === "supplier" ? "Your figures, April to March" : "You ask for April to March"}</b></span>
        <span className="brh-node" data-you={side === "listed"}>Listed company<small>top 250</small>{side === "listed" && <em>You</em>}</span>
      </div>
      <p className="brh-chain-head">{c.head}</p>
      <ol className="brh-asks" key={side} aria-live="polite">
        {CHAIN_ASKS.map((a, i) => (
          <li key={a.ask} style={{ "--i": i } as CSSProperties} data-bills={a.bills}>
            <span className="brh-ask">{a.ask}</span>
            <span className="brh-ask-rec">{a.record}</span>
            <span className="brh-ask-tag">{a.bills ? (side === "supplier" ? "Read from your bills" : "Read from their bills") : (side === "supplier" ? "Your own records" : "Their own records")}</span>
          </li>
        ))}
      </ol>
      <p className="brh-chain-rule" key={`r-${side}`}>{c.rule}</p>
    </div>
  );
}

/* ---------- Page ---------- */

export default function BrsrReporting() {
  const meta = STATIC_PAGE_META[BRSR_HUB_PATH];
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={meta.title} description={meta.description} canonical={BRSR_HUB_PATH} faqSchema={BRSR_FAQS}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "BRSR reporting", url: BRSR_HUB_PATH }]} />
      <MinimalNav />
      <main className="brh">
        <header className="brh-hero">
          <div className="brh-hero-copy">
            <p className="brh-eyebrow">BRSR and BRSR Core</p>
            <h1 className="brh-title">BRSR in plain words. <span>Your bills already hold the energy and emissions figures.</span></h1>
            <p className="brh-lede">From FY 2025-26, India's top 250 listed companies can choose to report on their suppliers. Here is what they ask for, and the paper that answers each question.</p>
            <div className="brh-hero-cta">
              <Link to="/" className="brh-cta">Turn a bill into BRSR figures <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <span className="brh-cta-note">Free. No sign-up to read a bill.</span>
            </div>
          </div>
          <ChainAsks />
        </header>

        <JumpBar />

        <section id="who-files" className="brh-section" aria-labelledby="who-files-h">
          <h2 id="who-files-h" className="brh-h2">Where does your company sit?</h2>
          <p className="brh-sub">SEBI goes by market capitalisation rank. Tap your place on the ladder.</p>
          <Ladder />
        </section>

        <section id="brsr-core" className="brh-section" aria-labelledby="brsr-core-h">
          <h2 id="brsr-core-h" className="brh-h2">BRSR Core: nine attributes an independent provider checks</h2>
          <p className="brh-sub">Tap one to see what it asks for and which records prove it. Since March 2025 the check can be an assessment or an assurance, by a provider with no conflict of interest.</p>
          <CoreWheel />
        </section>

        <section id="value-chain" className="brh-section" aria-labelledby="value-chain-h">
          <h2 id="value-chain-h" className="brh-h2">Value chain rules, then and now</h2>
          <p className="brh-sub">SEBI rewrote them in March 2025. Flip to compare.</p>
          <RuleFlip />
          <div className="brh-supplier">
            <h3>If you supply a listed company</h3>
            <ul>{SUPPLIER_LINES.map((l) => <li key={l}>{l}</li>)}</ul>
            <div className="brh-links">
              <Link to="/templates/brsr-supplier-questionnaire" className="brh-link">Get the supplier questionnaire template <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
              <Link to="/enterprise" className="brh-link">See how enterprises collect figures from many suppliers <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section id="from-bills" className="brh-section" aria-labelledby="from-bills-h">
          <h2 id="from-bills-h" className="brh-h2">From last year's bills to four BRSR figures</h2>
          <p className="brh-sub">One example plant, April to March. Switch a document off to see what it feeds.</p>
          <BillBoard />
          <p className="brh-trap"><b>The usual slip:</b> units from your own diesel generator are not electricity. Count the diesel once, under Scope 1, and leave its units out of Scope 2.</p>
          <p className="brh-body">Senseible reads the units, litres and kilograms off each bill, keeps the factor and its source on every line, and drafts the BRSR energy and emissions fields from them. You review the draft; the BRSR Core check comes from an independent provider.</p>
          <Link to="/esg-report-sample" className="brh-link">See a sample report with its BRSR Core map <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
        </section>

        <section id="answers" className="brh-section" aria-labelledby="answers-h">
          <h2 id="answers-h" className="brh-h2">Find the answer for your exact line</h2>
          <p className="brh-sub">Our BRSR answers, grouped by the part of the report you are filling in.</p>
          <AnswerFinder />
        </section>

        <section className="brh-section" aria-labelledby="faq-h">
          <h2 id="faq-h" className="brh-h2">Short answers</h2>
          <div className="brh-faq">
            {BRSR_FAQS.map((f) => (
              <details key={f.question}>
                <summary>{f.question}</summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="brh-close">
          <h2>Your BRSR figures start with last year's bills.</h2>
          <p>Upload one electricity bill or fuel invoice. You see the units read from it, the emissions, and the factor used on each line.</p>
          <Link to="/" className="brh-cta brh-cta-inverse">Turn a bill into BRSR figures <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <p className="brh-close-note">Free. No sign-up to read a bill.</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
