import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { toast } from "@/lib/i18n/toast";
import { useTranslation } from "@/lib/i18n/useTranslation";

export const LOCALE_LABELS: Record<string, string> = {
  en: 'EN', hi: 'हिं', bn: 'বাং', ta: 'தமி', mr: 'मरा',
  te: 'తెలు', gu: 'ગુજ', pa: 'ਪੰਜਾ', ml: 'മല', kn: 'ಕನ್ನ',
  id: 'ID', ur: 'اردو', tl: 'TL', vi: 'VI', th: 'ไทย', es: 'ES',
  zh: '中文', ar: 'عر', pt: 'PT',
};

export const LOCALE_FULL: Record<string, string> = {
  en: 'English', hi: 'हिन्दी', bn: 'বাংলা', ta: 'தமிழ்', mr: 'मराठी',
  te: 'తెలుగు', gu: 'ગુજરાતી', pa: 'ਪੰਜਾਬੀ', ml: 'മലയാളം', kn: 'ಕನ್ನಡ',
  id: 'Bahasa Indonesia', ur: 'اردو', tl: 'Tagalog', vi: 'Tiếng Việt', th: 'ไทย', es: 'Español',
  zh: '简体中文', ar: 'العربية', pt: 'Português',
};

/**
 * Visible language switch. Shows the current language code next to the globe
 * so visitors can see at a glance that other languages exist.
 */
export const LanguageSwitcher = ({ className = "" }: { className?: string }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { locale, setLocale } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (code: string) => {
    setLocale(code);
    setOpen(false);
    if (code !== locale) toast.success(`Language: ${LOCALE_FULL[code] || code.toUpperCase()}`, { duration: 1800 });
  };

  return (
    <div className={`relative ${className}`} ref={ref} data-no-translate>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`Change language (current: ${LOCALE_FULL[locale] ?? locale})`}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="h-9 min-w-9 px-2.5 flex items-center justify-center gap-1.5 rounded-full bg-secondary/60 hover:bg-secondary transition-colors text-xs font-medium text-foreground"
      >
        <Globe className="w-4 h-4" aria-hidden="true" />
        <span>{LOCALE_LABELS[locale] ?? locale.toUpperCase()}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Languages"
          className="absolute right-0 top-11 bg-background border border-border rounded-lg shadow-lg p-2 w-48 max-h-[60dvh] overflow-y-auto z-50"
        >
          {Object.entries(LOCALE_LABELS).map(([code, label]) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={locale === code}
                onClick={() => pick(code)}
                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-secondary transition-colors flex items-center justify-between gap-3 ${locale === code ? 'text-primary font-medium' : 'text-muted-foreground'}`}
              >
                <span>{LOCALE_FULL[code]}</span>
                <span className="text-[10px] opacity-60 font-mono">{label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
