import { Link } from 'react-router-dom';
import { ArrowUpRight, FileBarChart, Landmark, Ship, Target } from 'lucide-react';

// Where verified records go next. CBAM shows only for accounts with invoices
// in euros, the one signal on record that the business sells into the EU; the
// roadmap only for accounts with a saved net-zero goal.

export function UseEvidence({ hasVerified, invoicesInEur, hasNetZero = false }: { hasVerified: boolean; invoicesInEur: boolean; hasNetZero?: boolean }) {
  const items = [
    { to: '/reports', icon: FileBarChart, title: 'Reports', line: hasVerified ? 'Framework reports and the audit file, from verified records.' : 'Built from verified records once you have them.' },
    { to: '/monetize', icon: Landmark, title: 'Climate finance', line: 'Green loans and other options that ask for verified data.' },
    ...(hasNetZero ? [{ to: '/net-zero', icon: Target, title: 'Net-zero roadmap', line: 'Track progress against the goal you set.' }] : []),
    ...(invoicesInEur ? [{ to: '/cbam-calculator', icon: Ship, title: 'CBAM exposure', line: 'You invoice in euros. See what EU importers will ask for.' }] : []),
  ];
  return (
    <section aria-labelledby="use-title" className="min-w-0 rounded-xl border border-border bg-card p-4 md:p-5">
      <h2 id="use-title" className="text-[15px] font-semibold">Use your evidence</h2>
      <ul className="mt-2 divide-y divide-border">
        {items.map(({ to, icon: Icon, title, line }) => (
          <li key={to}>
            <Link to={to} className="group flex items-center gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground/80"><Icon className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium">{title}</span>
                <span className="block text-[12.5px] text-muted-foreground">{line}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
