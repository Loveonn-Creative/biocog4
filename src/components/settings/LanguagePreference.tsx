import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Languages, Check } from 'lucide-react';
import { useI18nContext } from '@/lib/i18n/LanguageProvider';
import { getLocalesByRegion } from '@/lib/i18n/locales';
import { useT } from '@/lib/i18n/useT';
import { toast } from '@/lib/i18n/toast';

/**
 * Profile-backed language preference.
 * Uses the same setter as the nav quick-switch — no duplicated persistence.
 */
export function LanguagePreference({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { locale, setLocale } = useI18nContext();
  const t = useT();
  const groups = getLocalesByRegion();

  const choose = (code: string) => {
    if (code === locale) return;
    setLocale(code);
    toast.success(
      isAuthenticated
        ? 'Language saved to your profile'
        : 'Language changed on this device. Sign in to save it to your profile.'
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          {t('Language')}
        </CardTitle>
        <CardDescription>
          {isAuthenticated
            ? t('Your language is saved to your profile and applies on every device and every visit.')
            : t('Applies on this device now. Sign in to keep it across devices.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {groups.map(group => (
          <div key={group.region} className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t(group.label)}</p>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label={`${group.label} languages`}
            >
              {group.locales.map(lang => {
                const active = lang.code === locale;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => choose(lang.code)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-muted'
                    }`}
                  >
                    {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span data-no-translate>{lang.nativeName}</span>
                    <span className="text-xs opacity-70" data-no-translate>
                      {lang.code.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          {t('Numbers, units, framework codes and identifiers such as GSTIN, HSN and evidence hashes are never translated.')}
        </p>
      </CardContent>
    </Card>
  );
}
