import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, CalendarDays } from "lucide-react";
import type { ServiceConfig, ToolResult } from "@/data/services/types";
import { scopingCallUrl, serviceEvents, whatsappUrl } from "./actions";

/** The answer, then exactly two next steps: one per buyer lane. */
export const ResultPanel = ({ config, result }: { config: ServiceConfig; result: ToolResult }) => (
  <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
    <p className="text-lg sm:text-xl font-semibold leading-snug text-foreground [text-wrap:balance]" aria-live="polite">{result.headline}</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <a
        href={whatsappUrl(config.nav, result.summary)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => serviceEvents.cta(config.slug, "msme", "whatsapp_result")}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> Send this on WhatsApp
      </a>
      <Link
        to={scopingCallUrl(config.slug, config.contactTopic, config.nav, result.summary)}
        onClick={() => serviceEvents.cta(config.slug, "enterprise", "scoping_call_result")}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:border-primary/50 transition-colors"
      >
        <CalendarDays className="h-4 w-4" aria-hidden="true" /> Book a scoping call
      </Link>
    </div>
    <Link
      to="/"
      onClick={() => serviceEvents.cta(config.slug, "self_serve", "start_free")}
      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      Or upload a bill and start free <ArrowRight className="h-3 w-3" aria-hidden="true" />
    </Link>
  </div>
);
