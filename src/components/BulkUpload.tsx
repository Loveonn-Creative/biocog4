import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
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

interface FileStatus {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'duplicate' | 'error';
  message?: string;
  documentHash?: string;
  extractedData?: any;
}

interface BulkUploadProps {
  onComplete?: (results: { processed: number; duplicates: number; errors: number }) => void;
  maxFiles?: number;
}

export function BulkUpload({ onComplete, maxFiles = 10 }: BulkUploadProps) {
  const { sessionId, user } = useSession();
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

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

    setIsProcessing(true);
    setProgress(0);

    const results = { processed: 0, duplicates: 0, errors: 0 };
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const fileStatus = files[i];
      
      // Update status to processing
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'processing' as const } : f
      ));

      try {
        const imageBase64 = await fileToBase64(fileStatus.file);
        const mimeType = fileStatus.file.type || 'image/jpeg';

        const { data, error } = await supabase.functions.invoke('extract-document', {
          body: { imageBase64, mimeType }
        });

        if (error) throw error;

        if (data?.isDuplicate && !data?.success) {
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
          // Success (including cached results)
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { 
              ...f, 
              status: 'success' as const,
              message: data.cached ? 'Cached result' : 'Processed',
              documentHash: data.documentHash,
              extractedData: data.data
            } : f
          ));
          results.processed++;
        } else {
          throw new Error(data?.error || 'Unknown error');
        }
      } catch (err: any) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: 'error' as const,
            message: err.message || 'Processing failed'
          } : f
        ));
        results.errors++;
      }

      setProgress(((i + 1) / totalFiles) * 100);
    }

    setIsProcessing(false);
    
    // Show summary
    const parts = [];
    if (results.processed > 0) parts.push(`${results.processed} processed`);
    if (results.duplicates > 0) parts.push(`${results.duplicates} duplicates skipped`);
    if (results.errors > 0) parts.push(`${results.errors} errors`);
    
    toast.success(`Bulk upload complete: ${parts.join(', ')}`);
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
        return <Badge variant="secondary" className="text-xs">Processing...</Badge>;
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

            {/* Action Button */}
            {pendingCount > 0 && (
              <Button 
                className="w-full mt-2" 
                onClick={processFiles}
                disabled={isProcessing}
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