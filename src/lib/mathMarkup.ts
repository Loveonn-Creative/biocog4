// A tiny equation markup for the White Paper, so one string serves both the
// rendered page (sub/superscripts, fractions, roots) and the prerendered plain
// text that search engines and the /md mirror read. Pure, so it is tested.
//
//   _{x}  subscript      ^{x}  superscript      \frac{a}{b}  fraction
//   \sqrt{x}  square root      \bar{x}  mean (overline)      \hat{x}  estimate

export type MathNode =
  | { t: 'text'; v: string }
  | { t: 'sub' | 'sup' | 'sqrt' | 'bar' | 'hat'; c: MathNode[] }
  | { t: 'frac'; n: MathNode[]; d: MathNode[] };

const COMMANDS = ['frac', 'sqrt', 'bar', 'hat'] as const;

function readGroup(src: string, i: number): [string, number] {
  if (src[i] !== '{') throw new Error(`Expected { at ${i} in "${src}"`);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return [src.slice(i + 1, j), j + 1];
  }
  throw new Error(`Unclosed { in "${src}"`);
}

export function parseMath(src: string): MathNode[] {
  const out: MathNode[] = [];
  let text = '';
  const flush = () => { if (text) { out.push({ t: 'text', v: text }); text = ''; } };
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if ((ch === '_' || ch === '^') && src[i + 1] === '{') {
      flush();
      const [g, next] = readGroup(src, i + 1);
      out.push({ t: ch === '_' ? 'sub' : 'sup', c: parseMath(g) });
      i = next;
      continue;
    }
    if (ch === '\\') {
      const cmd = COMMANDS.find((c) => src.startsWith(c, i + 1) && src[i + 1 + c.length] === '{');
      if (cmd) {
        flush();
        const [a, afterA] = readGroup(src, i + 1 + cmd.length);
        if (cmd === 'frac') {
          const [b, afterB] = readGroup(src, afterA);
          out.push({ t: 'frac', n: parseMath(a), d: parseMath(b) });
          i = afterB;
        } else {
          out.push({ t: cmd, c: parseMath(a) });
          i = afterA;
        }
        continue;
      }
    }
    text += ch;
    i++;
  }
  flush();
  return out;
}

const SUB: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '−': '₋', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ' };
const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '−': '⁻', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾' };
const mapAll = (s: string, table: Record<string, string>) => [...s].every((c) => c in table) ? [...s].map((c) => table[c]).join('') : null;
const needsParens = (s: string) => /[\s+−\-×·/]/.test(s.trim());

/** Plain-text form of the markup: Unicode sub/superscripts where they exist, readable fallbacks otherwise. */
export function mathToText(src: string | MathNode[]): string {
  const nodes = typeof src === 'string' ? parseMath(src) : src;
  return nodes.map((n) => {
    switch (n.t) {
      case 'text': return n.v;
      case 'sub': { const s = mathToText(n.c); return mapAll(s, SUB) ?? s; }
      case 'sup': { const s = mathToText(n.c); return mapAll(s, SUP) ?? `^(${s})`; }
      case 'sqrt': return `√(${mathToText(n.c)})`;
      case 'bar': { const s = mathToText(n.c); return s.length === 1 ? `${s}̄` : `mean(${s})`; }
      case 'hat': { const s = mathToText(n.c); return s.length === 1 ? `${s}̂` : `est(${s})`; }
      case 'frac': {
        const a = mathToText(n.n), b = mathToText(n.d);
        return `${needsParens(a) ? `(${a})` : a} / ${needsParens(b) ? `(${b})` : b}`;
      }
    }
  }).join('');
}
