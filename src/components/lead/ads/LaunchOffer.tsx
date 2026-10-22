import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, MessageCircle, Timer } from "lucide-react";
import { inr, inrPaise, nextBatch, yearlyOffer, type Batch } from "@/lib/leadMagnets/launchOffer";
import { useSession } from "@/hooks/useSession";
import { useRazorpay } from "@/hooks/useRazorpay";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import type { PaidPlan } from "../../../../supabase/functions/_shared/planPricing";
import type { PaymentMethod } from "../../../../supabase/functions/_shared/checkoutTotals";

const CheckoutSummary = lazy(() => import("@/components/pricing/CheckoutSummary"));

// Offer pieces for the ad pages: the next onboarding batch (a real start date
// every 10 days, the same for everyone), the yearly price against paying
// monthly, and checkout that opens on the ad page itself.

export function useBatch(): Batch {
  const [b, setB] = useState(() => nextBatch());
  useEffect(() => {
    const id = window.setInterval(() => setB(nextBatch()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return b;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Countdown to the next batch with a meter that drains over the 10 days. */
export function BatchClock({ b, what }: { b: Batch; what: string }) {
  const t = b.left;
  const cells: [number, string][] = [[t.days, "days"], [t.hours, "hrs"], [t.mins, "min"], [t.secs, "sec"]];
  return (
    <div className={`lp-clock rounded-2xl p-4 sm:p-5 ${t.finalDays ? "is-final" : ""}`} role="timer" aria-label={`Next batch starts ${b.label}, in ${t.days} days ${t.hours} hours`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold"><Timer className="h-4 w-4" /> {t.finalDays ? `Last call for the ${b.label} batch` : `Next batch starts ${b.label}`}</p>
        <div className="flex gap-1.5 font-mono tabular-nums" aria-hidden="true">
          {cells.map(([n, l]) => (
            <span key={l} className="lp-clock-cell grid min-w-[3.1rem] place-items-center rounded-lg px-1.5 py-1 leading-none">
              <b className="text-xl sm:text-2xl">{l === "days" ? n : pad(n)}</b><small className="mt-1 text-[10px] uppercase opacity-70">{l}</small>
            </span>
          ))}
        </div>
      </div>
      <div className="lp-meter mt-3 h-2 overflow-hidden rounded-full"><i style={{ width: `${Math.max(2, t.fraction * 100)}%` }} /></div>
      <p className="mt-2 text-[13px] opacity-80">Join by then and {what} starts on {b.label}. Miss it and you wait until {b.nextLabel}.</p>
    </div>
  );
}

/** Yearly plan price: monthly billing struck, the yearly price, GST total, and the buy button. */
export function OfferPrice({ plan, onBuy }: { plan: PaidPlan; onBuy: () => void }) {
  const o = yearlyOffer(plan);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <s className="lp-was opacity-70">{inr(o.regular)}</s>
        <span className="lp-off rounded-full px-2 py-0.5 text-[11px] font-bold">Save {o.percentOff}%</span>
      </div>
      <p className="lp-display text-3xl">{inr(o.launch)}<span className="text-base font-semibold opacity-70"> /yr</span></p>
      <p className="text-[13px] opacity-75">{inr(o.perMonth)} a month, paid yearly. {inrPaise(o.withGst)} with GST.</p>
      <button type="button" onClick={onBuy} className="lp-buy mt-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-bold">
        Get {plan === "basic" ? "Essential" : "Pro"} <ArrowRight className="h-4 w-4" />
      </button>
    </>
  );
}

/**
 * Checkout on the ad page: the buyer never lands on another page to pay.
 * Signed-out buyers sign in and come back here with the same plan open (?buy=).
 */
export function useAdCheckout(page: string, onEvent: (what: string) => void) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  const { initiatePayment, isLoading: paying } = useRazorpay();
  const { refreshTier } = usePremiumStatus();
  const [plan, setPlan] = useState<"essential" | "pro" | null>(null);

  const buy = useCallback((p: PaidPlan) => {
    const id = p === "basic" ? "essential" : "pro";
    onEvent(`buy_${id}`);
    if (!isAuthenticated || !user) {
      navigate(`/auth?next=${encodeURIComponent(`${page}?buy=${id}`)}`);
      return;
    }
    setPlan(id);
  }, [isAuthenticated, user, navigate, page, onEvent]);

  const fromLink = useRef(params.get("buy"));
  useEffect(() => {
    const p = fromLink.current;
    if (!p || sessionLoading || !isAuthenticated) return;
    fromLink.current = null;
    if (p === "essential" || p === "pro") setPlan(p);
  }, [sessionLoading, isAuthenticated]);

  const pay = async (method: PaymentMethod) => {
    if (!plan || !user || paying) return;
    try {
      await initiatePayment({
        tier: plan, billingCycle: "yearly", paymentMethod: method, userId: user.id, userEmail: user.email || "",
        onSuccess: async () => { await refreshTier(); navigate("/dashboard"); },
        onFailure: () => {},
      });
    } finally { setPlan(null); }
  };

  const checkout = plan ? (
    <Suspense fallback={null}>
      <CheckoutSummary open plan={plan} cycle="yearly" busy={paying} onOpenChange={(o) => { if (!o) setPlan(null); }} onPay={pay} />
    </Suspense>
  ) : null;
  return { buy, checkout };
}

/** Sticky bottom bar after the hero: the batch countdown and the one action. */
export function OfferBar({ b, onBook, hidden, whatsapp, onWhatsApp }: { b: Batch; onBook: () => void; hidden: boolean; whatsapp: string; onWhatsApp: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const on = () => setShown(window.scrollY > window.innerHeight * 0.7);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  if (hidden) return null;
  const t = b.left;
  return (
    <div className={`lp-bar fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ${shown ? "translate-y-0" : "translate-y-full"} ${t.finalDays ? "is-final" : ""}`} aria-hidden={!shown}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5" style={{ paddingBottom: "max(.625rem, env(safe-area-inset-bottom))" }}>
        <p className="min-w-0 text-[13px] leading-tight">
          <b className="font-mono tabular-nums">{t.days}d {pad(t.hours)}h {pad(t.mins)}m {pad(t.secs)}s</b>
          <span className="block opacity-75">to join the {b.label} batch</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" tabIndex={shown ? 0 : -1} onClick={onWhatsApp} aria-label="Chat on WhatsApp" className="lp-wa grid h-11 w-11 place-items-center rounded-full"><MessageCircle className="h-5 w-5" /></a>
          <button type="button" tabIndex={shown ? 0 : -1} onClick={onBook} className="lp-cta inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-sm font-bold">Book my call <ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
