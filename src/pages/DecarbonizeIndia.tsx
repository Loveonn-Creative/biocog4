import { useState } from "react";
import { Link } from "react-router-dom";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/platform/Reveal";
import { StickyCta } from "@/components/lead/LeadKit";
import { PlanetHero } from "@/components/decarbonize/PlanetHero";
import { SkylineReveal } from "@/components/decarbonize/SkylineReveal";
import { OwnerTranslator } from "@/components/decarbonize/OwnerTranslator";
import { LaneKit } from "@/components/decarbonize/LaneKit";
import { CounterStrip, SprintRing } from "@/components/decarbonize/SprintVisuals";
import { HardTruth, RewardsField, SunriseQuote } from "@/components/decarbonize/StoryVisuals";
import { AmbassadorForm } from "@/components/decarbonize/AmbassadorForm";
import { PROGRAM_CONTACT, LIMITS, type LaneId } from "@/lib/ambassadorApplication";
import { faqs, hero, ownerSpeak, realFight, rewards, session, sprint, steps, who } from "@/data/decarbonizeIndia";

const GREEN = "#184d37";
const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

const Eyebrow = ({ children }: { children: string }) => (
  <p className="mb-3 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-[#184d37] dark:text-emerald-400">
    <span aria-hidden="true" className="h-[3px] w-6 rounded-full bg-amber-500" />
    {children}
  </p>
);

const DecarbonizeIndia = () => {
  const [picked, setPicked] = useState<LaneId[]>([]);
  const toggleLane = (id: LaneId) =>
    setPicked(p => (p.includes(id) ? p.filter(l => l !== id) : p.length >= LIMITS.lanes[1] ? p : [...p, id]));

  return (
    <div className="min-h-screen bg-[#faf6ec] text-foreground dark:bg-background">
      <MinimalNav />

      <main className="overflow-x-clip">
        <PlanetHero onJoin={() => go("apply")} onSession={() => go("session")} />

        {/* Where the carbon is: split focus, with a before/after the visitor drags */}
        <section className="px-4 py-20 sm:px-6 md:py-28">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <Reveal>
              <Eyebrow>The real fight</Eyebrow>
              <h2 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl [text-wrap:balance]">{realFight.title}</h2>
              <p className="mt-8 max-w-sm text-base text-muted-foreground">
                {realFight.habits.map((h, i) => (i ? h.toLowerCase() : h)).join(", ")}. {realFight.habitsNote}
              </p>
            </Reveal>
            <Reveal delay={120}>
              <SkylineReveal />
              <p className="mt-2 text-sm text-muted-foreground">{realFight.sourcesNote}</p>
            </Reveal>
          </div>
        </section>

        {/* Speak owner */}
        <section className="px-4 pb-20 sm:px-6 md:pb-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <Eyebrow>Speak owner</Eyebrow>
              <h2 className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl [text-wrap:balance]">{ownerSpeak.title}</h2>
            </Reveal>
            <Reveal delay={100} className="mt-10"><OwnerTranslator /></Reveal>
          </div>
        </section>

        {/* Lanes */}
        <section id="lanes" className="scroll-mt-16 px-4 pb-20 sm:px-6 md:pb-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <Eyebrow>Your lanes</Eyebrow>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl [text-wrap:balance]">One job: get people talking and acting. Pin the 2 or 3 ways you'll do it.</h2>
            </Reveal>
            <div className="mt-10"><LaneKit picked={picked} toggle={toggleLane} onNext={() => go("apply")} /></div>
          </div>
        </section>

        <CounterStrip />
        <SprintRing />

        <section className="px-4 pb-8 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm text-muted-foreground">How you know it is working</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sprint.signal.map((s, i) => (
                <span key={s} className={`rounded-2xl rounded-bl-sm px-4 py-2 text-base ${i === 2 ? "text-[#f7f3e8]" : "bg-secondary"}`} style={i === 2 ? { background: GREEN } : undefined}>{s}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Rewards */}
        <section className="px-4 py-20 sm:px-6 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <Eyebrow>What you carry home</Eyebrow>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl [text-wrap:balance]">{rewards.title}</h2>
            </Reveal>
            <Reveal delay={100} className="mt-10"><RewardsField /></Reveal>
          </div>
        </section>

        <SunriseQuote />
        <HardTruth />

        {/* Apply */}
        <section id="apply" className="scroll-mt-16 px-4 py-20 sm:px-6 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <Eyebrow>Apply</Eyebrow>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Three steps to your first move.</h2>
              <p className="mt-3 text-muted-foreground">{who}</p>
            </Reveal>
            {/* the path: three stops on one line, not three boxes */}
            <ol className="relative mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
              <span aria-hidden="true" className="absolute left-[11px] top-3 h-[calc(100%-24px)] w-[2px] bg-[linear-gradient(180deg,#3fae6b,#f4a21a)] md:left-3 md:right-3 md:top-[11px] md:h-[2px] md:w-auto md:bg-[linear-gradient(90deg,#3fae6b,#f4a21a)]" />
              {steps.map(s => (
                <li key={s.n} className="relative pl-10 md:pl-0 md:pt-10">
                  <span aria-hidden="true" className="absolute left-0 top-0 grid h-6 w-6 place-items-center rounded-full border-2 border-[#184d37] bg-[#faf6ec] text-[11px] font-bold text-[#184d37] dark:bg-background">{s.n}</span>
                  <p className="text-lg font-semibold">
                    {s.href ? <Link to={s.href} target="_blank" className="underline decoration-amber-500 decoration-2 underline-offset-4 hover:decoration-[#184d37]">{s.title}</Link> : s.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.line}</p>
                </li>
              ))}
            </ol>
            <div className="mt-12">
              <AmbassadorForm lanes={picked} setLanes={setPicked} />
            </div>
          </div>
        </section>

        {/* Weekly session */}
        <section id="session" className="scroll-mt-16 px-4 pb-20 sm:px-6 md:pb-28">
          <div className="relative mx-auto grid max-w-6xl gap-6 overflow-hidden rounded-[2rem] p-6 text-[#f7f3e8] sm:p-10 md:grid-cols-[1.2fr_1fr] md:items-center" style={{ background: GREEN }}>
            <div aria-hidden="true" className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
            <div className="relative">
              <p className="mb-3 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-amber-300"><span aria-hidden="true" className="h-[3px] w-6 rounded-full bg-amber-500" />Weekly live session</p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{session.title}</h2>
              <p className="mt-3 max-w-lg text-lg text-[#f7f3e8]/85">{session.line}</p>
              <p className="mt-5 text-sm text-[#f7f3e8]/70">{session.note}</p>
            </div>
            <div className="relative rounded-3xl border border-white/30 bg-white/90 p-6 text-[#12321f] backdrop-blur">
              <p className="text-sm">Send this word on WhatsApp</p>
              <p className="mt-1 font-mono text-4xl font-bold tracking-wider">{PROGRAM_CONTACT.whatsappKeyword}</p>
              <a href={session.whatsappHref} target="_blank" rel="noopener noreferrer"
                className="mt-5 flex items-center justify-between rounded-2xl px-5 py-4 font-semibold text-[#f7f3e8] transition hover:-translate-y-0.5" style={{ background: GREEN }}>
                <span>{PROGRAM_CONTACT.whatsappDisplay}</span><span aria-hidden="true">→</span>
              </a>
              <div className="mt-4 text-sm">
                <p>Or write to a Program Coordinator:</p>
                <ul className="mt-2 space-y-1">
                  {PROGRAM_CONTACT.coordinators.map(c => (
                    <li key={c.email}>
                      {c.name}: <a href={session.emailHref(c.email)} className="font-medium underline underline-offset-4">{c.email}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Straight answers</Eyebrow>
            <h2 className="text-3xl font-semibold tracking-tight">Before you ask.</h2>
            <div className="mt-8 divide-y divide-border border-y border-border">
              {faqs.map(f => (
                <details key={f.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">
                    {f.question}
                    <span aria-hidden="true" className="text-2xl text-muted-foreground transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <StickyCta label={hero.join} onClick={() => go("apply")} hideWhenVisible={["apply", "lanes"]} showAfter="di-hero" />
    </div>
  );
};

export default DecarbonizeIndia;
