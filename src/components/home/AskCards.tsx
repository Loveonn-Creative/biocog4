import { useEffect, useRef, useState } from "react";
import { Landmark, Ship, Building2 } from "lucide-react";
import { useT } from "@/lib/i18n/useT";

/**
 * The moment that brings an MSME here: someone they depend on asks for their
 * carbon number. Three requests arrive one after another as the section
 * scrolls in, like messages on a phone.
 */
export const AskCards = () => {
  const t = useT();
  const ref = useRef<HTMLUListElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const asks = [
    { icon: Ship, from: t("home.ask.buyer.from", "EU buyer"), text: t("home.ask.buyer.text", "Please send CO₂ per tonne for your 2026 shipments.") },
    { icon: Landmark, from: t("home.ask.bank.from", "Your bank"), text: t("home.ask.bank.text", "Add your emissions baseline to the green loan file.") },
    { icon: Building2, from: t("home.ask.customer.from", "Listed customer"), text: t("home.ask.customer.text", "Fill in our supplier ESG data form.") },
  ];

  return (
    <ul ref={ref} className="mt-8 grid gap-3 max-w-md" aria-label={t("home.ask.label", "Requests MSMEs receive")}>
      {asks.map((a, i) => (
        <li
          key={a.from}
          className="flex items-start gap-3 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 shadow-[0_12px_30px_-24px_hsl(var(--foreground)/.5)] transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
          style={{
            opacity: shown ? 1 : 0,
            transform: shown ? "translateY(0)" : "translateY(14px)",
            transitionDelay: `${i * 260}ms`,
            marginLeft: `${i * 1.25}rem`,
          }}
        >
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-foreground/80">
            <a.icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-medium text-muted-foreground">{a.from}</span>
            <span className="block text-[15px] leading-snug text-foreground">{a.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
};
