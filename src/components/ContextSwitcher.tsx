import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, ChevronDown, Handshake, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ContextSwitcher() {
  const { 
    contexts, 
    activeContext, 
    switchContext,
    isLoading,
  } = useOrganization();

  const [isSwitching, setIsSwitching] = useState(false);

  const handleSwitch = async (contextType: 'msme' | 'partner', contextId: string) => {
    if (activeContext?.context_id === contextId) return;
    
    setIsSwitching(true);
    try {
      await switchContext.mutateAsync({ contextType, contextId });
      toast.success('Context switched successfully');
    } catch (err) {
      console.error('Failed to switch context:', err);
      toast.error('Failed to switch context');
    } finally {
      setIsSwitching(false);
    }
  };

  // Don't show if no contexts or only one context
  if (isLoading || contexts.length <= 1) {
    return null;
  }

  const activeContextName = activeContext?.context_name || 'Select Context';
  const activeIcon = activeContext?.context_type === 'partner' ? Handshake : Building2;
  const ActiveIcon = activeIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 max-w-[200px]">
          {isSwitching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ActiveIcon className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate">{activeContextName}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Context</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* MSME Organizations */}
        {contexts.filter(c => c.context_type === 'msme').length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Your Organizations
            </DropdownMenuLabel>
            {contexts
              .filter(c => c.context_type === 'msme')
              .map(context => (
                <DropdownMenuItem
                  key={context.id}
                  onClick={() => handleSwitch('msme', context.context_id)}
                  className="gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="truncate flex-1">{context.context_name}</span>
                  {activeContext?.context_id === context.context_id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
          </>
        )}
        
        {/* Partner Organizations */}
        {contexts.filter(c => c.context_type === 'partner').length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Partner Access
            </DropdownMenuLabel>
            {contexts
              .filter(c => c.context_type === 'partner')
              .map(context => (
                <DropdownMenuItem
                  key={context.id}
                  onClick={() => handleSwitch('partner', context.context_id)}
                  className="gap-2"
                >
                  <Handshake className="h-4 w-4" />
                  <span className="truncate flex-1">{context.context_name}</span>
                  {activeContext?.context_id === context.context_id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
