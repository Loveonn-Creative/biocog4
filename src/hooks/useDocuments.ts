import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './useSession';
import { useWorkspace } from './useWorkspace';
import { applyScope, scopeKey } from '@/lib/workspaceScope';
import type { Json } from '@/integrations/supabase/types';

import { useRecordsChanged } from '@/lib/recordsEvents';
export interface Document {
  id: string;
  document_type: string;
  vendor: string | null;
  invoice_date: string | null;
  invoice_number: string | null;
  amount: number | null;
  currency: string | null;
  tax_amount: number | null;
  subtotal: number | null;
  raw_ocr_data: Json | null;
  file_url: string | null;
  confidence: number | null;
  created_at: string;
  session_id: string | null;
  user_id: string | null;
  document_hash: string | null; // For duplicate detection
  cached_result: Json | null;   // Cached MRV result
}

export function useDocuments() {
  const { isLoading: sessionLoading } = useSession();
  const { scope, ready } = useWorkspace();
  const key = scopeKey(scope);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!ready) return;
    
    try {
      setIsLoading(true);
      setError(null);

      const query = applyScope(
        supabase.from('documents').select('*').order('created_at', { ascending: false }),
        scope,
      );
      if (!query) {
        setDocuments([]);
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching documents:', fetchError);
        setError('Failed to load documents');
      } else {
        setDocuments((data || []) as Document[]);
      }
    } catch (err) {
      console.error('Documents fetch error:', err);
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures scope
  }, [key, ready]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Refetch when records change anywhere (verify, delete, upload).
  useRecordsChanged(() => { void fetchDocuments(); });

  return {
    documents,
    isLoading: isLoading || sessionLoading || !ready,
    error,
    refetch: fetchDocuments,
  };
}
