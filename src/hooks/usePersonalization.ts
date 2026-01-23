import { useMemo } from 'react';
import { useSession } from '@/hooks/useSession';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ProfileData {
  business_name?: string;
  location?: string;
  preferred_language?: string;
  sector?: string;
}

interface PersonalizationContext {
  greeting: string;
  displayName: string;
  shortGreeting: string;
  timeContext: 'morning' | 'afternoon' | 'evening' | 'night';
  culturalGreeting: string;
  tierLabel: string;
  tierEmoji: string;
  isPersonalized: boolean;
  profile: ProfileData | null;
  isLoading: boolean;
}

// Cultural greetings based on location/language
const CULTURAL_GREETINGS: Record<string, { morning: string; afternoon: string; evening: string; night: string }> = {
  // India - Hindi/Sanskrit
  'in': { morning: 'Suprabhat', afternoon: 'Namaste', evening: 'Shubh Sandhya', night: 'Shubh Ratri' },
  'hi': { morning: 'Suprabhat', afternoon: 'Namaste', evening: 'Shubh Sandhya', night: 'Shubh Ratri' },
  
  // Brazil - Portuguese
  'br': { morning: 'Bom dia', afternoon: 'Boa tarde', evening: 'Boa noite', night: 'Boa noite' },
  'pt': { morning: 'Bom dia', afternoon: 'Boa tarde', evening: 'Boa noite', night: 'Boa noite' },
  
  // Spanish-speaking
  'es': { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches', night: 'Buenas noches' },
  'mx': { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches', night: 'Buenas noches' },
  
  // France
  'fr': { morning: 'Bonjour', afternoon: 'Bonjour', evening: 'Bonsoir', night: 'Bonne nuit' },
  
  // Germany
  'de': { morning: 'Guten Morgen', afternoon: 'Guten Tag', evening: 'Guten Abend', night: 'Gute Nacht' },
  
  // Arabic
  'ar': { morning: 'Sabah al-khair', afternoon: 'Masa al-khair', evening: 'Masa al-khair', night: 'Tusbih ala khair' },
  
  // Default English
  'en': { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Good night' },
  'default': { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Good night' },
};

// Simplified greeting for India (primary market)
const INDIA_GREETING = 'Namaste';

const TIER_LABELS: Record<string, { label: string; emoji: string }> = {
  snapshot: { label: 'Explorer', emoji: '✨' },
  essential: { label: 'Essential', emoji: '⚡' },
  basic: { label: 'Essential', emoji: '⚡' },
  pro: { label: 'Pro', emoji: '👑' },
  scale: { label: 'Scale', emoji: '🏢' },
};

function getTimeContext(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getCulturalKey(location?: string, language?: string): string {
  // Priority: language > location > default
  if (language && CULTURAL_GREETINGS[language.toLowerCase()]) {
    return language.toLowerCase();
  }
  
  // Check if location contains India-related keywords
  if (location) {
    const loc = location.toLowerCase();
    if (loc.includes('india') || loc.includes('delhi') || loc.includes('mumbai') || 
        loc.includes('bangalore') || loc.includes('chennai') || loc.includes('kolkata') ||
        loc.includes('hyderabad') || loc.includes('pune') || loc.includes('gurugram') ||
        loc.includes('gurgaon') || loc.includes('noida')) {
      return 'in';
    }
    if (loc.includes('brazil') || loc.includes('são paulo') || loc.includes('rio')) {
      return 'br';
    }
    if (loc.includes('mexico') || loc.includes('spain') || loc.includes('argentina')) {
      return 'es';
    }
  }
  
  return 'default';
}

export function usePersonalization(): PersonalizationContext {
  const { user, isAuthenticated } = useSession();
  const { tier } = usePremiumStatus();
  
  // Fetch profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-personalization', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('business_name, location, preferred_language, sector')
        .eq('id', user.id)
        .single();
      return data as ProfileData | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const context = useMemo(() => {
    const timeContext = getTimeContext();
    const culturalKey = getCulturalKey(profile?.location, profile?.preferred_language);
    const greetings = CULTURAL_GREETINGS[culturalKey] || CULTURAL_GREETINGS.default;
    const culturalGreeting = greetings[timeContext];
    
    // For India, use simplified "Namaste" as the primary greeting
    const isIndian = culturalKey === 'in' || culturalKey === 'hi';
    const shortGreeting = isIndian ? INDIA_GREETING : culturalGreeting;
    
    // Display name priority: business_name > email username > Guest
    let displayName = 'Guest';
    if (profile?.business_name) {
      displayName = profile.business_name;
    } else if (user?.email) {
      displayName = user.email.split('@')[0];
    }
    
    // Build full greeting
    const greeting = isAuthenticated && displayName !== 'Guest'
      ? `${shortGreeting}, ${displayName}`
      : isAuthenticated
        ? shortGreeting
        : 'Welcome, Explorer';
    
    const tierInfo = TIER_LABELS[tier] || TIER_LABELS.snapshot;
    
    return {
      greeting,
      displayName,
      shortGreeting,
      timeContext,
      culturalGreeting,
      tierLabel: tierInfo.label,
      tierEmoji: tierInfo.emoji,
      isPersonalized: isAuthenticated && !!profile?.business_name,
      profile,
      isLoading,
    };
  }, [user, profile, tier, isAuthenticated, isLoading]);

  return context;
}
