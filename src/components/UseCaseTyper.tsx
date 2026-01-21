import { useState, useEffect, useMemo } from 'react';

const useCasesMultilang: Record<string, string[]> = {
  'en': [
    "Turn invoices into carbon credits",
    "Get green loan eligibility in 47s",
    "Track Scope 1, 2, 3 emissions",
    "Prepare for EU CBAM compliance",
  ],
  'hi': [
    "चालान को कार्बन क्रेडिट में बदलें",
    "47 सेकंड में ग्रीन लोन पात्रता",
    "स्कोप 1, 2, 3 उत्सर्जन ट्रैक करें",
    "EU CBAM अनुपालन की तैयारी",
  ],
  'de': [
    "Rechnungen in CO₂-Gutschriften umwandeln",
    "Grüne Darlehen in 47s",
    "Scope 1, 2, 3 Emissionen verfolgen",
    "EU CBAM Vorbereitung",
  ],
  'fr': [
    "Convertir les factures en crédits carbone",
    "Éligibilité prêt vert en 47s",
    "Suivre les émissions Scope 1, 2, 3",
    "Préparation conformité EU CBAM",
  ],
};

const defaultCases = useCasesMultilang['en'];

export const UseCaseTyper = () => {
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
    const typingSpeed = isDeleting ? 30 : 60;
    const pauseDuration = 2000;

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

  return (
    <p className="text-sm text-muted-foreground text-center h-6 font-medium min-w-[280px]">
      <span className="text-foreground/80">{displayText}</span>
      <span className="animate-pulse text-primary">|</span>
    </p>
  );
};
