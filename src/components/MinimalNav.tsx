import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Menu, X, Globe } from "lucide-react";
import { toast } from "@/lib/i18n/toast";
import senseibleLogo from "@/assets/senseible-logo.png";
import { useTranslation } from "@/lib/i18n/useTranslation";

const LOCALE_LABELS: Record<string, string> = {
  en: 'EN', hi: 'हिं', bn: 'বাং', ta: 'தமி', mr: 'मरा',
  te: 'తెలు', gu: 'ગુજ', pa: 'ਪੰਜਾ', ml: 'മല', kn: 'ಕನ್ನ',
  id: 'ID', ur: 'اردو', tl: 'TL', vi: 'VI', th: 'ไทย', es: 'ES',
  zh: '中文', ar: 'عر', pt: 'PT',
};
const LOCALE_FULL: Record<string, string> = {
  en: 'English', hi: 'हिन्दी', bn: 'বাংলা', ta: 'தமிழ்', mr: 'मराठी',
  te: 'తెలుగు', gu: 'ગુજરાતી', pa: 'ਪੰਜਾਬੀ', ml: 'മലയാളം', kn: 'ಕನ್ನಡ',
  id: 'Bahasa Indonesia', ur: 'اردو', tl: 'Tagalog', vi: 'Tiếng Việt', th: 'ไทย', es: 'Español',
  zh: '简体中文', ar: 'العربية', pt: 'Português',
};

const navLinks = [
  { path: "/platform", label: "Platform" },
  { path: "/mission", label: "Mission" },
  { path: "/about", label: "About" },
  { path: "/trust", label: "Trust" },
  { path: "/calculators", label: "Calculators" },
  { path: "/climate-intelligence", label: "Climate Intelligence" },
  { path: "/careers", label: "Careers" },
  { path: "/contact", label: "Contact" },
  { path: "/legal", label: "Legal" },
];

export const MinimalNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { locale, setLocale } = useTranslation();

  // Close popover on outside click + Escape
  useEffect(() => {
    if (!showLang) return;
    const onClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLang(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowLang(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showLang]);

  const handlePickLocale = (code: string) => {
    setLocale(code);
    setShowLang(false);
    if (code !== locale) {
      toast.success(`Language: ${LOCALE_FULL[code] || code.toUpperCase()}`, { duration: 1800 });
    }
  };


  return (
    <>
      {/* Logo - always visible, acts as nav trigger */}
      <div className={`fixed top-6 left-6 z-50 ${isHome ? "opacity-0 hover:opacity-100" : "opacity-100"} transition-opacity duration-500`}>
        <Link 
          to="/" 
          className="flex items-center gap-2 group"
          onClick={() => setIsOpen(false)}
        >
          <img 
            src={senseibleLogo} 
            alt="Senseible" 
            className="h-7 w-auto invert transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
      </div>

      {/* Language + Menu toggles */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-2">
        {/* Language toggle */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setShowLang(!showLang)}
            aria-label="Change language"
            aria-expanded={showLang}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border transition-all duration-300 hover:bg-secondary text-xs font-medium"
          >
            <Globe className="w-4 h-4 text-foreground" />
          </button>
          {showLang && (
            <div className="absolute right-0 top-12 bg-background border border-border rounded-lg shadow-lg p-2 min-w-[160px] z-50">
              {Object.entries(LOCALE_LABELS).map(([code, label]) => (
                <button
                  key={code}
                  onClick={() => handlePickLocale(code)}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-secondary transition-colors flex items-center justify-between gap-3 ${locale === code ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                >
                  <span>{LOCALE_FULL[code]}</span>
                  <span className="text-[10px] opacity-60 font-mono">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Menu toggle */}
        {(!isHome || isOpen) && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border transition-all duration-300 hover:bg-secondary"
          >
            {isOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Full screen nav overlay */}
      <div
        className={`
          fixed inset-0 z-40 bg-background
          transition-all duration-500 ease-out
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8">
          {navLinks.map((link, index) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={`
                text-2xl sm:text-3xl font-medium tracking-tight
                transition-all duration-300
                ${location.pathname === link.path 
                  ? "text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
                }
                opacity-0 translate-y-4
                ${isOpen ? "animate-fade-in" : ""}
              `}
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
            >
              {link.label}
            </Link>
          ))}
          
          {/* Auth link */}
          <div className="mt-8 pt-8 border-t border-border">
            <Link
              to="/auth"
              onClick={() => setIsOpen(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Sign in to save data
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
