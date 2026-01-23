import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Settings, CreditCard, LogOut, ChevronDown, Crown, Receipt, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

interface UserMenuProps {
  email: string;
  businessName?: string;
  onSignOut: () => void;
}

const tierColors: Record<string, string> = {
  snapshot: 'bg-muted text-muted-foreground',
  essential: 'bg-blue-500/10 text-blue-600',
  basic: 'bg-blue-500/10 text-blue-600', // Legacy mapping
  pro: 'bg-primary/10 text-primary',
  scale: 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600',
};

const tierLabels: Record<string, string> = {
  snapshot: 'Free',
  essential: 'Essential',
  basic: 'Essential', // Legacy mapping
  pro: 'Pro',
  scale: 'Scale',
};

export const UserMenu = ({ email, businessName, onSignOut }: UserMenuProps) => {
  const { tier, isPremium } = usePremiumStatus();
  const [open, setOpen] = useState(false);

  const initials = businessName 
    ? businessName.slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();

  const canManageTeam = tier === 'pro' || tier === 'scale';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium max-w-[120px] truncate">
              {businessName || email.split('@')[0]}
            </span>
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${tierColors[tier]}`}>
              {isPremium && <Crown className="w-2.5 h-2.5 mr-0.5" />}
              {tierLabels[tier]}
            </Badge>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{businessName || 'My Account'}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
            <User className="w-4 h-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        {canManageTeam && (
          <DropdownMenuItem asChild>
            <Link to="/team" className="flex items-center gap-2 cursor-pointer">
              <Users className="w-4 h-4" />
              Team
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/subscription" className="flex items-center gap-2 cursor-pointer">
            <CreditCard className="w-4 h-4" />
            Subscription
            {tier === 'snapshot' && (
              <Badge variant="secondary" className="ml-auto text-[10px]">Upgrade</Badge>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/billing" className="flex items-center gap-2 cursor-pointer">
            <Receipt className="w-4 h-4" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={onSignOut}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
