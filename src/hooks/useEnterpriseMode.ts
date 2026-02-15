import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';

export function useEnterpriseMode() {
  const { user } = useSession();
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsEnterprise(false);
      setIsLoading(false);
      return;
    }

    const fetchMode = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('enterprise_mode')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setIsEnterprise((data as any).enterprise_mode ?? false);
        }
      } catch (err) {
        console.error('[Enterprise] Error fetching mode:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMode();
  }, [user?.id]);

  const toggleEnterprise = useCallback(async () => {
    if (!user?.id) return;

    const newValue = !isEnterprise;
    setIsEnterprise(newValue);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ enterprise_mode: newValue } as any)
        .eq('id', user.id);

      if (error) {
        setIsEnterprise(!newValue); // rollback
        console.error('[Enterprise] Toggle error:', error);
      }
    } catch (err) {
      setIsEnterprise(!newValue);
      console.error('[Enterprise] Toggle error:', err);
    }
  }, [user?.id, isEnterprise]);

  return { isEnterprise, toggleEnterprise, isLoading };
}
