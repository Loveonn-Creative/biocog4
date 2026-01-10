import { useState } from 'react';
import { Globe, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Language, SUPPORTED_LANGUAGES, REGION_LABELS, groupLanguagesByRegion } from '@/lib/languages';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
  compact?: boolean;
}

export const LanguageSelector = ({
  selectedLanguage,
  onLanguageChange,
  compact = false
}: LanguageSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const groupedLanguages = groupLanguagesByRegion();
  
  const filteredLanguages = search
    ? SUPPORTED_LANGUAGES.filter(
        lang =>
          lang.name.toLowerCase().includes(search.toLowerCase()) ||
          lang.nativeName.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const handleSelect = (language: Language) => {
    onLanguageChange(language);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "sm" : "default"}
          className={cn(
            "gap-2 transition-all",
            compact ? "h-8 px-2" : "h-10"
          )}
        >
          <span className="text-base">{selectedLanguage.flag}</span>
          {!compact && (
            <span className="hidden sm:inline text-sm font-normal">
              {selectedLanguage.name}
            </span>
          )}
          <Globe className={cn("text-muted-foreground", compact ? "w-3 h-3" : "w-4 h-4")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search languages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <ScrollArea className="h-[320px]">
          <div className="p-2">
            {filteredLanguages ? (
              // Search results
              <div className="space-y-1">
                {filteredLanguages.map((lang) => (
                  <LanguageItem
                    key={lang.code}
                    language={lang}
                    isSelected={selectedLanguage.code === lang.code}
                    onSelect={handleSelect}
                  />
                ))}
                {filteredLanguages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No languages found
                  </p>
                )}
              </div>
            ) : (
              // Grouped by region
              Object.entries(groupedLanguages).map(([region, languages]) => (
                <div key={region} className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                    {REGION_LABELS[region as Language['region']]}
                  </p>
                  <div className="space-y-0.5">
                    {languages.map((lang) => (
                      <LanguageItem
                        key={lang.code}
                        language={lang}
                        isSelected={selectedLanguage.code === lang.code}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

interface LanguageItemProps {
  language: Language;
  isSelected: boolean;
  onSelect: (language: Language) => void;
}

const LanguageItem = ({ language, isSelected, onSelect }: LanguageItemProps) => (
  <button
    onClick={() => onSelect(language)}
    className={cn(
      "w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors",
      isSelected
        ? "bg-primary/10 text-primary"
        : "hover:bg-secondary text-foreground"
    )}
  >
    <span className="text-base">{language.flag}</span>
    <div className="flex-1 text-left">
      <p className="font-medium">{language.name}</p>
      <p className="text-xs text-muted-foreground">{language.nativeName}</p>
    </div>
    {isSelected && <Check className="w-4 h-4 text-primary" />}
  </button>
);
