import { Link } from "react-router-dom";

/** Wordmark in the page's own ink, so it reads on every ad palette. No menu: one job per page. */
export const AdHeader = () => (
  <header className="absolute inset-x-0 top-0 z-30">
    <div className="mx-auto flex max-w-6xl items-center px-5 py-5">
      <Link to="/" aria-label="Senseible home" className="text-lg font-bold tracking-tight text-[var(--lp-ink)]">Senseible</Link>
    </div>
  </header>
);
