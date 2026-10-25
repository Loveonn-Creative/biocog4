import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useEnterpriseAccess } from '@/hooks/useEnterpriseAccess';

/**
 * Pages built around an MSME's own bills (upload, history, MRV, verify,
 * monetise, reports, intelligence, plans). Enterprise accounts go to their
 * supplier view instead. Never blocks while access loads, so MSME pages are
 * not slowed; the answer is cached per account.
 */
export function MsmeOnly({ children }: { children: ReactNode }) {
  const { access } = useEnterpriseAccess();
  if (access) return <Navigate to="/enterprise/dashboard" replace />;
  return <>{children}</>;
}
