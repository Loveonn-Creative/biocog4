import { useState, useEffect, useMemo, forwardRef } from 'react';

const useCasesMultilang: Record<string, string[]> = {
  'en': [
    "Turn invoices into carbon credits",
    "Get green loan eligibility in 47s",
    "Track Scope 1, 2, 3 emissions",
    "Prepare for EU CBAM compliance",
    "Verify emissions instantly",
    "Unlock climate finance today",
  ],
  'hi': [
    "चालान को कार्बन क्रेडिट में बदलें",
    "47 सेकंड में ग्रीन लोन पात्रता",
    "स्कोप 1, 2, 3 उत्सर्जन ट्रैक करें",
    "EU CBAM अनुपालन की तैयारी",
    "उत्सर्जन तुरंत सत्यापित करें",
    "आज क्लाइमेट फाइनेंस अनलॉक करें",
  ],
  'de': [
    "Rechnungen in CO₂-Gutschriften umwandeln",
    "Grüne Darlehen in 47 Sekunden",
    "Scope 1, 2, 3 Emissionen verfolgen",
    "EU CBAM Vorbereitung starten",
    "Emissionen sofort verifizieren",
    "Klimafinanzierung heute freischalten",
  ],
  'fr': [
    "Convertir les factures en crédits carbone",
    "Éligibilité prêt vert en 47 secondes",
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

    // Get browser language
    const cases = useMemo(() => {
      if (typeof navigator !== 'undefined') {
        const lang = navigator.language?.split('-')[0] || 'en';
        return useCasesMultilang[lang] || defaultCases;
      }
      return defaultCases;
    }, []);

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
        className={`text-center min-h-[2.5rem] sm:min-h-[3rem] flex items-center justify-center ${className || ''}`}
      >
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
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
