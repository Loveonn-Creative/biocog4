import { Crown, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PremiumBadgeProps {
  tier?: 'basic' | 'pro' | 'scale';
  variant?: 'badge' | 'lock' | 'inline';
  showUpgrade?: boolean;
  className?: string;
}

export const PremiumBadge = ({ 
  tier = 'pro', 
  variant = 'badge',
  showUpgrade = true,
  className 
}: PremiumBadgeProps) => {
  const tierConfig = {
    basic: {
      label: 'Basic',
      color: 'bg-accent/10 text-accent border-accent/20',
      icon: Sparkles,
    },
    pro: {
      label: 'Pro',
      color: 'bg-warning/10 text-warning border-warning/20',
      icon: Crown,
    },
    scale: {
      label: 'Scale',
      color: 'bg-primary/10 text-primary border-primary/20',
      icon: Crown,
    },
  };

  const config = tierConfig[tier];
  const Icon = config.icon;

  if (variant === 'lock') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted/50",
            className
          )}>
            <Lock className="h-3 w-3 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs">
            Unlock with {config.label} plan
            {showUpgrade && (
              <Link to="/pricing" className="block mt-1 text-primary hover:underline">
                View plans →
              </Link>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        config.color.split(' ')[1], // Just the text color
        className
      )}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
          config.color,
          className
        )}>
          <Icon className="h-3 w-3" />
          {config.label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="text-xs">
          This feature requires {config.label} plan
          {showUpgrade && (
            <Link to="/pricing" className="block mt-1 text-primary hover:underline">
              Upgrade now →
            </Link>
          )}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

// Feature lock wrapper component
interface FeatureLockProps {
  isLocked: boolean;
  tier?: 'basic' | 'pro' | 'scale';
  children: React.ReactNode;
  className?: string;
}

export const FeatureLock = ({ 
  isLocked, 
  tier = 'pro',
  children, 
  className 
}: FeatureLockProps) => {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="opacity-50 pointer-events-none blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px] rounded-lg">
        <Link 
          to="/pricing" 
          className="flex flex-col items-center gap-2 p-4 text-center hover:scale-105 transition-transform"
        >
          <div className="p-3 rounded-full bg-warning/10">
            <Lock className="h-6 w-6 text-warning" />
          </div>
          <span className="text-sm font-medium">Unlock with {tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
          <span className="text-xs text-muted-foreground">Click to view plans</span>
        </Link>
      </div>
    </div>
  );
};
