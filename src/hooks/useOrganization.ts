import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
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
    createOrganization,
    switchContext,
    hasOrganization: organizations.length > 0,
    isMSMEContext: activeContext?.context_type === 'msme',
    isPartnerContext: activeContext?.context_type === 'partner',
  };
}
