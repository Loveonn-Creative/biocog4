import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "@/lib/i18n/useT";
import { scrollToSection } from "./lazy";

export interface NavGroup { id: string; label: string; sections: string[] }

/**
 * A slim bar that appears once the hero has scrolled away: where you are on a
 * long page, a jump to any part, and the conversation always one tap away.
 */
export const SectionNav = ({ groups, visible, onTalk }: { groups: NavGroup[]; visible: boolean; onTalk: () => void }) => {
  const t = useT();
  const [current, setCurrent] = useState(groups[0]?.id);

  useEffect(() => {
    const els = groups.flatMap(g => g.sections.map(id => document.getElementById(id))).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!hit) return;
      const g = groups.find(x => x.sections.includes(hit.target.id));
      if (g) setCurrent(g.id);
    }, { rootMargin: "-40% 0px -55% 0px" });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [groups]);

  const go = (g: NavGroup) => void scrollToSection(g.sections[0]);

  return (
    <nav aria-label={t("ent.nav.aria", "On this page")} aria-hidden={!visible}
      className={`hidden md:block fixed inset-x-0 top-0 z-40 bg-background/90 backdrop-blur border-b border-border transition-transform duration-300 ${visible ? "translate-y-0" : "-translate-y-full"}`}>
      <div className="mx-auto max-w-5xl pl-28 pr-32 xl:pl-6 xl:pr-6 h-14 flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        {groups.map(g => (
          <button key={g.id} tabIndex={visible ? 0 : -1} onClick={() => go(g)} aria-current={g.id === current ? "true" : undefined}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs sm:text-sm transition-colors ${g.id === current ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
            {t(`ent.nav.${g.id}`, g.label)}
          </button>
        ))}
        <Link to="/pricing?plan=scale#plans" tabIndex={visible ? 0 : -1} className="hidden sm:inline-flex shrink-0 ml-auto px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {t("ent.nav.pricing", "Scale plan")}
        </Link>
        <button tabIndex={visible ? 0 : -1} onClick={onTalk} className="hidden sm:inline-flex shrink-0 rounded-full bg-foreground text-background px-4 py-1.5 text-sm font-medium">
          {t("ent.nav.talk", "Talk to us")}
        </button>
      </div>
    </nav>
  );
};
