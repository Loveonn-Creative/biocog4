import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { useWorkspace } from '@/hooks/useWorkspace';
import { CAPABILITY_REASON } from '@/lib/workspaceScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Files,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildEmissionRows, type PersistableExtraction } from '@/lib/mrvPersistence';

import { checkUploadPages, chunkPagesFor, estimateReads, pageCountOf } from '@/lib/pdfLimit';
import { useInvoiceAllowance } from '@/hooks/useInvoiceAllowance';
import { prepareImageForUpload } from '@/lib/imageUpload';
import { splitPdf } from '@/lib/pdfSplit';
import { offsetSourcePages } from '../../supabase/functions/_shared/extractionChecks';
import { cacheGuestSource } from '@/lib/guestSourceCache';
import { functionErrorStatus, getFunctionErrorMessage, runPool, stopsBatch } from '@/lib/functionErrors';
import { emitRecordsChanged } from '@/lib/recordsEvents';
interface FileStatus {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'duplicate' | 'error';
  message?: string;
  documentHash?: string;
  extractedData?: any;
  /** Page range of this part in the original PDF, for split files. */
  fromPage?: number;
  toPage?: number;
  totalPages?: number;
}

/** Files read at the same time. Each part of a long PDF counts as one. */
const CONCURRENT_READS = 2;

interface BulkUploadProps {
  onComplete?: (results: { processed: number; duplicates: number; errors: number }) => void;
  maxFiles?: number;
}

export function BulkUpload({ onComplete, maxFiles = 10 }: BulkUploadProps) {
  const { sessionId, user } = useSession();
  const { scope, can, organization } = useWorkspace();
  const organizationId = scope.kind === 'organization' ? scope.organizationId : undefined;
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  // This month's reads and credits, counted the way the server counts them (signed in only).
  const allowance = useInvoiceAllowance();
  const refreshUsed = allowance.refresh;
  const [estimate, setEstimate] = useState<{ reads: number; pages: number } | null>(null);
  // Estimate before upload, from the page count of each pending file.
  useEffect(() => {
    const pending = files.filter(f => f.status === 'pending' && f.fromPage === undefined).map(f => f.file);
    if (pending.length === 0) { setEstimate(null); return; }
    let live = true;
    void Promise.all(pending.map(pageCountOf)).then(counts => { if (live) setEstimate(estimateReads(counts, allowance.pageCounting)); });
    return () => { live = false; };
  }, [files, allowance.pageCounting]);
  const remaining = allowance.available;
  const overAllowance = !isProcessing && estimate !== null && remaining !== null && estimate.reads > remaining;

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles: FileStatus[] = selectedFiles.map(file => ({
      file,
      status: 'pending' as const
    }));

    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = ''; // Reset input
  }, [files.length, maxFiles]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    if (!can('records.upload')) {
      toast.error(`${organization?.name || 'Organisation'} workspace: ${CAPABILITY_REASON['records.upload']}`, { duration: 8000 });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    const results = { processed: 0, duplicates: 0, errors: 0 };

    // Longer PDFs are split into parts (5 pages each with page counting, else
    // 10) and each part is processed as its own document, so nothing is cut off.
    const queue: FileStatus[] = [];
    for (const f of files) {
      if (f.status !== 'pending') { queue.push(f); continue; }
      const chunk = user ? chunkPagesFor(allowance.pageCounting) : chunkPagesFor(true);
      const check = await checkUploadPages(f.file, chunk);
      if (check.ok) { queue.push(f); continue; }
      if (check.reason === 'unknown_page_count') { queue.push({ ...f, status: 'error' as const, message: check.message }); continue; }
      const split = await splitPdf(f.file, chunk);
      if (split.ok && split.parts) queue.push(...split.parts.map(p => ({ file: p.file, status: 'pending' as const, fromPage: p.fromPage, toPage: p.toPage, totalPages: p.totalPages })));
      else queue.push({ ...f, status: 'error' as const, message: split.message });
    }
    setFiles(queue);
    const totalFiles = queue.length;

    // Set when reading is paused or down on our side (402/503), busy, or a
    // limit is reached (429): the remaining files are not sent, and say why.
    let stopReason: string | null = null;
    // Two files (or parts) at a time; each finishes on its own.
    let done = 0;
    const tick = () => setProgress((++done / totalFiles) * 100);
    const readOne = async (fileStatus: FileStatus, i: number) => {
      if (fileStatus.status === 'error') { results.errors++; tick(); return; }
    
      // Update status to processing
      setFiles(prev => prev.map((f, idx) =>
        idx === i ? { ...f, status: 'processing' as const, message: f.fromPage ? `Reading pages ${f.fromPage}–${f.toPage} of ${f.totalPages}` : undefined } : f
      ));

      try {
        const sendFile = await prepareImageForUpload(fileStatus.file);
        const imageBase64 = await fileToBase64(sendFile);
        const mimeType = sendFile.type || 'image/jpeg';

        const { data, error } = await supabase.functions.invoke('extract-document', {
          body: { imageBase64, mimeType, sessionId, organizationId }
        });

        if (error) {
          const status = functionErrorStatus(error);
          const message = await getFunctionErrorMessage(error, 'Could not be read');
          if (await stopsBatch(error)) stopReason = message;
          if (status === 409) {
            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'duplicate' as const, message: 'Already processed' } : f));
            results.duplicates++;
            tick();
            return;
          }
          throw new Error(message);
        }

        if (data?.financialDocument) {
          // Kept privately on the server for climate finance; not a record.
          setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: data.stored ? 'success' as const : 'error' as const, message: data.stored ? 'Financial document, stored securely' : 'Financial document, not kept' } : f));
          if (data.stored) results.processed++; else results.errors++;
        } else if (data?.isDuplicate && !data?.success) {
          // Duplicate blocked
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { 
              ...f, 
              status: 'duplicate' as const,
              message: 'Already processed',
              documentHash: data.documentHash
            } : f
          ));
          results.duplicates++;
        } else if (data?.success) {
          // Guests: the original stays in this browser only.
          if (!user) void cacheGuestSource(data.documentHash, fileStatus.file, fileStatus.file.name);
          const partData = data.data as PersistableExtraction;
          // Split parts: page numbers mapped back to the original PDF.
          const extractedData: PersistableExtraction = fileStatus.fromPage
            ? { ...partData, lineItems: offsetSourcePages(partData.lineItems || [], fileStatus.fromPage) }
            : partData;
          // Stored by the server with its emission rows: nothing to write here.
          const stored = data.serverSaved && data.documentId && Array.isArray(data.emissionIds);
          const docLookup = supabase
            .from('documents')
            .select('id')
            .eq('document_hash', data.documentHash);
          // In an organisation workspace the invoice is the organisation's, whoever uploaded it.
          const { data: ownerDocs } = stored ? { data: [{ id: data.documentId as string }] } : await (organizationId
            ? docLookup.eq('organization_id', organizationId)
            : docLookup.eq('user_id', user?.id || ''))
            .order('created_at', { ascending: false });
          const document = ownerDocs?.[0];

          if (!document) throw new Error('Processed evidence could not be linked to its source document');

          // Any document this owner holds for the same file counts: never record an invoice twice.
          const { data: existingEmissions } = await supabase
            .from('emissions')
            .select('id')
            .in('document_id', (ownerDocs ?? []).map((d: { id: string }) => d.id))
            .limit(1);

          // Saved, but nothing on it can be counted yet: say what it needs.
          let reviewNote: string | null = null;
          if (stored && (data.emissionIds as string[]).length === 0) {
            const next = (extractedData as { guidance?: { nextStep?: string | null } }).guidance?.nextStep;
            reviewNote = `Saved, nothing counted yet${next ? `. ${next}` : ''}`;
          } else if (!stored && !existingEmissions?.length) {
            const rows = buildEmissionRows(extractedData, {
              documentId: document.id,
              sessionId: null,
              userId: user?.id || null,
            });
            if (rows.length === 0) {
              const next = (extractedData as { guidance?: { nextStep?: string | null } }).guidance?.nextStep;
              reviewNote = `Saved, nothing counted yet${next ? `. ${next}` : ''}`;
            } else {
              const { error: saveError } = await supabase.from('emissions').insert(rows);
              if (saveError) throw saveError;
            }
          }

          // Success (including cached results)
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { 
              ...f, 
              status: 'success' as const,
              message: reviewNote ?? (data.isDuplicate ? 'Already in your records, counted once' : data.cached ? 'Saved result' : 'Processed'),
              documentHash: data.documentHash,
              extractedData
            } : f
          ));
          results.processed++;
        } else {
          throw new Error(data?.error || 'Unknown error');
        }
      } catch (err) {
        const message = err instanceof Error && err.message && !/non-2xx/i.test(err.message) ? err.message : 'Processing failed';
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: 'error' as const,
            message
          } : f
        ));
        results.errors++;
      }
      tick();
    };
    await runPool(queue, CONCURRENT_READS, readOne, () => stopReason !== null, (_f, i) => {
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error' as const, message: `Not sent: ${stopReason}` } : f));
      results.errors++;
      tick();
    });

    setIsProcessing(false);
    void refreshUsed();

    // Show summary
    const parts = [];
    if (results.processed > 0) parts.push(`${results.processed} processed`);
    if (results.duplicates > 0) parts.push(`${results.duplicates} duplicates skipped`);
    if (results.errors > 0) parts.push(`${results.errors} errors`);
    
    if (results.processed > 0) emitRecordsChanged('upload');
    if (results.processed > 0) toast.success(`Bulk upload complete: ${parts.join(', ')}`);
    else if (stopReason) toast.error(stopReason, { duration: 8000 });
    else if (results.duplicates > 0 && results.errors === 0) toast.info(`Nothing new: ${parts.join(', ')}`);
    else toast.error(`Nothing was processed: ${parts.join(', ')}. See each file below.`);
    onComplete?.(results);
  };

  const clearAll = () => {
    setFiles([]);
    setProgress(0);
  };

  const getStatusIcon = (status: FileStatus['status']) => {
    switch (status) {
      case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'duplicate': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: FileStatus['status'], message?: string) => {
    switch (status) {
      case 'processing':
        return <Badge variant="secondary" className="text-xs">{message || 'Processing...'}</Badge>;
      case 'success': 
        return <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20">{message || 'Done'}</Badge>;
      case 'duplicate': 
        return <Badge variant="secondary" className="text-xs bg-warning/10 text-warning border-warning/20">{message || 'Duplicate'}</Badge>;
      case 'error': 
        return <Badge variant="secondary" className="text-xs bg-destructive/10 text-destructive border-destructive/20">{message || 'Error'}</Badge>;
      default: 
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const processedCount = files.filter(f => f.status === 'success').length;
  const duplicateCount = files.filter(f => f.status === 'duplicate').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Files className="h-5 w-5 text-primary" />
          Bulk Upload
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Upload Area */}
        <label 
          className={cn(
            "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            isProcessing ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 hover:bg-secondary/30"
          )}
        >
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground text-center">
            Drop multiple invoices here or click to select
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Up to {maxFiles} files • JPG, PNG, PDF
          </p>
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            disabled={isProcessing}
            className="hidden"
          />
        </label>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{files.length} file(s) selected</p>
              {!isProcessing && (
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {isProcessing && (
              <Progress value={progress} className="h-2" />
            )}

            <div className="max-h-48 overflow-y-auto space-y-2">
              {files.map((f, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30"
                >
                  {getStatusIcon(f.status)}
                  <span className="flex-1 text-sm truncate">{f.file.name}</span>
                  {getStatusBadge(f.status, f.message)}
                  {!isProcessing && f.status === 'pending' && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => removeFile(idx)}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Summary */}
            {(processedCount > 0 || duplicateCount > 0 || errorCount > 0) && (
              <div className="flex gap-2 pt-2 text-xs">
                {processedCount > 0 && (
                  <span className="text-success">{processedCount} processed</span>
                )}
                {duplicateCount > 0 && (
                  <span className="text-warning">{duplicateCount} duplicates</span>
                )}
                {errorCount > 0 && (
                  <span className="text-destructive">{errorCount} errors</span>
                )}
              </div>
            )}

            {/* Estimate before upload; the count after comes from the server's records. */}
            {user && !isProcessing && (estimate || remaining !== null) && (
              <p className={cn("pt-2 text-xs", overAllowance ? "text-destructive" : "text-muted-foreground")} role={overAllowance ? 'alert' : undefined}>
                {estimate && pendingCount > 0 && `About ${estimate.reads} ${estimate.reads === 1 ? 'read' : 'reads'} (${estimate.pages} ${estimate.pages === 1 ? 'page' : 'pages'}). `}
                {remaining !== null && `${remaining.toLocaleString('en-IN')} reads left${allowance.credits ? ` (including ${allowance.credits.toLocaleString('en-IN')} credits)` : ' this month'}.`}
                {overAllowance && <> Page limit reached for this batch. Remove some files, upgrade, wait until next month, or <a href="/subscription#top-up" className="underline">top up credits now</a>.</>}
              </p>
            )}

            {/* Action Button */}
            {pendingCount > 0 && (
              <Button 
                className="w-full mt-2" 
                onClick={processFiles}
                disabled={isProcessing || overAllowance}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing {Math.round(progress)}%...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Process {pendingCount} Invoice{pendingCount > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}