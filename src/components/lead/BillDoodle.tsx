/**
 * The MSME tool's input and answer on the document it comes from: the
 * electricity bill's "units consumed" line is circled, and an arrow carries
 * the result to whoever asked. Tilted in 3D like a bill on a desk.
 */
export function BillDoodle({ kwh, tonnes, to }: { kwh: number; tonnes: number | null; to: string }) {
  const units = kwh > 0 ? kwh.toLocaleString("en-IN") : "____";
  return (
    <div className="relative mx-auto h-[300px] w-full max-w-[420px] [perspective:1100px] sm:h-[340px]" aria-hidden="true">
      {/* the bill */}
      <div className="absolute left-[4%] top-[6%] w-[58%] rounded-xl border border-border bg-card p-4 shadow-[0_40px_60px_-40px_hsl(var(--foreground)/.45)] [transform:rotateX(14deg)_rotateY(-16deg)_rotateZ(-4deg)] motion-safe:animate-[lm-float_8s_ease-in-out_infinite]">
        <div className="mb-3 h-2 w-16 rounded bg-foreground/70" />
        <div className="mb-1.5 h-1.5 w-24 rounded bg-muted-foreground/30" />
        <div className="mb-4 h-1.5 w-16 rounded bg-muted-foreground/30" />
        <div className="space-y-2 font-mono text-[10px] text-muted-foreground">
          <div className="flex justify-between"><span>Meter no.</span><span>•••• 4471</span></div>
          <div className="flex justify-between"><span>Fixed charge</span><span>₹ •••</span></div>
          <div className="relative flex justify-between text-foreground">
            <span>Units consumed</span>
            <span key={units} className="font-semibold motion-safe:animate-[lm-pop_300ms_ease-out]">{units} kWh</span>
            <svg viewBox="0 0 120 34" className="absolute -right-3 -top-[11px] h-[34px] w-[96px] text-primary" preserveAspectRatio="none">
              <path key={`c${units}`} d="M8 18 C 10 4, 108 2, 113 15 C 117 28, 22 33, 7 22 C 1 17, 12 9, 30 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                pathLength={1} strokeDasharray={1} className="animate-[lm-draw_700ms_cubic-bezier(.6,0,.2,1)_both] motion-reduce:animate-none" />
            </svg>
          </div>
          <div className="flex justify-between"><span>Energy charge</span><span>₹ •••</span></div>
          <div className="flex justify-between"><span>Total</span><span>₹ ••,•••</span></div>
        </div>
        <div className="mt-4 h-1.5 w-20 rounded bg-muted-foreground/25" />
      </div>

      {/* the arrow to whoever asked */}
      <svg viewBox="0 0 200 160" className="absolute right-[6%] top-[30%] h-[46%] w-[42%] text-foreground/70">
        <path d="M6 30 C 70 10, 120 40, 150 110" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" pathLength={1} strokeDasharray={1}
          className="animate-[lm-draw_900ms_300ms_cubic-bezier(.6,0,.2,1)_both] motion-reduce:animate-none" />
        <path d="M138 100 L151 113 L158 96" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* the result, stamped */}
      <div className={`absolute bottom-[4%] right-[4%] w-[46%] rotate-[-6deg] rounded-2xl border-2 border-dashed px-3 py-3 text-center transition-all duration-500 motion-reduce:transition-none ${tonnes !== null ? "border-primary text-primary opacity-100 scale-100" : "border-border text-muted-foreground opacity-70 scale-95"}`}>
        <div className="text-[11px] uppercase tracking-[0.12em]">to {to || "you"}</div>
        <div className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">{tonnes !== null ? `≈ ${tonnes.toLocaleString("en-IN", { maximumFractionDigits: 1 })} t` : "your number"}</div>
        <div className="text-[11px]">CO₂ a year, estimate</div>
      </div>
    </div>
  );
}
