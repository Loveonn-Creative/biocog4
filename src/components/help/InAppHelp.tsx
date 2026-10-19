// The "?" button on signed-in app pages. It opens the Help Center in a side
// panel next to the person's work, with the articles for the current page
// first. It only reads static help copy; it never touches records or the
// upload, verify, report or payment steps.

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronRight, HelpCircle, MessageCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSession } from '@/hooks/useSession';
import { useI18nContext } from '@/lib/i18n/LanguageProvider';
import { contactHref, useHelpContent } from '@/lib/help/content';
import { HelpAsk } from './HelpAsk';
import { HelpFixer } from './HelpFixer';
import { HelpArticleBody } from './HelpArticleView';

export default function InAppHelp() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useSession();
  const { locale } = useI18nContext();
  const content = useHelpContent(locale);
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  // Following a link from the panel closes it.
  useEffect(() => { setOpen(false); }, [pathname]);
  if (!isAuthenticated) return null;

  const { ui, articles } = content;
  const here = articles.filter((a) => a.pages?.includes(pathname)).slice(0, 5);
  const article = slug ? articles.find((a) => a.slug === slug) : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => { setSlug(null); setOpen(true); }}
        aria-label={ui.openHelp}
        className="fixed bottom-[5.5rem] right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 motion-safe:hover:scale-105 md:bottom-6 md:right-6"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md" lang={content.locale}>
          <SheetHeader className="text-left">
            <SheetTitle>{ui.openHelp}</SheetTitle>
            <SheetDescription className="sr-only">{ui.hubLead}</SheetDescription>
          </SheetHeader>

          {article ? (
            <div className="mt-4">
              <button type="button" onClick={() => setSlug(null)} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> {ui.back}
              </button>
              <h3 className="mb-3 text-lg font-semibold leading-snug">{article.q}</h3>
              <HelpArticleBody article={article} ui={ui} compact />
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              <HelpAsk content={content} onOpen={setSlug} compact />

              {here.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">{ui.forThisPage}</h3>
                  <ul className="space-y-1">
                    {here.map((a) => (
                      <li key={a.slug}>
                        <button type="button" onClick={() => setSlug(a.slug)} className="flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2 text-left hover:bg-muted/60">
                          <span>
                            <span className="block text-sm font-medium">{a.q}</span>
                            <span className="block text-xs text-muted-foreground">{a.a}</span>
                          </span>
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <HelpFixer content={content} onOpen={setSlug} />

              <div className="flex flex-wrap gap-2">
                <Link to="/help" onClick={() => setOpen(false)} className="rounded-xl border border-border px-3 py-2 text-sm hover:border-primary">{ui.allTopics}</Link>
                <Link to={contactHref('technical')} onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm hover:border-primary">
                  <MessageCircle className="h-4 w-4 text-primary" /> {ui.messageUs}
                </Link>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
