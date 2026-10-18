import { Link, useLocation } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { closestRoutes, normalisePath, type RouteEntry, type RouteMatch } from "@/lib/routeMatch";

// 404 "reader": the wrong address arrives as a crumpled slip; it unfolds and is
// read the way Senseible reads an invoice, then the page the visitor most
// likely meant is stamped FOUND. Matching runs in the browser against
// /route-index.json (written by the prerender). Styles: .nf-* in index.css.

// Used until the full index loads, or if it cannot be fetched.
const CORE: RouteEntry[] = [
  { p: "/", t: "Home: upload an invoice" },
  { p: "/pricing", t: "Pricing" },
  { p: "/answers", t: "Answers" },
  { p: "/climate-intelligence", t: "Climate Intelligence" },
  { p: "/calculators", t: "Calculators" },
  { p: "/cbam-calculator", t: "CBAM Calculator" },
  { p: "/carbon-credits", t: "Carbon Credits" },
  { p: "/climate-finance", t: "Green Loans" },
  { p: "/enterprise", t: "Enterprise" },
  { p: "/contact", t: "Contact" },
  { p: "/dashboard", t: "Dashboard" },
  { p: "/history", t: "History" },
  { p: "/reports", t: "Reports" },
  { p: "/verify", t: "Verify" },
  { p: "/intelligence", t: "Biocog Intelligence" },
];

let indexPromise: Promise<RouteEntry[]> | null = null;
const loadIndex = () =>
  (indexPromise ??= fetch("/route-index.json")
    .then((r) => (r.ok ? r.json() : []))
    .then((list: RouteEntry[]) => {
      const seen = new Set(list.map((x) => x.p));
      return [...list, ...CORE.filter((c) => !seen.has(c.p))];
    })
    .catch(() => CORE));

const NotFound = () => {
  const location = useLocation();
  const asked = normalisePath(location.pathname);
  const [routes, setRoutes] = useState<RouteEntry[]>(CORE);
  const [read, setRead] = useState(false);
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => { void loadIndex().then(setRoutes); }, []);

  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const readSlip = useCallback(() => {
    if (read) return;
    setRead(true);
    // Scan, then fill each line, then stamp.
    [1, 2, 3, 4, 5].forEach((s, i) => {
      timers.current.push(window.setTimeout(() => setStep(s), reduce ? 0 : 700 + i * 380));
    });
  }, [read, reduce]);

  // It reads itself once if the visitor does not tap.
  useEffect(() => {
    const id = window.setTimeout(readSlip, reduce ? 0 : 1600);
    return () => window.clearTimeout(id);
  }, [readSlip, reduce]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const top: RouteMatch[] = closestRoutes(asked, routes, 3);
  const best = top[0];
  const results = query.trim().length >= 2 ? closestRoutes(query, routes, 5, true) : [];
  const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4">
      <Helmet>
        <title>Page not found | Senseible</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <main className="w-full max-w-[560px] pt-16 pb-16 text-center">
        <h1 className="text-2xl sm:text-[26px] font-semibold text-foreground tracking-tight">This address isn't on our books</h1>
        <p className="text-muted-foreground mt-1.5 mb-7">We read it anyway, the way we read your invoices.</p>

        <div className="nf-stage">
          <div
            className={`nf-slip ${read ? "is-read" : "is-crumpled"}`}
            role="button"
            tabIndex={0}
            aria-label="Read the address you asked for"
            onClick={readSlip}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); readSlip(); } }}
          >
            <div className="nf-creases" />
            {step >= 1 && <div className="nf-scan" />}
            <div className="nf-head"><span>Senseible reader</span><span>{time}</span></div>
            <div className="nf-rows">
              <div className="nf-row"><span className="nf-k">You asked for</span><span className={`nf-v${step >= 2 ? " nf-strike" : ""}`}>{asked}</span></div>
              <div className={`nf-row${step >= 2 ? " nf-fill" : ""}`}><span className="nf-k">On our books</span><span className="nf-v">{step >= 2 ? "No page at this address" : ""}</span></div>
              <div className={`nf-row nf-match${step >= 3 ? " nf-fill" : ""}`}>
                <span className="nf-k">You meant</span>
                <span className="nf-v">
                  {step >= 3 && best && (
                    <>
                      <Link to={best.route.p}>{best.route.p}</Link>
                      <small>{best.route.t}{best.dist <= 3 ? ` · ${best.dist} letter${best.dist === 1 ? "" : "s"} off` : ""}</small>
                    </>
                  )}
                </span>
              </div>
              <div className={`nf-row nf-others${step >= 4 ? " nf-fill" : ""}`}>
                <span className="nf-k">Also close</span>
                <span className="nf-v">{step >= 4 && top.slice(1).map((m) => <Link key={m.route.p} to={m.route.p}>{m.route.p}</Link>)}</span>
              </div>
            </div>
            <div className="nf-foot">Read in your browser. Nothing was saved.</div>
            <div className={`nf-stamp${step >= 5 ? " is-on" : ""}`}>FOUND</div>
            <div className="nf-tap">Tap to read it</div>
          </div>
        </div>

        <div className="mt-11 mx-auto max-w-[420px] text-left">
          <label htmlFor="nf-q" className="block text-sm text-muted-foreground mb-2 text-center">Or tell us what you were looking for</label>
          <input
            id="nf-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. CBAM steel, pricing, diesel factor"
            autoComplete="off"
            className="w-full text-base px-4 py-3 rounded-full border border-border bg-card text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {results.length > 0 && (
            <ul className="mt-2.5">
              {results.map((m) => (
                <li key={m.route.p}>
                  <Link to={m.route.p} className="block px-3.5 py-2.5 rounded-xl hover:bg-secondary focus:bg-secondary outline-none text-foreground">
                    {m.route.t}
                    <small className="block text-xs text-muted-foreground">{m.route.p}</small>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5 justify-center mt-7">
          <Link to="/" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Upload an invoice</Link>
          <Link to="/platform" className="px-5 py-2.5 rounded-full border border-border text-sm hover:bg-secondary transition-colors">Show me what my business can gain</Link>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
