import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './useSession';
import type { Json } from '@/integrations/supabase/types';

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
}

export function useDocuments() {
  const { sessionId, user, isLoading: sessionLoading } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (sessionLoading) return;
    
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (user) {
        query = query.eq('user_id', user.id);
      } else if (sessionId) {
        query = query.eq('session_id', sessionId);
      } else {
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
  }, [sessionId, user, sessionLoading]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const saveDocument = async (documentData: Omit<Document, 'id' | 'created_at' | 'session_id' | 'user_id'>): Promise<Document | null> => {
    try {
      const insertData = {
        ...documentData,
        session_id: user ? null : sessionId,
        user_id: user?.id || null
      };

      const { data, error: insertError } = await supabase
        .from('documents')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('Error saving document:', insertError);
        return null;
      }

      const newDoc = data as Document;
      setDocuments(prev => [newDoc, ...prev]);
      return newDoc;
    } catch (err) {
      console.error('Save document error:', err);
      return null;
    }
  };

  return {
    documents,
    isLoading: isLoading || sessionLoading,
    error,
    refetch: fetchDocuments,
    saveDocument
  };
}
