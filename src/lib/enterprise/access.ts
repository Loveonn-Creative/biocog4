/**
 * Whether the access answer is still unknown. Every page's session starts
 * unresolved, so "no user yet" must read as loading, never as "no access":
 * otherwise /dashboard and /enterprise/dashboard redirect to each other forever.
 */
export function accessLoading(s: { sessionLoading: boolean; userId?: string; queryPending: boolean; claiming: boolean }): boolean {
  return s.sessionLoading || (!!s.userId && (s.queryPending || s.claiming));
}
