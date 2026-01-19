-- Add document hash columns for duplicate detection and caching
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS document_hash TEXT,
ADD COLUMN IF NOT EXISTS cached_result JSONB,
ADD COLUMN IF NOT EXISTS cache_expires_at TIMESTAMPTZ;

-- Create index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(document_hash);

-- Create index for cache expiration cleanup (only on rows with cache)
CREATE INDEX IF NOT EXISTS idx_documents_cache_expires ON documents(cache_expires_at) 
WHERE cache_expires_at IS NOT NULL;

-- Create index for user + hash combination (common lookup pattern)
CREATE INDEX IF NOT EXISTS idx_documents_user_hash ON documents(user_id, document_hash) 
WHERE user_id IS NOT NULL;