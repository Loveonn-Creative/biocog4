import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { Reveal, useInView } from "@/components/platform/Reveal";
import { StickyCta } from "@/components/lead/LeadKit";
import { GreenWall3D } from "@/components/decarbonize/GreenWall3D";
import { AmbassadorForm } from "@/components/decarbonize/AmbassadorForm";
import { CoinSapling, DropVsOcean, PlaneGlobe, Seal, StacksToLeaf, TricolorStroke, WorkStack } from "@/components/decarbonize/DiDoodles";
import { PROGRAM_CONTACT, LIMITS, type LaneId } from "@/lib/ambassadorApplication";
import { faqs, filter, hero, lanes, ownerSpeak, quote, realFight, rewards, session, sprint, steps } from "@/data/decarbonizeIndia";

const GREEN = "#184d37";
const REWARD_ART = { certificate: Seal, fund: CoinSapling, global: PlaneGlobe, portfolio: WorkStack } as const;

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

/** Eyebrow for each section: a short saffron rule and a label. */
const Eyebrow = ({ children, light = false }: { children: string; light?: boolean }) => (
  <p className={`mb-3 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] ${light ? "text-amber-300" : "text-[#184d37] dark:text-emerald-400"}`}>
    <span aria-hidden="true" className="h-[3px] w-6 rounded-full bg-amber-500" />
    {children}
  </p>
);

/** A card that turns over from what you would say to what the owner hears. */
function SpeakCard({ say, hear, delay }: { say: string; hear: string; delay: number }) {
  const { ref, inView } = useInView<HTMLButtonElement>(0.5);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    if (!inView) return;
    const t = window.setTimeout(() => setFlipped(true), delay);
    return () => window.clearTimeout(t);
  }, [inView, delay]);
  return (
    <button ref={ref} type="button" onClick={() => setFlipped(f => !f)} aria-pressed={flipped}
      aria-label={`You say: ${say}. The owner hears: ${hear}.`}
      className="group h-36 w-full text-left [perspective:900px] focus-visible:outline-none">
      <span className={`relative block h-full w-full rounded-2xl transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
        <span className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-border bg-card p-5 [backface-visibility:hidden]">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">You say</span>
          <span className="text-lg font-medium text-muted-foreground line-through decoration-amber-500/70 decoration-2">{say}</span>
        </span>
        <span className="absolute inset-0 flex flex-col justify-between rounded-2xl p-5 text-[#f7f3e8] [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ background: GREEN }}>
          <span className="text-[11px] uppercase tracking-[0.16em] text-amber-300">The owner hears</span>
          <span className="text-xl font-semibold">{hear}</span>
        </span>
      </span>
    </button>
  );
}

const DecarbonizeIndia = () => {
  const [picked, setPicked] = useState<LaneId[]>([]);
  const toggleLane = (id: LaneId) =>
    setPicked(p => (p.includes(id) ? p.filter(l => l !== id) : p.length >= LIMITS.lanes[1] ? p : [...p, id]));

  return (
    <div className="min-h-screen bg-[#faf6ec] text-foreground dark:bg-background">
      <MinimalNav />

      <main>
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-x-clip">
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-amber-400/15 blur-3xl" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-28 sm:px-6 md:pt-32 lg:grid-cols-[1.05fr_1fr] lg:pb-24">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#184d37]/20 bg-white/60 px-3 py-1 text-xs font-medium text-[#184d37] dark:bg-white/5 dark:text-emerald-300">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {hero.eyebrow}
              </p>
              <h1 className="mt-6 font-semibold tracking-tight">
                <span className="block text-4xl leading-none text-foreground sm:text-5xl">{hero.title[0]}</span>
                <span className="relative mt-1 inline-block text-7xl leading-[0.95] text-[#184d37] sm:text-8xl dark:text-emerald-400">
                  {hero.title[1]}
                  <TricolorStroke className="absolute -bottom-4 left-0 h-6 w-full" />
                </span>
              </h1>
              <p className="mt-8 inline-block -rotate-1 bg-amber-300/80 px-3 py-1 text-sm font-semibold uppercase tracking-[0.12em] text-[#12321f]">{hero.kicker}</p>
              <p className="mt-6 max-w-md text-xl leading-snug sm:text-2xl [text-wrap:balance]">{hero.line}</p>
              <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm text-muted-foreground">
                {hero.rhythm.map((r, i) => (
                  <span key={r} className="flex items-center gap-3">{i > 0 && <span aria-hidden="true" className="h-1 w-1 rounded-full bg-amber-500" />}{r}</span>
                ))}
              </p>
              <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <button type="button" onClick={() => go("lanes")}
                  className="rounded-full px-7 py-4 text-base font-semibold text-[#f7f3e8] shadow-[0_18px_40px_-18px_rgba(24,77,55,.8)] transition hover:-translate-y-0.5" style={{ background: GREEN }}>
                  Claim your lane
                </button>
                <button type="button" onClick={() => go("session")} className="text-sm font-medium text-foreground underline decoration-amber-500 decoration-2 underline-offset-[6px] hover:decoration-[#184d37]">
                  Or meet the team at this week's live session
                </button>
              </div>
              <p className="mt-6 max-w-md text-sm text-muted-foreground">{hero.open}</p>
            </div>
            <GreenWall3D />
          </div>
        </section>

        {/* ---------- Where the carbon is ---------- */}
        <section className="px-4 py-16 sm:px-6 md:py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <Eyebrow>The real fight</Eyebrow>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl [text-wrap:balance]">{realFight.title}</h2>
            </Reveal>
            <div className="mt-10 grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
              <Reveal className="rounded-3xl border border-border bg-white/50 p-6 dark:bg-white/5">
                <DropVsOcean />
                <ul className="mt-4 flex flex-wrap gap-2">
                  {realFight.habits.map(h => <li key={h} className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">{h}</li>)}
                </ul>
                <p className="mt-5 text-base font-medium text-muted-foreground">{realFight.habitsNote}</p>
              </Reveal>
              <Reveal delay={120}>
                <div className="h-full rounded-3xl p-6 text-[#f7f3e8] sm:p-8" style={{ background: GREEN }}>
                  <div className="text-[#f7f3e8]"><StacksToLeaf /></div>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {realFight.sources.map(s => (
                      <li key={s} className="flex items-center gap-2 text-base"><span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />{s}</li>
                    ))}
                  </ul>
                  <p className="mt-6 text-lg font-semibold">{realFight.sourcesNote}</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------- Speak owner ---------- */}
        <section className="border-y border-border/70 bg-white/40 px-4 py-16 sm:px-6 md:py-24 dark:bg-white/[.02]">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <Eyebrow>Speak owner</Eyebrow>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl [text-wrap:balance]">{ownerSpeak.title}</h2>
            </Reveal>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ownerSpeak.pairs.map((p, i) => <SpeakCard key={p.say} say={p.say} hear={p.hear} delay={300 + i * 350} />)}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">Tap a card to turn it back.</p>
            <p className="mt-6 inline-block bg-amber-300/70 px-2 py-1 text-lg font-semibold text-[#12321f]">{ownerSpeak.rule}</p>
          </div>
        </section>

        {/* ---------- Lanes ---------- */}
        <section id="lanes" className="scroll-mt-20 px-4 py-16 sm:px-6 md:py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <Eyebrow>Your lanes</Eyebrow>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl [text-wrap:balance]">One job: get people talking and acting. You choose how.</h2>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Pick the 2 or 3 you are strongest in. They carry straight into your application.</p>
            </Reveal>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lanes.map((l, i) => {
                const on = picked.includes(l.id);
                const full = !on && picked.length >= LIMITS.lanes[1];
                return (
                  <Reveal key={l.id} delay={i * 50}>
                    <button type="button" aria-pressed={on} onClick={() => toggleLane(l.id)}
                      className={`relative h-full w-full rounded-2xl border p-5 text-left transition duration-300 ${on ? "border-transparent text-[#f7f3e8] shadow-[0_20px_40px_-24px_rgba(24,77,55,.9)] -translate-y-1" : "border-border bg-card hover:-translate-y-0.5 hover:border-[#184d37]/40"} ${full ? "opacity-50" : ""}`}
                      style={on ? { background: GREEN } : undefined}>
                      <span className={`absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full border text-xs ${on ? "border-amber-300 bg-amber-300 text-[#12321f]" : "border-border text-transparent"}`} aria-hidden="true">
                        {on ? picked.indexOf(l.id) + 1 : ""}
                      </span>
                      <span className="block pr-8 text-lg font-semibold">{l.label}</span>
                      <span className={`mt-2 block text-sm leading-relaxed ${on ? "text-[#f7f3e8]/85" : "text-muted-foreground"}`}>{l.line}</span>
                    </button>
                  </Reveal>
                );
              })}
            </div>
            <div className={`mt-6 flex flex-wrap items-center gap-4 transition-opacity duration-300 ${picked.length ? "opacity-100" : "opacity-0"}`} aria-live="polite">
              <p className="text-sm text-muted-foreground">{picked.length}/3 picked</p>
              {picked.length >= LIMITS.lanes[0] && (
                <button type="button" onClick={() => go("apply")} className="rounded-full px-5 py-2.5 text-sm font-semibold text-[#f7f3e8] transition hover:-translate-y-0.5" style={{ background: GREEN }}>
                  Now tell us your first move
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ---------- The 90 days ---------- */}
        <section className="px-4 pb-16 sm:px-6 md:pb-24">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-border bg-card p-6 sm:p-10">
            <Reveal>
              <Eyebrow>The 90 days</Eyebrow>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{sprint.title}</h2>
            </Reveal>
            <div className="relative mt-10">
              <div aria-hidden="true" className="absolute left-0 right-0 top-[18px] hidden h-[3px] rounded-full bg-[linear-gradient(90deg,hsl(var(--secondary))_0%,#3fae6b_70%,#f4a21a_100%)] md:block" />
              <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
                <Reveal>
                  <p className="relative inline-block rounded-full bg-secondary px-3 py-1 font-mono text-xs">Every day</p>
                  <ul className="mt-5 space-y-2">
                    {sprint.daily.map(d => <li key={d} className="text-lg">{d}</li>)}
                  </ul>
                  <p className="mt-4 text-sm text-muted-foreground">{sprint.dailyNote}</p>
                </Reveal>
                <Reveal delay={150}>
                  <p className="relative inline-block rounded-full bg-amber-400 px-3 py-1 font-mono text-xs text-[#12321f]">By day 90</p>
                  <ol className="mt-5 space-y-3">
                    {sprint.wins.map((w, i) => (
                      <li key={w} className="flex gap-4 rounded-2xl border border-[#184d37]/15 bg-[#184d37]/[.04] p-4">
                        <span className="font-mono text-sm text-[#184d37] dark:text-emerald-400">0{i + 1}</span>
                        <span className="text-lg font-medium">{w}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 text-sm font-medium">{sprint.winsNote}</p>
                </Reveal>
              </div>
            </div>
            <Reveal className="mt-10 border-t border-border pt-6">
              <p className="text-sm text-muted-foreground">How you know it is working</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sprint.signal.map((s, i) => (
                  <span key={s} className={`rounded-2xl rounded-bl-sm px-4 py-2 text-base ${i === 2 ? "text-[#f7f3e8]" : "bg-secondary"}`} style={i === 2 ? { background: GREEN } : undefined}>{s}</span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------- Rewards ---------- */}
        <section className="px-4 py-16 sm:px-6 md:py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <Eyebrow>What you carry home</Eyebrow>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl [text-wrap:balance]">{rewards.title}</h2>
            </Reveal>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {rewards.items.map((r, i) => {
                const Art = REWARD_ART[r.key as keyof typeof REWARD_ART];
                const lead = r.key === "fund";
                return (
                  <Reveal key={r.key} delay={i * 80}>
                    <div className={`flex h-full gap-5 rounded-3xl border p-6 ${lead ? "border-amber-400/60 bg-amber-300/20" : "border-border bg-card"}`}>
                      <div className="shrink-0 text-foreground"><Art /></div>
                      <div>
                        <h3 className="text-xl font-semibold tracking-tight">{r.name}</h3>
                        <p className="mt-2 leading-relaxed text-muted-foreground">{r.line}</p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- The quote ---------- */}
        <section className="px-4 py-16 sm:px-6 md:py-20">
          <Reveal className="mx-auto max-w-4xl text-center">
            <svg aria-hidden="true" viewBox="0 0 40 40" className="mx-auto h-8 w-8 text-[#3fae6b]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 34 C 8 16, 20 6, 34 6 C 34 22, 24 32, 8 34z" /><path d="M8 34 L26 14" /></svg>
            <blockquote className="mt-6 font-serif text-3xl italic leading-snug sm:text-5xl [text-wrap:balance]">{quote}</blockquote>
            <p className="mt-6 text-sm text-muted-foreground">The reason the next 90 days matter.</p>
          </Reveal>
        </section>

        {/* ---------- Filter ---------- */}
        <section className="px-4 py-16 text-[#f7f3e8] sm:px-6 md:py-24" style={{ background: "#12321f" }}>
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <Eyebrow light>Read this before you apply</Eyebrow>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">{filter.title}</h2>
            </Reveal>
            <ul className="mt-10 space-y-5">
              {filter.points.map((p, i) => (
                <Reveal key={p} delay={i * 60}>
                  <li className="flex gap-4 border-b border-white/10 pb-5 text-lg leading-relaxed">
                    <span className="font-mono text-sm text-amber-300">0{i + 1}</span>
                    <span>{p}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
            <p className="mt-8 text-2xl font-semibold text-amber-300">{filter.close}</p>
          </div>
        </section>

        {/* ---------- Apply ---------- */}
        <section id="apply" className="scroll-mt-16 px-4 py-16 sm:px-6 md:py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <Eyebrow>Apply</Eyebrow>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Three steps to your first move.</h2>
            </Reveal>
            <ol className="mt-8 grid gap-3 md:grid-cols-3">
              {steps.map(s => (
                <li key={s.n} className="rounded-2xl border border-border bg-card p-5">
                  <span className="font-mono text-sm text-amber-600 dark:text-amber-400">0{s.n}</span>
                  <p className="mt-1 text-lg font-semibold">
                    {s.href ? <Link to={s.href} target="_blank" className="underline decoration-amber-500 decoration-2 underline-offset-4 hover:decoration-[#184d37]">{s.title}</Link> : s.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.line}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10">
              <AmbassadorForm lanes={picked} setLanes={setPicked} />
            </div>
          </div>
        </section>

        {/* ---------- Weekly session ---------- */}
        <section id="session" className="scroll-mt-16 px-4 pb-16 sm:px-6 md:pb-24">
          <div className="mx-auto grid max-w-6xl gap-6 rounded-[2rem] p-6 text-[#f7f3e8] sm:p-10 md:grid-cols-[1.2fr_1fr] md:items-center" style={{ background: GREEN }}>
            <div>
              <Eyebrow light>Weekly live session</Eyebrow>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{session.title}</h2>
              <p className="mt-3 max-w-lg text-lg text-[#f7f3e8]/85">{session.line}</p>
              <p className="mt-5 text-sm text-[#f7f3e8]/70">{session.note}</p>
            </div>
            <div className="rounded-3xl bg-[#f7f3e8] p-6 text-[#12321f]">
              <p className="text-sm">Send this word on WhatsApp</p>
              <p className="mt-1 font-mono text-4xl font-bold tracking-wider">{PROGRAM_CONTACT.whatsappKeyword}</p>
              <a href={session.whatsappHref} target="_blank" rel="noopener noreferrer"
                className="mt-5 flex items-center justify-between rounded-2xl px-5 py-4 font-semibold text-[#f7f3e8] transition hover:-translate-y-0.5" style={{ background: GREEN }}>
                <span>{PROGRAM_CONTACT.whatsappDisplay}</span>
                <span aria-hidden="true">→</span>
              </a>
              <p className="mt-4 text-sm">
                Or write to {PROGRAM_CONTACT.manager}, Program Manager:{" "}
                <a href={session.emailHref} className="font-medium underline underline-offset-4">{PROGRAM_CONTACT.managerEmail}</a>
              </p>
            </div>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Straight answers</Eyebrow>
            <h2 className="text-3xl font-semibold tracking-tight">Before you ask.</h2>
            <div className="mt-8 divide-y divide-border rounded-3xl border border-border bg-card">
              {faqs.map(f => (
                <details key={f.question} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium">
                    {f.question}
                    <span aria-hidden="true" className="text-xl text-muted-foreground transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <StickyCta label={picked.length >= 2 ? "Tell us your first move" : "Claim your lane"} onClick={() => go(picked.length >= 2 ? "apply" : "lanes")} hideWhenVisible="apply" />
    </div>
  );
};

export default DecarbonizeIndia;
