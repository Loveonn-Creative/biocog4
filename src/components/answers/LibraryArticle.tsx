import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { LIBRARY_TOPICS } from '@/data/answerLibraryTypes';
import type { AnswerPageData } from '@/lib/answerData';

// One answer library page. Its data (the page and its related links) arrives
// as one small JSON file, or embedded in the prerendered HTML on first visit,
// so the browser never downloads the whole library.
export function LibraryArticle({ data }: { data: AnswerPageData }) {
  const { page, related: more } = data;
  const entry = page;
  return (
    <article className="container max-w-2xl mx-auto px-5 pt-10 pb-20 md:pt-16">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link to="/answers" className="hover:text-foreground">Answers</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span>{LIBRARY_TOPICS[entry.topic].label}</span>
      </nav>
      <h1 className="mt-5 text-[2rem] leading-[1.15] font-semibold tracking-tight md:text-[2.6rem] [text-wrap:balance]">{entry.q}</h1>

      <div className="mt-8 rounded-3xl border-l-4 border-primary bg-primary/5 p-6">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Short answer</div>
        <p data-speakable className="mt-2 text-[19px] leading-relaxed text-foreground [text-wrap:pretty]">{entry.short}</p>
      </div>

      <>
          <div className="mt-10 space-y-10 text-[17px] leading-[1.75] text-foreground/85">
            {page.sections.map((s) => (
              <section key={s.h}>
                <h2 className="text-xl font-semibold leading-snug tracking-tight text-foreground">{s.h}</h2>
                {s.p?.map((p) => <p key={p} className="mt-3">{p}</p>)}
                {s.ul?.length ? <ul className="mt-3 list-disc space-y-1.5 pl-5">{s.ul.map((x) => <li key={x}>{x}</li>)}</ul> : null}
                {s.ol?.length ? <ol className="mt-3 list-decimal space-y-1.5 pl-5">{s.ol.map((x) => <li key={x}>{x}</li>)}</ol> : null}
              </section>
            ))}
          </div>

          {page.example && (
            <figure className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
              <figcaption className="border-b border-dashed border-border px-5 py-3 text-sm font-medium">{page.example.title}</figcaption>
              <ol className="px-5 py-4 font-mono text-[14px] leading-7 text-foreground/90">
                {page.example.lines.map((l, i) => (
                  <li key={l} className={i === page.example!.lines.length - 1 ? 'mt-1 border-t border-border pt-2 font-semibold text-foreground' : ''}>{l}</li>
                ))}
              </ol>
              {page.example.note && <p className="border-t border-border bg-secondary/40 px-5 py-3 text-sm text-muted-foreground">{page.example.note}</p>}
            </figure>
          )}

          <div className="mt-10 rounded-2xl border border-border p-5">
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-primary">What Senseible does here</h2>
            <p className="mt-2 text-[16px] leading-relaxed">{page.senseible}</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {page.links.map((l, i) => (
              <Link key={l.to} to={l.to} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2 text-sm font-medium ${i === 0 ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-secondary'}`}>
                {l.label}{i === 0 && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </Link>
            ))}
          </div>

          <div className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
            <h2 className="font-medium text-foreground">Sources</h2>
            <ul className="mt-2 space-y-1.5">
              {page.sources.map((s) => (
                <li key={s.url + s.label}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 underline underline-offset-2 hover:text-foreground">
                    {s.label}<ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4">Last reviewed <time dateTime={page.reviewed}>{new Date(page.reviewed).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</time>.{page.reviewNote ? ` ${page.reviewNote}` : ''}</p>
          </div>
      </>

      {more.length > 0 && (
        <aside className="mt-14 border-t border-border pt-8">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">Related</h2>
          <ul className="mt-3 divide-y divide-border">
            {more.map((r) => (
              <li key={r.slug}><Link to={`/answers/${r.slug}`} className="group flex items-center justify-between gap-4 py-3.5 text-[16px] hover:text-primary">{r.q}<ArrowRight className="h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100" aria-hidden="true" /></Link></li>
            ))}
          </ul>
        </aside>
      )}
      <p className="mt-10 text-sm text-muted-foreground">Spotted something out of date? <Link to="/contact?topic=climate" className="text-primary underline underline-offset-2">Tell us</Link> and we will check it against the source.</p>
    </article>
  );
}

export default LibraryArticle;
