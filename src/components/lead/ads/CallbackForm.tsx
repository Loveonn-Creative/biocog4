import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { leadEvents } from "@/components/lead/leadEvents";
import { callbackMessage } from "@/lib/leadMagnets/adKits";

// The one action on the ad pages: ask for a 10-minute call. Uses the existing
// contact notification (send-contact-notification), which mails the team's
// internal inbox; nothing is stored in the browser.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s-]{10,16}$/;

export interface CallbackFormProps {
  open: boolean;
  onClose: () => void;
  page: string;
  analyticsPage: string;
  category: "green-loan-check" | "enterprise";
  industries: { id: string; label: string }[];
  summary?: string;
  askCompany?: boolean;
  /** Class that themes the sheet (palette variables come from the page). */
  themeClass: string;
}

export function CallbackForm({ open, onClose, page, analyticsPage, category, industries, summary, askCompany, themeClass }: CallbackFormProps) {
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "", company: "", industry: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    leadEvents.cta(analyticsPage, "call_open");
    const t = window.setTimeout(() => first.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open, analyticsPage, onClose]);

  if (!open) return null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim().length > 1 && PHONE_RE.test(form.whatsapp.trim()) && EMAIL_RE.test(form.email.trim()) && !!form.industry;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.website) { setState("sent"); return; } // honeypot
    if (!valid) { setError("Add your name, WhatsApp number, email and industry."); setState("error"); return; }
    setState("sending"); setError("");
    const industry = industries.find((i) => i.id === form.industry)?.label ?? form.industry;
    const { data, error: fnError } = await supabase.functions.invoke("send-contact-notification", {
      body: {
        name: form.name.trim(), email: form.email.trim(), phone: form.whatsapp.trim(),
        company: form.company.trim() || undefined, category, newsletter: false,
        message: callbackMessage({ page, industry, whatsapp: form.whatsapp.trim(), summary }),
      },
    });
    if (fnError || !data?.success) {
      setError(await getFunctionErrorMessage(fnError, "That did not go through. Try again in a moment."));
      setState("error");
      return;
    }
    leadEvents.submit(analyticsPage, { industry: form.industry });
    setState("sent");
  };

  const field = "h-12 w-full rounded-xl border border-[var(--lp-line)] bg-[var(--lp-input)] px-4 text-[15px] text-[var(--lp-ink)] placeholder:text-[var(--lp-ink)]/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-cta)]";

  return (
    <div className={`${themeClass} fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4`} role="dialog" aria-modal="true" aria-labelledby="call-title" onClick={onClose}>
      <div className="lp-sheet w-full max-w-md rounded-t-3xl bg-[var(--lp-sheet)] p-6 text-[var(--lp-ink)] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="call-title" className="text-xl font-semibold">{state === "sent" ? "You're booked in" : "Book your 10-minute call"}</h2>
            {state !== "sent" && <p className="mt-1 text-sm opacity-70">We'll message you on WhatsApp to fix a time that suits you.</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 opacity-60 hover:opacity-100"><X className="h-5 w-5" /></button>
        </div>
        {state === "sent" ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--lp-soft)] p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--lp-cta)] text-[var(--lp-cta-ink)]"><Check className="h-5 w-5" /></span>
              <p className="text-[15px]">Thanks, {form.name.split(" ")[0] || "there"}. Expect a WhatsApp from us in working hours.</p>
            </div>
            <p className="text-sm opacity-75">Have your recent bills to hand. A phone photo is enough.</p>
            <button type="button" onClick={onClose} className="h-12 w-full rounded-full border border-[var(--lp-line)] font-medium">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
            <input ref={first} className={field} placeholder="Your name" autoComplete="name" value={form.name} onChange={set("name")} aria-label="Your name" />
            <input className={field} placeholder="WhatsApp number" inputMode="tel" autoComplete="tel" value={form.whatsapp} onChange={set("whatsapp")} aria-label="WhatsApp number" />
            <input className={field} placeholder="Work email" type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-label="Work email" />
            {askCompany && <input className={field} placeholder="Company" autoComplete="organization" value={form.company} onChange={set("company")} aria-label="Company" />}
            <select className={field} value={form.industry} onChange={set("industry")} aria-label="Industry">
              <option value="">Your industry</option>
              {industries.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
            <input tabIndex={-1} autoComplete="off" className="hidden" value={form.website} onChange={set("website")} aria-hidden="true" />
            {state === "error" && <p className="text-sm text-[var(--lp-alert)]" role="alert">{error}</p>}
            <button type="submit" disabled={state === "sending"} className="lp-cta mt-1 flex h-13 w-full items-center justify-center gap-2 rounded-full py-3.5 text-base font-semibold">
              {state === "sending" ? <Loader2 className="h-5 w-5 animate-spin" /> : "Book my call"}
            </button>
            <p className="text-center text-xs opacity-60">Used only to set up your call. Never shared or sold.</p>
          </form>
        )}
      </div>
    </div>
  );
}
