import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { usePersonalization } from '@/hooks/usePersonalization';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserMenu } from '@/components/UserMenu';
import { ContextSwitcher } from '@/components/ContextSwitcher';
import { User, Upload, LayoutDashboard, Shield, Coins, FileBarChart, BarChart3, Brain, Clock, Building2, Handshake } from 'lucide-react';
import senseibleLogo from '@/assets/senseible-logo.png';

interface NavigationProps {
  onSignOut?: () => void;
}

// MSME navigation items
const msmeNavItems = [
  { path: '/', label: 'Upload', icon: Upload },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/history', label: 'History', icon: Clock },
  { path: '/mrv-dashboard', label: 'MRV', icon: BarChart3 },
  { path: '/intelligence', label: 'Intelligence', icon: Brain },
  { path: '/verify', label: 'Verify', icon: Shield },
  { path: '/monetize', label: 'Monetize', icon: Coins },
  { path: '/reports', label: 'Reports', icon: FileBarChart },
];

// Partner navigation items
const partnerNavItems = [
  { path: '/partner-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/marketplace', label: 'Marketplace', icon: Coins },
  { path: '/intelligence', label: 'Intelligence', icon: Brain },
  { path: '/partner-reports', label: 'Reports', icon: FileBarChart },
];

export const Navigation = ({ onSignOut }: NavigationProps) => {
  const location = useLocation();
  const { user, isAuthenticated, signOut } = useSession();
  const { greeting, isPersonalized } = usePersonalization();
  const { activeContext } = useOrganization();
  const [businessName, setBusinessName] = useState<string>('');

  // Fetch profile for business name
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('business_name')
        .eq('id', user.id)
        .single();
      if (data?.business_name) setBusinessName(data.business_name);
    };
    fetchProfile();
  }, [user?.id]);

  const handleSignOut = async () => {
    await signOut();
    onSignOut?.();
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Determine which nav items to show based on context
  const isPartnerContext = activeContext?.context_type === 'partner';
  const navItems = isPartnerContext ? partnerNavItems : msmeNavItems;

  return (
    <>
      {/* Desktop Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              <img src={senseibleLogo} alt="Senseible" className="h-7 w-auto dark:invert" />
            </Link>
            
            {/* Role Context Badge - Shows MSME or Partner */}
            {isAuthenticated && activeContext && (
              <Badge 
                variant={activeContext.context_type === 'partner' ? 'default' : 'secondary'}
                className={`hidden md:flex items-center gap-1.5 ${
                  activeContext.context_type === 'partner' 
                    ? 'bg-primary/10 text-primary border-primary/20' 
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {activeContext.context_type === 'partner' ? (
                  <Handshake className="h-3 w-3" />
                ) : (
                  <Building2 className="h-3 w-3" />
                )}
                <span className="text-xs font-medium">
                  {activeContext.context_type === 'partner' ? 'Partner' : 'MSME'}
                </span>
              </Badge>
            )}
            
            {/* Personalized Greeting - Desktop only */}
            {isAuthenticated && isPersonalized && (
              <span className="hidden lg:inline-block text-sm text-muted-foreground">
                {greeting}
              </span>
            )}
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'text-foreground bg-secondary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Context Switcher - for users with multiple contexts */}
            {isAuthenticated && <ContextSwitcher />}
            
            {isAuthenticated && user ? (
              <UserMenu 
                email={user.email || ''} 
                businessName={businessName}
                onSignOut={handleSignOut} 
              />
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to="/auth">
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm safe-area-inset-bottom">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-1 px-2 text-xs transition-colors ${
                  isActive(item.path)
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
