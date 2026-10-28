import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/useT";
import { StatusBadge } from "../StatusBadge";
import { ingestionChannels } from "@/data/enterpriseCapabilities";
import { useMotionGate } from "@/components/services/motion/kit";

// What each channel would put on the feed. Illustrative events; the first
// matches the worked invoice example used elsewhere on the page.
const EVENTS: Record<string, string[]> = {
  docs: ["Electricity bill read → Scope 2 · 2,835 kgCO2e · confidence 0.95", "Freight invoice read → Scope 3, Category 4"],
  bulk: ["Batch of 10 supplier invoices → 10 records, 1 duplicate caught by hash"],
  csv: ["Spend file imported → 312 lines classified to scope"],
  erp: ["Purchase orders synced → Category 1 updated for 18 suppliers"],
  sftp: ["Nightly drop received → 4 files queued for reading"],
  messaging: ["Photo from a supplier on WhatsApp → fuel slip read"],
  iot: ["Meter M-07 · 15-minute reading · 0.84 kWh", "Boiler fuel meter · daily total posted"],
  satellite: ["Supplier plot P-12 · boundary checked · no change since last pass"],
  livefeed: ["Plant 2 load rising · Scope 2 running total updated"],
  api: ["webhook record.verified → sent to your system"],
};

const DEFAULT_ON = ["docs", "bulk", "iot", "satellite", "livefeed"];

interface Item { id: number; key: string; text: string; }

// Fixed-height slots: events move down by transform, so nothing reflows.
const SLOT = 84;
const SHOWN = 5;

/**
 * Agents and connected sources on one feed. Switch channels on and off to
 * see what each adds; every channel shows whether it is live or custom.
 * The feed runs only while on screen; reduced motion shows a still list.
 */
export const SignalFeed = () => {
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const running = useMotionGate(boxRef);
  const [on, setOn] = useState<string[]>(DEFAULT_ON);
  const seed = (keys: string[]): Item[] => keys.slice(0, SHOWN).map((k, i) => ({ id: -i - 1, key: k, text: EVENTS[k][0] }));
  const [items, setItems] = useState<Item[]>(() => seed(DEFAULT_ON));
  const counter = useRef(0);

  useEffect(() => {
    if (!running || on.length === 0) return;
    const id = window.setInterval(() => {
      counter.current += 1;
      const key = on[counter.current % on.length];
      const pool = EVENTS[key];
      setItems(prev => [{ id: counter.current, key, text: pool[counter.current % pool.length] }, ...prev].slice(0, SHOWN));
    }, 1700);
    return () => window.clearInterval(id);
  }, [running, on]);

  // Switching a channel on shows its first event at once; switching it off clears its events.
  const toggle = (key: string) => {
    const adding = !on.includes(key);
    setOn(adding ? [...on, key] : on.filter(k => k !== key));
    counter.current += 1;
    const id = counter.current;
    setItems(cur => adding
      ? [{ id, key, text: EVENTS[key][0] }, ...cur].slice(0, SHOWN)
      : cur.filter(i => i.key !== key));
  };

  const status = (key: string) => ingestionChannels.find(c => c.key === key)!.status;

  return (
    <div ref={boxRef} className="grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-start">
      <ul className="order-2 lg:order-none divide-y divide-border border-y border-border" aria-label={t("ent.feed.channels", "Channels")}>
        {ingestionChannels.map(c => {
          const active = on.includes(c.key);
          return (
            <li key={c.key}>
              <button role="switch" aria-checked={active} onClick={() => toggle(c.key)} className="w-full flex items-start gap-3 py-3 text-left">
                <span className={`mt-0.5 h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${active ? "bg-primary" : "bg-border"}`} aria-hidden="true">
                  <span className={`block h-4 w-4 rounded-full bg-background transition-transform ${active ? "translate-x-4" : ""}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm sm:text-base">{t(`ent.in.${c.key}`, c.label)}</span>
                  {c.note && <span className="block text-xs text-muted-foreground mt-0.5">{t(`ent.in.${c.key}.note`, c.note)}</span>}
                  {/* Phones: the feed is above, so show what this channel adds right here. */}
                  {active && <span className="lg:hidden block mt-1 font-mono text-[11px] text-primary">{EVENTS[c.key][0]}</span>}
                </span>
                <StatusBadge status={c.status} />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="order-1 lg:order-none rounded-3xl bg-foreground text-background p-4 sm:p-5 lg:sticky lg:top-20">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-background/70 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${running && on.length ? "bg-success animate-pulse" : "bg-background/40"}`} aria-hidden="true" />
            {t("ent.feed.title", "Signal feed")}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-background/50">{t("ent.feed.illus", "Illustration")}</p>
        </div>
        <ul className="relative mt-4" style={{ height: SLOT * SHOWN - 8 }} aria-live="off">
          {items.length === 0 && <li className="text-sm text-background/60">{t("ent.feed.empty", "Switch a channel on to see what it adds.")}</li>}
          {items.map((i, idx) => (
            <li key={i.id} className="absolute inset-x-0 top-0 transition-transform duration-300 ease-out" style={{ transform: `translateY(${idx * SLOT}px)`, height: SLOT - 8 }}>
              <div className="h-full rounded-xl bg-background/10 px-3 py-2.5 overflow-hidden animate-[ent-feed_0.35s_ease-out_both]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-background/60">{t(`ent.in.${i.key}`, ingestionChannels.find(c => c.key === i.key)!.label)}</span>
                <span className={`text-[10px] font-mono uppercase ${status(i.key) === "live" ? "text-success" : "text-background/50"}`}>{status(i.key)}</span>
              </div>
              <p className="mt-1 font-mono text-[11px] sm:text-xs leading-relaxed line-clamp-2">{i.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] text-background/60">{t("ent.feed.note", "Live today: documents and bulk upload. Sensors, satellite mapping, live feeds and integrations are built to your requirements.")}</p>
      </div>
    </div>
  );
};
