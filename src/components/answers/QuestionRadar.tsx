import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Radar, Send } from 'lucide-react';
import { answers } from '@/data/answers';
import { loadAnswerIndex } from '@/lib/answerData';
import { STATIC_PAGE_META } from '@/lib/seo/seoMeta';
import { askLink, scan, slugToQuestion, type RadarHit, type RadarItem } from '@/lib/answerRadar';

// An /answers address with no page: the address is read as the visitor's
// question and the radar sweeps every answer and guide for the closest ones.
// The visitor can retype the question to steer the scan, open a hit, or ask
// us to answer it (contact form prefilled). Reduced motion: no sweep, results
// show at once.

const ANSWER_ITEMS: RadarItem[] = [
  ...answers.map((a) => ({ kind: 'answer' as const, title: a.q, to: `/answers/${a.slug}`, text: `${a.title} ${a.short}` })),
  // Free tools: a question that a calculator answers should find the calculator.
  ...Object.entries(STATIC_PAGE_META)
    .filter(([path]) => path.startsWith('/calculators/') || path === '/cbam-calculator' || path === '/green-loan-check')
    .map(([path, m]) => ({ kind: 'tool' as const, title: m.title.replace(/ \| Senseible$/, ''), to: path, text: m.description })),
];
// Where each of the (up to) three blips sits on the radar, in degrees.
const ANGLES = [-35, 85, 205];
const STRENGTH: Record<RadarHit['strength'], string> = { strong: 'Strong match', close: 'Close match', related: 'Related' };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function QuestionRadar({ slug }: { slug: string }) {
  const [question, setQuestion] = useState(() => slugToQuestion(slug));
  const [asked, setAsked] = useState(question);
  const [items, setItems] = useState<RadarItem[]>(ANSWER_ITEMS);
  const [scanning, setScanning] = useState(!prefersReducedMotion());
  const timer = useRef<number>();

  // Library answers and guides join the scan once their indexes load (kept out of the first bundle).
  useEffect(() => {
    let live = true;
    void Promise.all([
      loadAnswerIndex(),
      import('@/data/articleIndex').then((m) => m.articleIndex).catch(() => []),
    ]).then(([library, guides]) => {
      if (!live) return;
      setItems([
        ...ANSWER_ITEMS,
        ...library.map((e) => ({ kind: 'answer' as const, title: e.q, to: `/answers/${e.slug}`, text: e.title })),
        ...guides.map((g) => ({ kind: 'guide' as const, title: g.title, to: `/climate-intelligence/${g.slug}`, text: `${g.subtitle} ${g.tags.join(' ')}` })),
      ]);
    });
    return () => { live = false; };
  }, []);

  const sweep = (ms: number) => {
    window.clearTimeout(timer.current);
    if (prefersReducedMotion()) { setScanning(false); return; }
    setScanning(true);
    timer.current = window.setTimeout(() => setScanning(false), ms);
  };
  useEffect(() => { sweep(1400); return () => window.clearTimeout(timer.current); }, []);

  const hits = useMemo(() => scan(asked, items), [asked, items]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setAsked(q);
    sweep(900);
  };

  return (
    <div className="container max-w-2xl mx-auto px-5 py-14 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Answers</p>
      <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">This answer is not written yet</h1>
      <p className="mt-3 text-muted-foreground">We scanned everything we have for the closest match. Change the question to steer the radar.</p>

      <form onSubmit={submit} className="mt-6 flex gap-2">
        <label htmlFor="radar-q" className="sr-only">Your question</label>
        <input
          id="radar-q"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={140}
          className="h-12 min-w-0 flex-1 rounded-full border border-border bg-background px-5 text-[15px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button type="submit" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground">
          <Radar className="h-4 w-4" aria-hidden="true" />Scan
        </button>
      </form>

      <div className="mt-8 grid items-center gap-8 sm:grid-cols-[220px_1fr]">
        <svg viewBox="0 0 220 220" className="mx-auto w-48 sm:w-full" role="img" aria-label={scanning ? 'Scanning' : `${hits.length} matches found`}>
          <circle cx="110" cy="110" r="104" className="fill-primary/5 stroke-primary/30" strokeWidth="1.5" />
          {[70, 36].map((r) => <circle key={r} cx="110" cy="110" r={r} fill="none" className="stroke-primary/20" strokeWidth="1" />)}
          <path d="M110 6v208M6 110h208" className="stroke-primary/15" strokeWidth="1" />
          {scanning && (
            <g className="origin-center animate-spin motion-reduce:animate-none" style={{ animationDuration: '1.6s', transformOrigin: '110px 110px' }}>
              <path d="M110 110 L110 6 A104 104 0 0 1 200 58 Z" className="fill-primary/25" />
              <path d="M110 110 L110 6" className="stroke-primary" strokeWidth="2" />
            </g>
          )}
          {!scanning && hits.map((h, i) => {
            const r = 16 + (1 - h.score) * 82;
            const a = (ANGLES[i] * Math.PI) / 180;
            const x = 110 + r * Math.cos(a), y = 110 + r * Math.sin(a);
            return (
              <g key={h.to}>
                <circle cx={x} cy={y} r="10" className="fill-primary/20 animate-ping motion-reduce:animate-none" style={{ transformOrigin: `${x}px ${y}px`, animationDuration: '2.2s' }} />
                <circle cx={x} cy={y} r="9" className="fill-primary" />
                <text x={x} y={y + 4} textAnchor="middle" className="fill-primary-foreground text-[11px] font-semibold">{i + 1}</text>
              </g>
            );
          })}
          <circle cx="110" cy="110" r="4" className="fill-primary" />
        </svg>

        <div aria-live="polite">
          {scanning ? (
            <p className="text-sm text-muted-foreground">Scanning answers and guides…</p>
          ) : hits.length ? (
            <ol className="space-y-2.5">
              {hits.map((h, i) => (
                <li key={h.to}>
                  <Link to={h.to} className="group flex items-start gap-3 rounded-xl border border-border p-3.5 transition-colors hover:border-primary/50 hover:bg-primary/5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium leading-snug group-hover:text-primary">{h.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{h.kind === 'answer' ? 'Answer' : h.kind === 'tool' ? 'Free tool' : 'Guide'} · {STRENGTH[h.strength]}</span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 opacity-40 group-hover:opacity-100" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[15px]">Nothing on the radar for this one yet. Ask us and we will write it.</p>
          )}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to={askLink(asked)} className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground">
          <Send className="h-4 w-4" aria-hidden="true" />Ask us to answer this
        </Link>
        <Link to="/answers" className="inline-flex h-11 items-center rounded-full border border-border px-6 font-medium hover:bg-secondary">See all answers</Link>
      </div>
    </div>
  );
}

export default QuestionRadar;
