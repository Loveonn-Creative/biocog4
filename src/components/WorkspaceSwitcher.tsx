import { Building2, Check, ChevronDown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession } from '@/hooks/useSession';
import { chooseWorkspace, useWorkspace } from '@/hooks/useWorkspace';
import { ROLE_LABELS, type TeamRole } from '@/lib/teamRoles';

/**
 * Personal or organisation workspace. Shown only when organisation workspaces
 * are live and the user belongs to at least one organisation; otherwise there
 * is nothing to switch.
 */
export function WorkspaceSwitcher() {
  const { user } = useSession();
  const { workspacesAvailable, organizations, organization, role, scope } = useWorkspace();
  if (!user || !workspacesAvailable || organizations.length === 0) return null;

  const current = organization?.name || 'Personal';
  const CurrentIcon = scope.kind === 'organization' ? Building2 : User;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 max-w-[220px]" aria-label={`Workspace: ${current}`}>
          <CurrentIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{current}</span>
          {role && <span className="hidden lg:inline text-xs text-muted-foreground">· {ROLE_LABELS[role as TeamRole] || role}</span>}
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => chooseWorkspace(user.id, 'personal')} className="gap-2">
          <User className="h-4 w-4" />
          <span className="flex-1">
            Personal
            <span className="block text-xs text-muted-foreground">Only you see these records</span>
          </span>
          {scope.kind !== 'organization' && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
        {organizations.map(org => (
          <DropdownMenuItem key={org.id} onClick={() => chooseWorkspace(user.id, org.id)} className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="flex-1 min-w-0">
              <span className="block truncate">{org.name}</span>
              <span className="block text-xs text-muted-foreground">Shared with your team by role</span>
            </span>
            {organization?.id === org.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
