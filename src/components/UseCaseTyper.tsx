import { useState, useEffect, useMemo, forwardRef } from 'react';
import { useI18nContext } from '@/lib/i18n/LanguageProvider';

const useCasesMultilang: Record<string, string[]> = {
  'en': [
    "Turn invoices into carbon credits",
    "Check green loan eligibility",
    "Track Scope 1, 2, 3 emissions",
    "Prepare for EU CBAM compliance",
    "Verify emissions instantly",
    "Unlock climate finance today",
  ],
  'hi': [
    "चालान को कार्बन क्रेडिट में बदलें",
    "ग्रीन लोन पात्रता जांचें",
    "स्कोप 1, 2, 3 उत्सर्जन ट्रैक करें",
    "EU CBAM अनुपालन की तैयारी",
    "उत्सर्जन तुरंत सत्यापित करें",
    "आज क्लाइमेट फाइनेंस अनलॉक करें",
  ],
  'de': [
    "Rechnungen in CO₂-Gutschriften umwandeln",
    "Eignung für grüne Kredite prüfen",
    "Scope 1, 2, 3 Emissionen verfolgen",
    "EU CBAM Vorbereitung starten",
    "Emissionen sofort verifizieren",
    "Klimafinanzierung heute freischalten",
  ],
  'fr': [
    "Convertir les factures en crédits carbone",
    "Vérifier l'éligibilité au prêt vert",
    "Suivre les émissions Scope 1, 2, 3",
    "Préparation conformité EU CBAM",
    "Vérifier les émissions instantanément",
    "Débloquer le financement climatique",
  ],
};

const defaultCases = useCasesMultilang['en'];

interface UseCaseTyperProps {
  className?: string;
}

export const UseCaseTyper = forwardRef<HTMLDivElement, UseCaseTyperProps>(
  ({ className }, ref) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [displayText, setDisplayText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Follow the app's language setting (not the browser's), so the headline
    // changes with the language switch. Locales without a reviewed set use English.
    const { locale } = useI18nContext();
    const cases = useMemo(() => useCasesMultilang[locale] || defaultCases, [locale]);

    // Restart cleanly when the language changes.
    useEffect(() => {
      setCurrentIndex(0);
      setDisplayText('');
      setIsDeleting(false);
    }, [cases]);

    useEffect(() => {
      const currentText = cases[currentIndex];
      const typingSpeed = isDeleting ? 25 : 50;
      const pauseDuration = 2500;

      const timeout = setTimeout(() => {
        if (!isDeleting) {
          // Typing
          if (displayText.length < currentText.length) {
            setDisplayText(currentText.slice(0, displayText.length + 1));
          } else {
            // Pause before deleting
            setTimeout(() => setIsDeleting(true), pauseDuration);
          }
        } else {
          // Deleting
          if (displayText.length > 0) {
            setDisplayText(displayText.slice(0, -1));
          } else {
            setIsDeleting(false);
            setCurrentIndex((prev) => (prev + 1) % cases.length);
          }
        }
      }, typingSpeed);

      return () => clearTimeout(timeout);
    }, [displayText, isDeleting, currentIndex, cases]);

    // Split text into two parts for two-color effect
    // First ~60% of words in foreground, last ~40% in primary (brand) color
    const words = displayText.split(' ');
    const splitIndex = Math.max(1, Math.ceil(words.length * 0.6));
    const firstPart = words.slice(0, splitIndex).join(' ');
    const secondPart = words.slice(splitIndex).join(' ');

    return (
      <div 
        ref={ref}
        // Height for two lines is reserved so typing, wrapping or a language
        // change never pushes the upload tiles. data-no-translate keeps the
        // runtime translator from re-translating every typed frame.
        data-no-translate
        className={`w-full max-w-[min(92vw,36rem)] text-center min-h-[3.75rem] sm:min-h-[4.5rem] md:min-h-[5rem] flex items-center justify-center ${className || ''}`}
      >
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-tight [text-wrap:balance]">
          <span className="text-foreground">{firstPart}</span>
          {secondPart && (
            <span className="text-primary">{' '}{secondPart}</span>
          )}
          <span className="animate-pulse text-primary ml-0.5 font-light">|</span>
        </h2>
      </div>
    );
  }
);

UseCaseTyper.displayName = 'UseCaseTyper';
