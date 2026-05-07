import { memo } from 'react';
import { parseContentToSections, type FormattedSection } from '@/lib/formatContent';

interface FormattedContentProps {
  content: string;
  className?: string;
}

export const FormattedContent = memo(({ content, className = '' }: FormattedContentProps) => {
  const sections = parseContentToSections(content);

  // Group consecutive list items
  type Group = FormattedSection | { kind: 'ul'; items: string[] } | { kind: 'ol'; items: string[] };
  const groups: Group[] = [];
  let bullets: string[] = [];
  let numbered: string[] = [];
  const flush = () => {
    if (bullets.length) { groups.push({ kind: 'ul', items: bullets }); bullets = []; }
    if (numbered.length) { groups.push({ kind: 'ol', items: numbered }); numbered = []; }
  };
  for (const s of sections) {
    if (s.type === 'listItem') { if (numbered.length) flush(); bullets.push(s.content); }
    else if (s.type === 'numberedItem') { if (bullets.length) flush(); numbered.push(s.content); }
    else { flush(); groups.push(s); }
  }
  flush();

  return (
    <div className={`space-y-4 ${className}`}>
      {groups.map((g, i) => {
        if ('kind' in g) {
          if (g.kind === 'ul') {
            return (
              <ul key={i} className="space-y-2 pl-1">
                {g.items.map((it, j) => (
                  <li key={j} className="flex items-start gap-3 text-foreground/80">
                    <span className="text-primary mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="flex-1">{it}</span>
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <ol key={i} className="space-y-2 list-decimal list-inside marker:text-primary marker:font-semibold">
              {g.items.map((it, j) => <li key={j} className="text-foreground/80 pl-1">{it}</li>)}
            </ol>
          );
        }
        switch (g.type) {
          case 'table':
            return (
              <div key={i} className="overflow-x-auto my-4 rounded-md border border-border">
                <table className="w-full text-sm">
                  {g.headers && g.headers.length > 0 && (
                    <thead className="bg-muted/50">
                      <tr>{g.headers.map((h, j) => <th key={j} className="text-left font-semibold p-3 text-foreground">{h}</th>)}</tr>
                    </thead>
                  )}
                  <tbody>
                    {g.rows?.map((r, ri) => (
                      <tr key={ri} className="border-t border-border">
                        {r.map((c, ci) => <td key={ci} className="p-3 text-foreground/85">{c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'h2':
            return <h2 key={i} className="text-xl sm:text-2xl font-semibold text-foreground mt-8 first:mt-0">{g.content}</h2>;
          case 'h3':
            return <h3 key={i} className="text-lg font-semibold text-foreground mt-6 first:mt-0">{g.content}</h3>;
          case 'callout':
            return (
              <blockquote key={i} className="border-l-4 border-primary/60 bg-primary/5 pl-4 py-3 rounded-r-md text-foreground/85 italic">
                {g.content}
              </blockquote>
            );
          case 'keyValue':
            return (
              <p key={i} className="text-foreground/85 leading-relaxed">
                <span className="font-semibold text-foreground">{g.key}:</span> {g.content}
              </p>
            );
          case 'paragraph':
            return <p key={i} className="text-foreground/80 leading-relaxed">{g.content}</p>;
          default:
            return null;
        }
      })}
    </div>
  );
});

FormattedContent.displayName = 'FormattedContent';
