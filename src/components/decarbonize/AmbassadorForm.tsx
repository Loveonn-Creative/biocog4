import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { loadSupabase } from "@/integrations/supabase/lazyClient";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import {
  COMMITMENTS, LANES, LIMITS, PROGRAM_CONTACT, STEPS,
  stepErrors, validateApplication, type FieldErrors, type LaneId,
} from "@/lib/ambassadorApplication";
import { DI_PATH, session } from "@/data/decarbonizeIndia";

const DRAFT_KEY = "senseible_ambassador_draft";
const STEP_TITLES = ["You", "Your lanes", "Your first move", "Last check"];
const NEXT_LABEL = ["Next: your lanes", "Next: your first move", "Next: last check"];

interface Draft {
  name: string; email: string; whatsapp: string; city: string;
  commitment: string; firstMove: string; workLink: string;
  reviewedPlatform: boolean; ownWords: boolean; selfless: boolean;
}
const EMPTY: Draft = { name: "", email: "", whatsapp: "", city: "", commitment: "", firstMove: "", workLink: "", reviewedPlatform: false, ownWords: false, selfless: false };

function readDraft(): Draft {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") }; } catch { return EMPTY; }
}

const field = "w-full rounded-xl border border-border bg-background px-4 py-3 text-base outline-none transition focus:border-[#184d37] focus:ring-2 focus:ring-[#184d37]/20";
const Err = ({ msg }: { msg?: string }) => (msg ? <p className="mt-1.5 text-sm text-destructive" role="alert">{msg}</p> : null);

/**
 * The intent check. Four short screens; every answer is the applicant's own.
 * A pass card beside the form fills in as they go, so they see themselves as
 * an ambassador before they press send.
 */
export function AmbassadorForm({ lanes, setLanes }: { lanes: LaneId[]; setLanes: (l: LaneId[]) => void }) {
  const [draft, setDraft] = useState<Draft>(readDraft);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<null | "new" | "duplicate">(null);
  const [notOpen, setNotOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* storage blocked: draft lasts this visit */ }
  }, [draft]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft(d => ({ ...d, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };
  const toggleLane = (id: LaneId) => {
    setErrors(e => ({ ...e, lanes: undefined }));
    setLanes(lanes.includes(id) ? lanes.filter(l => l !== id) : lanes.length >= LIMITS.lanes[1] ? lanes : [...lanes, id]);
  };

  // Read at call time: the honeypot is uncontrolled.
  const payload = () => ({ ...draft, lanes, company: honeypot.current?.value || "" });

  const goTo = (n: number) => {
    setStep(n);
    top.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const next = () => {
    const result = validateApplication(payload());
    const here = result.ok ? {} : stepErrors(result.errors, step);
    setErrors(here);
    if (Object.keys(here).length === 0) goTo(step + 1);
  };

  const submit = async () => {
    const result = validateApplication(payload());
    if (!result.ok) {
      setErrors(result.errors);
      const firstBad = STEPS.findIndex((_, i) => Object.keys(stepErrors(result.errors, i)).length > 0);
      if (firstBad >= 0 && firstBad !== step) goTo(firstBad);
      if (result.errors.form) setFormError(result.errors.form);
      return;
    }
    setSending(true);
    setFormError(null);
    try {
      const supabase = await loadSupabase();
      const { data, error } = await supabase.functions.invoke("submit-ambassador-application", { body: payload() });
      if (error) {
        const status = (error as { context?: { status?: number } }).context?.status;
        if (status === 503) { setNotOpen(true); return; }
        setFormError(await getFunctionErrorMessage(error, "Something went wrong. Please try again."));
        return;
      }
      setDone(data?.duplicate ? "duplicate" : "new");
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    } catch (err) {
      setFormError(await getFunctionErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setSending(false);
    }
  };

  const shareText = "I'm applying to be a Climate Impact Ambassador with Decarbonize India. 90 days, one mission. Come with me:";
  const shareUrl = `https://senseible.earth${DI_PATH}`;
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Decarbonize India", text: shareText, url: shareUrl }); return; } catch { /* closed */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, "_blank", "noopener");
  };

  const laneLabels = lanes.map(id => LANES.find(l => l.id === id)?.label).filter(Boolean) as string[];
  const firstMoveLen = draft.firstMove.trim().length;

  return (
    <div ref={top} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8">
        {done ? (
          <div role="status" aria-live="polite">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#184d37] dark:text-emerald-400">{done === "duplicate" ? "Already with us" : "Application in"}</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {done === "duplicate" ? "We already have your application." : `Welcome to the sprint, ${draft.name.split(" ")[0] || "ambassador"}.`}
            </h3>
            <p className="mt-3 text-muted-foreground">Your interview invite reaches {draft.email || "your inbox"} within 7 to 14 days. Use the wait well.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={share} className="rounded-2xl border border-[#184d37]/30 bg-[#184d37] px-5 py-4 text-left text-[#f7f3e8] transition hover:-translate-y-0.5">
                <span className="block font-semibold">Bring a climate buddy</span>
                <span className="block text-sm opacity-80">More hands, more factories that switch.</span>
              </button>
              <a href={session.whatsappHref} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-border px-5 py-4 transition hover:-translate-y-0.5 hover:border-[#184d37]/40">
                <span className="block font-semibold">Join this week's live session</span>
                <span className="block text-sm text-muted-foreground">Send {PROGRAM_CONTACT.whatsappKeyword} on WhatsApp for the link.</span>
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* progress */}
            <ol className="mb-6 flex items-center gap-2" aria-label="Application progress">
              {STEP_TITLES.map((t, i) => (
                <li key={t} className="flex flex-1 flex-col gap-1.5">
                  <span className={`h-1.5 rounded-full transition-colors duration-500 ${i <= step ? "bg-[#184d37] dark:bg-emerald-500" : "bg-secondary"}`} />
                  <span className={`hidden text-xs sm:block ${i === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>{t}</span>
                </li>
              ))}
            </ol>
            <p className="mb-1 text-xs uppercase tracking-[0.14em] text-muted-foreground sm:hidden">Step {step + 1} of 4 · {STEP_TITLES[step]}</p>

            {step === 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold tracking-tight">Who's stepping up?</h3>
                <div>
                  <label htmlFor="amb-name" className="mb-1.5 block text-sm font-medium">Your name</label>
                  <input id="amb-name" className={field} value={draft.name} onChange={e => set("name", e.target.value)} autoComplete="name" maxLength={LIMITS.name[1]} />
                  <Err msg={errors.name} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="amb-email" className="mb-1.5 block text-sm font-medium">Email</label>
                    <input id="amb-email" type="email" inputMode="email" className={field} value={draft.email} onChange={e => set("email", e.target.value)} autoComplete="email" />
                    <Err msg={errors.email} />
                  </div>
                  <div>
                    <label htmlFor="amb-wa" className="mb-1.5 block text-sm font-medium">WhatsApp <span className="font-normal text-muted-foreground">(optional)</span></label>
                    <input id="amb-wa" type="tel" inputMode="tel" className={field} value={draft.whatsapp} onChange={e => set("whatsapp", e.target.value)} autoComplete="tel" placeholder="+91" />
                    <Err msg={errors.whatsapp} />
                  </div>
                </div>
                <div>
                  <label htmlFor="amb-city" className="mb-1.5 block text-sm font-medium">City or town you'll work from</label>
                  <input id="amb-city" className={field} value={draft.city} onChange={e => set("city", e.target.value)} autoComplete="address-level2" maxLength={LIMITS.city[1]} />
                  <Err msg={errors.city} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">Pick 2 or 3 lanes you're strong in.</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{lanes.length}/3 picked{lanes.length >= 3 ? ". Tap one to swap it." : ""}</p>
                  <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Lanes">
                    {LANES.map(l => {
                      const on = lanes.includes(l.id);
                      return (
                        <button key={l.id} type="button" aria-pressed={on} onClick={() => toggleLane(l.id)}
                          className={`rounded-full border px-4 py-2 text-sm transition ${on ? "border-[#184d37] bg-[#184d37] text-[#f7f3e8]" : "border-border hover:border-[#184d37]/50"} ${!on && lanes.length >= 3 ? "opacity-50" : ""}`}>
                          {l.label}
                        </button>
                      );
                    })}
                  </div>
                  <Err msg={errors.lanes} />
                </div>
                <div>
                  <h3 className="text-base font-semibold">How will you give your time?</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Time commitment">
                    {COMMITMENTS.map(c => (
                      <button key={c.id} type="button" role="radio" aria-checked={draft.commitment === c.id} onClick={() => set("commitment", c.id)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition ${draft.commitment === c.id ? "border-[#184d37] bg-[#184d37]/10 font-medium" : "border-border hover:border-[#184d37]/50"}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <Err msg={errors.commitment} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="amb-move" className="block text-xl font-semibold tracking-tight">Name one carbon-heavy business near you. What would you say to its owner first?</label>
                  <p className="mt-1 text-sm text-muted-foreground">Your words, not a polished pitch. The interview starts from here.</p>
                </div>
                <textarea id="amb-move" rows={7} className={`${field} resize-y`} value={draft.firstMove} onChange={e => set("firstMove", e.target.value)} maxLength={LIMITS.firstMove[1]} />
                <div className="flex justify-between text-xs text-muted-foreground" aria-live="polite">
                  <span>{firstMoveLen < LIMITS.firstMove[0] ? `${LIMITS.firstMove[0] - firstMoveLen} more characters` : "Good. Keep it real."}</span>
                  <span className="tabular-nums">{firstMoveLen}/{LIMITS.firstMove[1]}</span>
                </div>
                <Err msg={errors.firstMove} />
                <div>
                  <label htmlFor="amb-link" className="mb-1.5 block text-sm font-medium">Something you've made <span className="font-normal text-muted-foreground">(optional link)</span></label>
                  <input id="amb-link" type="url" inputMode="url" className={field} value={draft.workLink} onChange={e => set("workLink", e.target.value)} placeholder="https://" />
                  <Err msg={errors.workLink} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <h3 className="text-xl font-semibold tracking-tight">Three honest yeses.</h3>
                {([
                  ["reviewedPlatform", <>I've looked around the <Link to="/platform" className="underline underline-offset-4" target="_blank">Senseible platform</Link> I'll be talking about.</>],
                  ["ownWords", "Every answer here is in my own words. No AI wrote or polished it."],
                  ["selfless", "I'm here for selfless service. Not a job, an internship or a resume line."],
                ] as const).map(([k, label]) => (
                  <div key={k}>
                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${draft[k] ? "border-[#184d37] bg-[#184d37]/5" : "border-border hover:border-[#184d37]/40"}`}>
                      <input type="checkbox" className="mt-1 h-4 w-4 accent-[#184d37]" checked={draft[k]} onChange={e => set(k, e.target.checked)} />
                      <span className="text-sm leading-relaxed">{label}</span>
                    </label>
                    <Err msg={errors[k]} />
                  </div>
                ))}
                {/* honeypot: hidden from people, filled only by bots */}
                <input ref={honeypot} type="text" name="company" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
              </div>
            )}

            {notOpen && (
              <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm" role="alert">
                <p className="font-medium">Applications through this page open shortly. Your answers are saved here.</p>
                <p className="mt-1">Until then, send <strong>{PROGRAM_CONTACT.whatsappKeyword}</strong> on <a className="underline underline-offset-4" href={session.whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp to {PROGRAM_CONTACT.whatsappDisplay}</a> or email <a className="underline underline-offset-4" href={`mailto:${PROGRAM_CONTACT.managerEmail}`}>{PROGRAM_CONTACT.managerEmail}</a>.</p>
              </div>
            )}
            {formError && <p className="mt-4 text-sm text-destructive" role="alert">{formError}</p>}

            <div className="mt-7 flex items-center justify-between gap-3">
              {step > 0 ? (
                <button type="button" onClick={() => goTo(step - 1)} className="rounded-full px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground">Back</button>
              ) : <span />}
              {step < 3 ? (
                <button type="button" onClick={next} className="rounded-full bg-[#184d37] px-6 py-3 text-sm font-semibold text-[#f7f3e8] transition hover:-translate-y-0.5 hover:shadow-lg">
                  {NEXT_LABEL[step]}
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={sending} className="rounded-full bg-[#184d37] px-6 py-3 text-sm font-semibold text-[#f7f3e8] transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60">
                  {sending ? "Sending..." : "Send my first move"}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* the pass that fills itself in */}
      <div className="order-first mx-auto w-full max-w-[320px] [perspective:1000px] lg:order-none lg:sticky lg:top-24" aria-hidden="true">
        <div className={`relative overflow-hidden rounded-3xl bg-[#184d37] p-5 lg:p-6 text-[#f7f3e8] shadow-[0_40px_70px_-40px_rgba(0,0,0,.6)] transition-transform duration-700 [transform:rotateY(-10deg)_rotateX(6deg)] ${done ? "[transform:rotateY(0deg)_rotateX(0deg)]" : ""}`}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/20 blur-2xl" />
          <p className="text-[11px] uppercase tracking-[0.2em] opacity-70">Decarbonize India</p>
          <p className="mt-1 text-lg font-semibold leading-tight">Climate Impact Ambassador</p>
          <div className="mt-4 space-y-1 lg:mt-6">
            <p className={`text-2xl font-semibold leading-tight ${draft.name ? "" : "opacity-40"}`}>{draft.name || "Your name"}</p>
            <p className={`text-sm ${draft.city ? "opacity-80" : "opacity-40"}`}>{draft.city || "Your city"}</p>
          </div>
          <div className="mt-5 flex min-h-[28px] flex-wrap gap-1.5">
            {laneLabels.length ? laneLabels.map(l => (
              <span key={l} className="rounded-full bg-[#f7f3e8]/15 px-2.5 py-1 text-[11px]">{l}</span>
            )) : <span className="text-[11px] opacity-40">Your lanes</span>}
          </div>
          <div className="mt-4 flex items-end justify-between lg:mt-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] opacity-60">Sprint</p>
              <p className="font-mono text-sm">Day 0 of 90</p>
            </div>
            <div className="h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,#f4a21a_0_33%,#f7f3e8_33%_66%,#3fae6b_66%)]" />
          </div>
          <div className={`absolute bottom-16 right-5 rotate-[-10deg] rounded-lg border-2 border-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-300 transition-all duration-500 ${done ? "scale-100 opacity-100" : "scale-125 opacity-0"}`}>Applied</div>
        </div>
      </div>
    </div>
  );
}

export default AmbassadorForm;
