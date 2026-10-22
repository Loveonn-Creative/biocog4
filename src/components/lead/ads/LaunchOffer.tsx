import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, Timer } from "lucide-react";
import { inr, inrPaise, offerEndsLabel, timeLeft, yearlyOffer, type TimeLeft } from "@/lib/leadMagnets/launchOffer";
import type { PaidPlan } from "../../../../supabase/functions/_shared/planPricing";

// Launch-price urgency for the ad pages: a countdown to the real date the
// regular price starts, a meter that drains toward it, and struck prices.
// Everything disappears once the date passes (plans then show the regular price).

export function useTimeLeft(): TimeLeft {
  const [t, setT] = useState(() => timeLeft());
  useEffect(() => {
    const id = window.setInterval(() => setT(timeLeft()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const ENDS = offerEndsLabel();

/** Small hero line: the deadline and the saving, nothing else. */
export function OfferPill({ t, plan = "basic" }: { t: TimeLeft; plan?: PaidPlan }) {
  if (t.over) return null;
  return (
    <p className={`lp-offer-pill mb-5 inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${t.finalWeek ? "is-final" : ""}`}>
      <span className="lp-offer-dot h-2 w-2 shrink-0 rounded-full" aria-hidden="true" />
      {t.finalWeek ? `Final week of launch prices` : `${plan === "basic" ? "Up to " : ""}${yearlyOffer(plan).percentOff}% off yearly. Launch prices change ${ENDS}.`}
    </p>
  );
}

/** Big clock above the plans: days, hours, minutes, seconds and a draining meter. */
export function OfferClock({ t }: { t: TimeLeft }) {
  if (t.over) return null;
  const cells: [number, string][] = [[t.days, "days"], [t.hours, "hrs"], [t.mins, "min"], [t.secs, "sec"]];
  return (
    <div className={`lp-clock rounded-2xl p-4 sm:p-5 ${t.finalWeek ? "is-final" : ""}`} role="timer" aria-label={`Launch prices change on ${ENDS}, in ${t.days} days ${t.hours} hours`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold"><Timer className="h-4 w-4" /> {t.finalWeek ? "Final week of launch prices" : "Launch prices change in"}</p>
        <div className="flex gap-1.5 font-mono tabular-nums" aria-hidden="true">
          {cells.map(([n, l]) => (
            <span key={l} className="lp-clock-cell grid min-w-[3.1rem] place-items-center rounded-lg px-1.5 py-1 leading-none">
              <b className="text-xl sm:text-2xl">{l === "days" ? n : pad(n)}</b><small className="mt-1 text-[10px] uppercase opacity-70">{l}</small>
            </span>
          ))}
        </div>
      </div>
      <div className="lp-meter mt-3 h-2 overflow-hidden rounded-full"><i style={{ width: `${Math.max(2, t.fraction * 100)}%` }} /></div>
      <p className="mt-2 text-[13px] opacity-80">Start before {ENDS} and today's price is yours every year you renew.</p>
    </div>
  );
}

/** Price block for a yearly plan: the same plan billed monthly, struck; the yearly price; a Buy now link. */
export function OfferPrice({ plan, onBuy }: { plan: PaidPlan; onBuy?: () => void }) {
  const o = yearlyOffer(plan);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <s className="lp-was opacity-70">{inr(o.regular)}</s><span className="text-[12px] opacity-60">billed monthly</span>
        <span className="lp-off rounded-full px-2 py-0.5 text-[11px] font-bold">{o.percentOff}% OFF</span>
      </div>
      <p className="lp-display text-3xl">{inr(o.launch)}<span className="text-base font-semibold opacity-70"> /yr</span></p>
      <p className="text-[13px] opacity-75">{inr(o.perMonth)} a month, billed yearly. You keep {inr(o.save)}.</p>
      <p className="text-[13px] font-semibold">Pay {inrPaise(o.upiTotal)} by UPI, GST included. No other fees.</p>
      <Link to={`/pricing?plan=${plan === "basic" ? "essential" : "pro"}&buy=yearly`} onClick={onBuy}
        className="lp-buy mt-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-bold">Buy now <ArrowRight className="h-4 w-4" /></Link>
    </>
  );
}

/** Sticky bottom bar after the hero: the clock in one line and the one action. */
export function OfferBar({ t, onBook, hidden, whatsapp, onWhatsApp }: { t: TimeLeft; onBook: () => void; hidden: boolean; whatsapp: string; onWhatsApp: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const on = () => setShown(window.scrollY > window.innerHeight * 0.7);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  if (hidden) return null;
  return (
    <div className={`lp-bar fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ${shown ? "translate-y-0" : "translate-y-full"} ${t.finalWeek ? "is-final" : ""}`} aria-hidden={!shown}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5" style={{ paddingBottom: "max(.625rem, env(safe-area-inset-bottom))" }}>
        <p className="min-w-0 text-[13px] leading-tight">
          {t.over ? <b>Free 10-minute call</b> : <><b className="font-mono tabular-nums">{t.days}d {pad(t.hours)}h {pad(t.mins)}m {pad(t.secs)}s</b><span className="block opacity-75">left at launch price</span></>}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" tabIndex={shown ? 0 : -1} onClick={onWhatsApp} aria-label="Chat on WhatsApp" className="lp-wa grid h-11 w-11 place-items-center rounded-full"><MessageCircle className="h-5 w-5" /></a>
          <button type="button" tabIndex={shown ? 0 : -1} onClick={onBook} className="lp-cta inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-sm font-bold">Book my call <ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
