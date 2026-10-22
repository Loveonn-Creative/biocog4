// Organisations Senseible is associated with, set as wordmarks (names, not
// logos). Each gets its own weight so the row reads like a wall of marks.
const STYLE: Record<string, string> = {
  serif: 'font-serif font-bold text-[17px]',
  caps: "uppercase tracking-[.16em] text-[13px] font-semibold",
  sans: "font-semibold text-[15px] tracking-[.01em]",
};

export function TrustNames({ names, label }: { names: [string, keyof typeof STYLE][]; label: string }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[.16em] opacity-60">{label}</p>
      <ul className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4">
        {names.map(([n, s]) => <li key={n} className={`${STYLE[s]} opacity-80`}>{n}</li>)}
      </ul>
    </div>
  );
}
