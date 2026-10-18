// "Paste the message you saw": matches a message from the product and says what to do.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { findFix } from '../../../supabase/functions/_shared/helpArticles';
import { contactHref, type HelpContent } from '@/lib/help/content';

export function HelpFixer({ content, onOpen, id }: { content: HelpContent; onOpen: (slug: string) => void; id?: string }) {
  const { ui, fixes } = content;
  const [msg, setMsg] = useState('');
  const fix = useMemo(() => findFix(msg, fixes), [msg, fixes]);
  const typed = msg.trim().length >= 4;
  return (
    <section id={id} className="rounded-2xl border border-border bg-background p-5 scroll-mt-24">
      <h2 className="flex items-center gap-2 text-base font-semibold"><Wrench className="h-4 w-4 text-primary" /> {ui.fixTitle}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{ui.fixLead}</p>
      <input
        value={msg}
        onChange={(e) => setMsg(e.target.value.slice(0, 400))}
        placeholder={ui.fixPlaceholder}
        aria-label={ui.fixLabel}
        className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
      <div aria-live="polite">
        {typed && fix && (
          <div className="mt-3 rounded-xl bg-primary/5 p-3 text-sm leading-relaxed">
            <span className="font-semibold text-primary">{ui.whatToDo}:</span> {fix.fix}
            {fix.slug && <> <button type="button" onClick={() => onOpen(fix.slug!)} className="font-medium text-primary underline-offset-2 hover:underline">{ui.more}</button></>}
          </div>
        )}
        {typed && !fix && (
          <div className="mt-3 rounded-xl bg-muted/60 p-3 text-sm">
            {ui.fixUnknown} <Link to={contactHref('technical', msg.trim())} className="font-medium text-primary">{ui.sendIt}</Link>
          </div>
        )}
      </div>
    </section>
  );
}
