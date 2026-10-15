import { Fragment, type ReactNode } from 'react';
import { parseMath, type MathNode } from '@/lib/mathMarkup';
import { resolveRefs } from '@/data/whitePaper';

function renderNodes(nodes: MathNode[]): ReactNode {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text': return <Fragment key={i}>{n.v}</Fragment>;
      case 'sub': return <sub key={i}>{renderNodes(n.c)}</sub>;
      case 'sup': return <sup key={i}>{renderNodes(n.c)}</sup>;
      case 'bar': return <span key={i} className="wp-bar">{renderNodes(n.c)}</span>;
      case 'hat': return <span key={i} className="wp-hat">{renderNodes(n.c)}</span>;
      case 'sqrt': return <span key={i} className="wp-sqrt"><span aria-hidden="true">√</span><span className="wp-sqrt-in">{renderNodes(n.c)}</span></span>;
      case 'frac': return (
        <span key={i} className="wp-frac">
          <span className="wp-frac-n">{renderNodes(n.n)}</span>
          <span className="wp-frac-d">{renderNodes(n.d)}</span>
        </span>
      );
    }
  });
}

/** One piece of equation markup as math. */
export function MathExpr({ src }: { src: string }) {
  return <span className="wp-math">{renderNodes(parseMath(src))}</span>;
}

/** Prose: **bold**, $inline math$, {eq:..} references. */
export function Prose({ text }: { text: string }) {
  const parts = resolveRefs(text).split(/(\$[^$]+\$|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('$') && p.endsWith('$') && p.length > 1) return <MathExpr key={i} src={p.slice(1, -1)} />;
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
