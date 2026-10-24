import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { leadEvents } from "@/components/lead/leadEvents";
import { TEMPLATE_NEXT, templateLeadMessage, type TemplateDoc } from "@/data/templates";

// Shown after a template download: the one next step that fits that template.
// The file is already on the visitor's device; this asks for the minimum to
// help further. Sends through the existing contact notification (server-side
// checks for fake emails and numbers, daily caps), nothing is stored here.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s-]{10,16}$/;

export function TemplateNextStep({ t, onClose }: { t: TemplateDoc; onClose: () => void }) {
  const next = TEMPLATE_NEXT[t.slug];
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "", company: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    leadEvents.cta("templates", `next_${t.slug}`);
    box.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [t.slug]);

  if (!next) return null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const phone = form.whatsapp.trim();
  const valid = form.name.trim().length > 1 && EMAIL_RE.test(form.email.trim()) && (next.phoneRequired ? PHONE_RE.test(phone) : !phone || PHONE_RE.test(phone));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.website) { setState("sent"); return; } // honeypot
    if (!valid) {
      setError(next.phoneRequired ? "Add your name, work email and WhatsApp number." : "Add your name and work email.");
      setState("error");
      return;
    }
    setState("sending"); setError("");
    const { data, error: fnError } = await supabase.functions.invoke("send-contact-notification", {
      body: {
        name: form.name.trim(), email: form.email.trim(), phone: phone || undefined,
        company: form.company.trim() || undefined, category: "sales", newsletter: false,
        message: templateLeadMessage(t, next),
      },
    });
    if (fnError || !data?.success) {
      setError(await getFunctionErrorMessage(fnError, "That did not go through. Try again in a moment."));
      setState("error");
      return;
    }
    leadEvents.submit("templates", { template: t.slug });
    setState("sent");
  };

  const field = "h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 text-[15px] placeholder:text-muted-foreground/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const first = form.name.trim().split(" ")[0] || "there";

  return (
    <div ref={box} role="region" aria-label={next.title}
      className="tpl-next relative mt-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 motion-reduce:animate-none overflow-hidden rounded-2xl border border-primary/30 bg-primary/[0.05] p-5 sm:p-6">
      <button type="button" onClick={onClose} aria-label="Close"
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      {state === "sent" ? (
        <div className="flex items-start gap-3 pr-8" aria-live="polite">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <p className="font-semibold">Thanks, {first}. We have your request.</p>
            <p className="mt-1 text-sm text-muted-foreground">Expect a reply by email{phone ? " or WhatsApp" : ""} in working hours. Your template is already downloaded.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Check className="h-3.5 w-3.5" aria-hidden="true" />Downloaded</p>
          <h3 className="mt-2 pr-8 text-lg font-semibold tracking-tight sm:text-xl">{next.title}</h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{next.line}</p>
          <form onSubmit={submit} noValidate className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <input className={field} placeholder="Your name" autoComplete="name" value={form.name} onChange={set("name")} aria-label="Your name" />
            <input className={field} placeholder="Work email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={set("email")} aria-label="Work email" />
            <input className={field} placeholder={next.phoneRequired ? "WhatsApp number" : "WhatsApp (optional)"} inputMode="tel" autoComplete="tel" value={form.whatsapp} onChange={set("whatsapp")} aria-label={next.phoneRequired ? "WhatsApp number" : "WhatsApp number, optional"} />
            <input className={field} placeholder="Company (optional)" autoComplete="organization" value={form.company} onChange={set("company")} aria-label="Company, optional" />
            <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} className="hidden" aria-hidden="true" name="website" />
            {state === "error" && error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-2">
              <button type="submit" disabled={state === "sending"}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60">
                {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                {state === "sending" ? "Sending" : next.cta}
              </button>
              <Link to={next.link.to} className="text-sm font-medium text-primary underline-offset-4 hover:underline">{next.link.label}</Link>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
