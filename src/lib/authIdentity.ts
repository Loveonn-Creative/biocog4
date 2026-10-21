import type { User } from '@supabase/supabase-js';

/** True when the account has an email/password identity (not OAuth only). */
export const hasPasswordIdentity = (user: User): boolean => {
  const identities = user.identities ?? [];
  if (identities.length > 0) {
    return identities.some((identity) => identity.provider === 'email');
  }
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [];
  if (providers.length > 0) return providers.includes('email');
  const provider = user.app_metadata?.provider as string | undefined;
  return !provider || provider === 'email';
};
