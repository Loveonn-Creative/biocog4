import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PostgrestError } from '@supabase/supabase-js';

/** True when a PostgREST RPC does not exist yet (pending migration not applied). */
export const isMissingRpcError = (error: { code?: string; message?: string } | null | undefined): boolean =>
  !!error && (error.code === '42883' || error.code === 'PGRST202' || /could not find the function/i.test(error.message || ''));

/**
 * supabase.functions.invoke returns data = null on non-2xx responses; the server's
 * JSON body (with its `error` message) is only available on error.context.
 */
export async function getFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context && typeof (context as Response).json === 'function') {
    try {
      const body = await (context as Response).clone().json();
      if (body && typeof body.error === 'string' && body.error) return body.error;
    } catch {
      // Body was not JSON; fall through.
    }
  }
  if (error instanceof Error && error.message && !/non-2xx|failed to send a request/i.test(error.message)) {
    return error.message;
  }
  return fallback;
}

// RPCs added by the pending team access migration are not in the generated types yet.
type UntypedRpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: PostgrestError | null }>;
export const untypedRpc: UntypedRpc = (fn, args) =>
  (supabase.rpc as unknown as (this: typeof supabase, fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: PostgrestError | null }>)
    .call(supabase, fn, args);

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  subscription_tier: string;
  max_members: number;
  logo_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'analyst' | 'viewer';
  joined_at?: string;
  invited_email?: string;
}

export interface UserContext {
  id: string;
  context_type: 'msme' | 'partner';
  context_id: string;
  context_name?: string;
  is_active: boolean;
}

export function useOrganization() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  // Fetch user's organizations
  const { data: organizations = [], isLoading: orgsLoading, error: organizationsError } = useQuery({
    queryKey: ['organizations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Organization[];
    },
    enabled: !!user?.id,
    // A permission error will not fix itself on retry; surface it straight away.
    retry: (failureCount, error) => (error as { code?: string })?.code !== '42501' && failureCount < 3,
  });

  // Fetch user's contexts (for role switching)
  const { data: contexts = [], isLoading: contextsLoading } = useQuery({
    queryKey: ['user-contexts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_contexts')
        .select('*')
        .order('last_accessed_at', { ascending: false });
      
      if (error) throw error;
      return data as UserContext[];
    },
    enabled: !!user?.id,
  });

  // Get active context
  const activeContext = contexts.find(c => c.is_active) || null;

  // Create organization
  const createOrganization = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Preferred path: one atomic SECURITY DEFINER RPC (org + owner member + context).
      const { data: rpcOrg, error: rpcError } = await untypedRpc('create_organization', { p_name: name });
      if (!rpcError) return rpcOrg as Organization;
      if (!isMissingRpcError(rpcError)) throw rpcError;

      // Fallback until the pending migration adds create_organization.
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name, owner_id: user.id })
        .select()
        .single();
      
      if (orgError) throw orgError;

      // Add owner as member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner',
          joined_at: new Date().toISOString(),
        });
      
      if (memberError) throw memberError;

      // Create user context
      const { error: contextError } = await supabase
        .from('user_contexts')
        .insert({
          user_id: user.id,
          context_type: 'msme',
          context_id: org.id,
          context_name: name,
          is_active: true,
        });
      
      if (contextError) throw contextError;

      return org as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['user-contexts'] });
    },
  });

  // Switch context
  const switchContext = useMutation({
    mutationFn: async ({ contextType, contextId }: { contextType: 'msme' | 'partner'; contextId: string }) => {
      const { data, error } = await supabase.rpc('switch_user_context', {
        p_context_type: contextType,
        p_context_id: contextId,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-contexts'] });
    },
  });

  // Get active organization (if in MSME context)
  const activeOrganization = activeContext?.context_type === 'msme'
    ? organizations.find(o => o.id === activeContext.context_id)
    : null;

  return {
    organizations,
    contexts,
    activeContext,
    activeOrganization,
    isLoading: orgsLoading || contextsLoading,
    organizationsError: organizationsError as (Error & { code?: string }) | null,
    createOrganization,
    switchContext,
    hasOrganization: organizations.length > 0,
    isMSMEContext: activeContext?.context_type === 'msme',
    isPartnerContext: activeContext?.context_type === 'partner',
  };
}
