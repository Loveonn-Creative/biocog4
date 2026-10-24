import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MessageCircle, X } from "lucide-react";
import { loadSupabase } from "@/integrations/supabase/lazyClient";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { leadEvents } from "@/components/lead/leadEvents";
import { WHATSAPP_NUMBER } from "@/components/services/shell/actions";

// One way to reach the team from the CBAM pages without leaving them:
// WhatsApp in one tap, or a short form that goes through the existing
// contact notification (send-contact-notification) to the internal inbox.
// Nothing is stored in the browser and no new backend is involved.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s-]{10,16}$/;

const TOPICS = [
  { id: "pricing", label: "Pricing" },
  { id: "data", label: "My plant's data" },
  { id: "verification", label: "Verification" },
  { id: "buyer", label: "My EU buyer's request" },
] as const;
type TopicId = (typeof TOPICS)[number]["id"];

interface Props {
  /** Where the visitor is, for the message and analytics. */
  page: "cbam" | "cbam-suite";
  label?: string;
  className?: string;
}

export function CbamTalkButton({ page, label = "Talk to us", className }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => { setOpen(true); leadEvents.cta(page, "talk_open"); }} className={className}>
        {label}
      </button>
      {open && <CbamTalkSheet page={page} onClose={() => setOpen(false)} />}
    </>
  );
}

function CbamTalkSheet({ page, onClose }: { page: Props["page"]; onClose: () => void }) {
  const [topic, setTopic] = useState<TopicId>("pricing");
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "", company: "", note: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => first.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const topicLabel = TOPICS.find((t) => t.id === topic)?.label ?? "CBAM";
  const where = page === "cbam" ? "the CBAM page" : "the CBAM suite";
  const waText = `Hi Senseible, I'm on ${where}. I'd like to talk about: ${topicLabel}.`;
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim().length > 1 && EMAIL_RE.test(form.email.trim()) && PHONE_RE.test(form.whatsapp.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.website) { setState("sent"); return; } // honeypot
    if (!valid) { setError("Add your name, work email and WhatsApp number."); setState("error"); return; }
    setState("sending"); setError("");
    const message = [
      `CBAM enquiry from ${where} (/${page}).`,
      `Topic: ${topicLabel}.`,
      form.company.trim() ? `Company: ${form.company.trim()}.` : "",
      `WhatsApp: ${form.whatsapp.trim()}.`,
      form.note.trim() ? `Note: ${form.note.trim().slice(0, 600)}` : "",
    ].filter(Boolean).join("\n");
    const supabase = await loadSupabase();
    const { data, error: fnError } = await supabase.functions.invoke("send-contact-notification", {
      body: { name: form.name.trim(), email: form.email.trim(), phone: form.whatsapp.trim(), company: form.company.trim() || undefined, category: "enterprise", newsletter: false, message },
    });
    if (fnError || !data?.success) {
      setError(await getFunctionErrorMessage(fnError, "That did not go through. Try again, or message us on WhatsApp."));
      setState("error");
      return;
    }
    leadEvents.submit(page, { topic });
    setState("sent");
  };

  const field = "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="cbam-talk-title" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-6 text-foreground shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 id="cbam-talk-title" className="text-xl font-semibold tracking-tight">
            {state === "sent" ? `Thanks, ${form.name.trim().split(" ")[0] || "there"}.` : "Talk to our CBAM team"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full border border-border hover:border-primary/50"><X className="h-4 w-4" /></button>
        </div>

        {state === "sent" ? (
          <div className="mt-4 grid gap-4">
            <p className="flex items-start gap-2 text-[15px] text-muted-foreground"><Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> We have your request about {topicLabel.toLowerCase()}. Expect a reply on WhatsApp or email in working hours.</p>
            <button type="button" onClick={onClose} className="h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Back to the page</button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">Pricing depends on your plant and products. Tell us what you need and we'll come back with a plan and a quote.</p>

            <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="What do you want to discuss?">
              {TOPICS.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={topic === t.id} onClick={() => setTopic(t.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${topic === t.id ? "border-foreground bg-foreground text-background" : "border-border hover:border-primary/50"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={() => leadEvents.cta(page, `talk_whatsapp_${topic}`)}
              className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              <MessageCircle className="h-4 w-4" /> Message us on WhatsApp
            </a>

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or leave your details<span className="h-px flex-1 bg-border" /></div>

            <form onSubmit={submit} className="grid gap-3" noValidate>
              <input ref={first} className={field} placeholder="Your name" autoComplete="name" value={form.name} onChange={set("name")} aria-label="Your name" />
              <input className={field} placeholder="Work email" type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-label="Work email" />
              <input className={field} placeholder="WhatsApp number" type="tel" autoComplete="tel" value={form.whatsapp} onChange={set("whatsapp")} aria-label="WhatsApp number" />
              <input className={field} placeholder="Company (optional)" autoComplete="organization" value={form.company} onChange={set("company")} aria-label="Company" />
              <textarea className={`${field} h-20 py-2.5`} placeholder="What do you export, roughly how much? (optional)" value={form.note} onChange={set("note")} aria-label="Note" />
              <input tabIndex={-1} autoComplete="off" className="hidden" value={form.website} onChange={set("website")} aria-hidden="true" />
              {state === "error" && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <button type="submit" disabled={state === "sending"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-foreground px-5 text-sm font-semibold hover:bg-foreground hover:text-background disabled:opacity-60">
                {state === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending</> : "Send my details"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
