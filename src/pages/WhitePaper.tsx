import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Printer, Mail } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { STATIC_PAGE_META } from '@/lib/seo/seoMeta';
import { MathExpr, Prose } from '@/components/whitepaper/MathText';
import { DataModelFigure, FlowFigure, SupplierFlowFigure, UncertaintyFigure } from '@/components/whitepaper/WhitePaperFigures';
import { HashWidget, ProrationWidget, RoundingWidget, Scope2Widget } from '@/components/whitepaper/WhitePaperWidgets';
import {
  WP_CONTACT, WP_NUMBERS, WP_PATH, WP_PUBLISHED, WP_SECTIONS, WP_TAGLINE, WP_TITLE,
  type WPBlock, type WPFigure, type WPWidget,
} from '@/data/whitePaper';
import './whitePaper.css';

// The White Paper as a readable, checkable document. Pattern: a living paper.
// Each section keeps its text and equations, and the equation that carries
// the section's point can be run in place (Scope 2 split, period proration,
// uncertainty floor, rounding check, hash chain, data flow). The hero traces
// one figure back to its source. Reduced motion: the trace is drawn, still.

const FIGURES: Record<WPFigure, () => JSX.Element> = { uncertainty: UncertaintyFigure, datamodel: DataModelFigure, flow: FlowFigure, supplierflow: SupplierFlowFigure };
const WIDGETS: Record<WPWidget, () => JSX.Element | null> = { scope2: Scope2Widget, proration: ProrationWidget, rounding: RoundingWidget, hash: HashWidget };

const EQ_COUNT = WP_NUMBERS.eq.size;
const READ_MINUTES = Math.round(
  JSON.stringify(WP_SECTIONS).split(/\s+/).length / 200,
);
const PUBLISHED_LABEL = new Date(`${WP_PUBLISHED}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function Table({ head, rows, variant }: { head: string[]; rows: string[][]; variant?: 'isnot' | 'notation' }) {
  const [side, setSide] = useState(0);
  if (variant === 'isnot') {
    return (
      <div className="wp-isnot">
        <div className="wp-seg wp-noprint" role="group" aria-label="Show">
          {head.map((h, i) => (
            <button key={h} type="button" aria-pressed={side === i} className={side === i ? 'wp-seg-on' : ''} onClick={() => setSide(i)}>{h}</button>
          ))}
        </div>
        <div className="wp-isnot-grid" data-side={side}>
          {head.map((h, c) => (
            <div key={h} className={`wp-isnot-col wp-isnot-${c}`}>
              <p className="wp-isnot-h">{h}</p>
              <ul>{rows.map((r) => <li key={r[c]}>{r[c]}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    );
  }
  // Short first columns (step numbers) read better as a table than as cards.
  const keep = variant === 'notation' || head.length <= 2 || rows.every((r) => r[0].length <= 3);
  return (
    <div className="wp-table-wrap">
      <table className={`wp-table ${keep ? 'wp-table-keep' : ''}`}>
        <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => <td key={j} data-label={head[j]}><Prose text={c} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Block({ b }: { b: WPBlock }): ReactNode {
  if ('p' in b) return <p className="wp-p"><Prose text={b.p} /></p>;
  if ('ul' in b) return <ul className="wp-ul">{b.ul.map((li) => <li key={li}><Prose text={li} /></li>)}</ul>;
  if ('h3' in b) return <h3 id={b.id} className="wp-h3">{b.h3}</h3>;
  if ('eq' in b) {
    const n = WP_NUMBERS.eq.get(b.id);
    return (
      <div className="wp-eq" id={`eq-${b.id}`} role="math" aria-label={`Equation ${n}`}>
        <div className="wp-eq-parts">{b.eq.map((part) => <span key={part} className="wp-eq-part"><MathExpr src={part} /></span>)}</div>
        <span className="wp-eq-n">({n})</span>
      </div>
    );
  }
  if ('plain' in b) return <p className="wp-plain"><span className="wp-plain-k">What it means.</span> <Prose text={b.plain} /></p>;
  if ('example' in b) return <div className="wp-example"><p className="wp-callout-k">{b.label ?? 'Example'}</p><p><Prose text={b.example} /></p></div>;
  if ('note' in b) return <div className="wp-note"><p className="wp-callout-k">{b.label ?? 'Note'}</p><p><Prose text={b.note} /></p></div>;
  if ('table' in b) return <Table {...b.table} />;
  if ('figure' in b) {
    const F = FIGURES[b.figure];
    return (
      <figure className="wp-figure" id={`fig-${b.id}`}>
        <p className="wp-fig-title">{b.title}</p>
        <F />
        <figcaption>Figure {WP_NUMBERS.fig.get(b.id)}. {b.caption}</figcaption>
      </figure>
    );
  }
  if ('widget' in b) {
    const Wd = WIDGETS[b.widget];
    return <Wd />;
  }
  return null;
}

/** Hero: one figure traced back to its source. */
function Trace() {
  const nodes = [
    { k: 'Source file', v: 'SHA-256 fingerprint' },
    { k: 'Invoice line', v: 'Diesel 100 L' },
    { k: 'Equation (1)', v: '100 × 2.5' },
    { k: 'Figure', v: '250 kgCO₂e' },
  ];
  return (
    <ol className="wp-trace" aria-label="A figure traced to its source: source file, invoice line, equation, figure">
      {nodes.map((n, i) => (
        <li key={n.k} className="wp-trace-node" style={{ ['--i' as string]: i }}>
          <span className="wp-trace-k">{n.k}</span>
          <span className="wp-trace-v">{n.v}</span>
        </li>
      ))}
    </ol>
  );
}

export default function WhitePaper() {
  const meta = STATIC_PAGE_META[WP_PATH];
  const [active, setActive] = useState(WP_SECTIONS[0].id);
  const barRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);

  // Scrollspy for the contents list.
  useEffect(() => {
    const els = WP_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!('IntersectionObserver' in window) || !els.length) return;
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.id);
    }, { rootMargin: '-15% 0px -70% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Reading progress, written straight to the bar (no re-render per scroll).
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = articleRef.current, bar = barRef.current;
      if (!el || !bar) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
      bar.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const contents = (
    <ol className="wp-toc-list">
      {WP_SECTIONS.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className={active === s.id ? 'wp-toc-on' : ''} aria-current={active === s.id ? 'location' : undefined}>{s.title}</a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="wp-root min-h-screen bg-background">
      <SEOHead
        title={meta.title}
        description={meta.description}
        canonical={WP_PATH}
        type="article"
        article={{ publishedTime: WP_PUBLISHED, modifiedTime: WP_PUBLISHED, author: 'Senseible' }}
        breadcrumbs={[{ name: 'Home', url: '/' }, { name: 'White Paper', url: WP_PATH }]}
      />
      <div className="wp-progress wp-noprint" aria-hidden="true"><div ref={barRef} /></div>
      <div className="wp-noprint"><Navigation /></div>

      <header className="wp-hero">
        <div className="wp-wrap">
          <p className="wp-kicker">Senseible</p>
          <h1 className="wp-h1">Senseible {WP_TITLE}</h1>
          <p className="wp-tagline">{WP_TAGLINE}</p>
          <Trace />
          <p className="wp-meta">Published {PUBLISHED_LABEL} · 12 sections · {EQ_COUNT} equations, each explained in words · about {READ_MINUTES} min read</p>
          <div className="wp-actions wp-noprint">
            <a href="#intended-use" className="wp-btn wp-btn-primary">Start reading</a>
            <button type="button" className="wp-btn" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" />Print or save as PDF</button>
          </div>
          <p className="wp-fine">Please read the <a href="#disclaimer">Legal Disclaimer</a> at the end.</p>
        </div>
      </header>

      <div className="wp-wrap wp-layout">
        <aside className="wp-toc wp-noprint" aria-label="Contents">
          <p className="wp-toc-h">Contents</p>
          {contents}
        </aside>

        <main>
          <details className="wp-toc-mobile wp-noprint">
            <summary>Contents</summary>
            {contents}
          </details>

          <article ref={articleRef} className="wp-article">
            {WP_SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="wp-section" aria-labelledby={`${s.id}-h`}>
                <h2 id={`${s.id}-h`} className="wp-h2">{s.title}</h2>
                {s.blocks.map((b, i) => <Block key={i} b={b} />)}
              </section>
            ))}
          </article>

          <aside className="wp-end wp-noprint">
            <p className="wp-end-h">Reviewing Senseible for an audit or a lender?</p>
            <p>Send questions, feedback or a security or compliance review request. Methodology documentation, the DPA and questionnaires are shared under NDA.</p>
            <div className="wp-actions">
              <a href={`mailto:${WP_CONTACT}?subject=${encodeURIComponent('White Paper review')}`} className="wp-btn wp-btn-primary"><Mail className="h-4 w-4" aria-hidden="true" />{WP_CONTACT}</a>
              <Link to="/trust" className="wp-btn">Trust and validation</Link>
              <Link to="/emission-factors" className="wp-btn">Emission factor library</Link>
            </div>
          </aside>
        </main>
      </div>

      <div className="wp-noprint"><Footer /></div>
    </div>
  );
}
