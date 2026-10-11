import { Link } from "react-router-dom";
import { ArrowRight, Clock, FileText, IndianRupee, Users, MessageCircle, CalendarDays, Lock } from "lucide-react";
import type { ServiceConfig } from "@/data/services/types";
import { scopingCallUrl, serviceEvents, whatsappUrl } from "./actions";

const PLAN_LABEL = { snapshot: "Snapshot (free)", essential: "Essential", pro: "Pro", scale: "Scale (custom pricing)" } as const;

/** The quotable answer: one question, one direct answer. */
export const AnswerBlock = ({ config }: { config: ServiceConfig }) => (
  <section className="container max-w-3xl mx-auto px-5 py-14 md:py-20" aria-labelledby="answer-q">
    <h2 id="answer-q" className="text-sm font-medium uppercase tracking-[0.14em] text-primary mb-4">{config.answer.q}</h2>
    <p data-speakable className="text-xl md:text-2xl leading-relaxed text-foreground [text-wrap:pretty]">{config.answer.a}</p>
  </section>
);

/** What the buyer receives, shown partly blurred so it can be pictured. */
export const DeliverablePreview = ({ config }: { config: ServiceConfig }) => (
  <section className="container max-w-5xl mx-auto px-5 pb-14 md:pb-20">
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_60px_-40px_hsl(var(--foreground)/.35)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4 text-primary" aria-hidden="true" />{config.deliverable.title}</div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">Sample</span>
      </div>
      <dl className="divide-y divide-border">
        {config.deliverable.rows.map(([k, v], i) => (
          <div key={k} className={`grid grid-cols-[1fr_auto] gap-4 px-5 py-3 text-sm ${i > 2 ? "blur-[3px] select-none" : ""}`} aria-hidden={i > 2}>
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-mono text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
      <div className="absolute inset-x-0 bottom-4 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" aria-hidden="true" /> Full version with your data</span>
      </div>
    </div>
  </section>
);

/** Two lanes: the MSME owner and the enterprise ESG or procurement head. */
export const Lanes = ({ config }: { config: ServiceConfig }) => (
  <section className="border-y border-border bg-secondary/30">
    <div className="container max-w-5xl mx-auto px-5 py-14 md:py-20 grid gap-4 md:grid-cols-2">
      <div className="rounded-3xl border border-border bg-background p-6 md:p-8 flex flex-col">
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-3">MSME owner</div>
        <p className="text-lg font-medium mb-2">Clear price. Simple steps.</p>
        <p className="text-sm text-muted-foreground mb-6">Start on {PLAN_LABEL[config.plan]}. Send us your bills; we do the rest.</p>
        <div className="mt-auto flex flex-wrap gap-2">
          <a href={whatsappUrl(config.nav)} target="_blank" rel="noopener noreferrer" onClick={() => serviceEvents.cta(config.slug, "msme", "whatsapp_lane")}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp us
          </a>
          <Link to="/pricing" onClick={() => serviceEvents.cta(config.slug, "msme", "pricing")} className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:border-primary/50">
            See prices <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="rounded-3xl border border-border bg-foreground text-background p-6 md:p-8 flex flex-col">
        <div className="text-xs uppercase tracking-[0.14em] text-background/60 mb-3">ESG, sustainability or procurement head</div>
        <p className="text-lg font-medium mb-2">A committee-ready output with a trail.</p>
        <p className="text-sm text-background/70 mb-6">Every figure keeps its source document, factor and methodology version.</p>
        <div className="mt-auto flex flex-wrap gap-2">
          <Link to={scopingCallUrl(config.slug, config.contactTopic, config.nav)} onClick={() => serviceEvents.cta(config.slug, "enterprise", "scoping_call_lane")}
            className="inline-flex items-center gap-2 rounded-xl bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-background/90">
            <CalendarDays className="h-4 w-4" aria-hidden="true" /> Book a scoping call
          </Link>
          <Link to="/trust" onClick={() => serviceEvents.cta(config.slug, "enterprise", "methodology")} className="inline-flex items-center gap-1 rounded-xl border border-background/30 px-4 py-2.5 text-sm font-medium hover:border-background/60">
            Methodology and security <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  </section>
);

/** Price, time, data needed, who does the work: answered before anyone asks. */
export const Objections = ({ config }: { config: ServiceConfig }) => {
  const items = [
    { icon: IndianRupee, k: "Price", v: config.objections.price },
    { icon: Clock, k: "Time", v: config.objections.time },
    { icon: FileText, k: "What you need", v: config.objections.data },
    { icon: Users, k: "Who does the work", v: config.objections.who },
  ];
  return (
    <section className="container max-w-5xl mx-auto px-5 py-14 md:py-20">
      <ul className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, k, v }) => (
          <li key={k} className="bg-background p-5 md:p-6">
            <Icon className="h-4 w-4 text-primary mb-3" aria-hidden="true" />
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1.5">{k}</div>
            <p className="text-sm text-foreground leading-relaxed">{v}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};

/** Product surfaces that already do part of the job, plus FAQs. */
export const ProductAndFaq = ({ config }: { config: ServiceConfig }) => (
  <section className="container max-w-5xl mx-auto px-5 pb-14 md:pb-20 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
    <div>
      <h2 className="text-xl font-semibold mb-4">Already in Senseible</h2>
      <ul className="space-y-2">
        {config.product.map(p => (
          <li key={p.to}>
            <Link to={p.to} className="group flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm hover:border-primary/50">
              {p.label}
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
    <div>
      <h2 className="text-xl font-semibold mb-4">Questions buyers ask</h2>
      <div className="divide-y divide-border border-y border-border">
        {config.faqs.map(f => (
          <details key={f.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-medium text-foreground">
              {f.q}
              <span aria-hidden="true" className="mt-0.5 text-muted-foreground transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);
