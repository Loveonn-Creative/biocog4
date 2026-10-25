/**
 * Whether the access answer is still unknown. Every page's session starts
 * unresolved, so "no user yet" must read as loading, never as "no access":
 * otherwise /dashboard and /enterprise/dashboard redirect to each other forever.
 */
/** Who may ask, remind or cancel suppliers. Must match private.enterprise_can_ask. */
export const ASK_ROLES = ['owner', 'admin', 'data_manager'];
export const canAskSuppliers = (role: string | null | undefined) => !!role && ASK_ROLES.includes(role);
/** Viewers read on screen only; every other role downloads sheets and reports. */
export const canDownload = (role: string | null | undefined) => !!role && role !== 'viewer';

export function accessLoading(s: { sessionLoading: boolean; userId?: string; queryPending: boolean; claiming: boolean }): boolean {
  return s.sessionLoading || (!!s.userId && (s.queryPending || s.claiming));
}
