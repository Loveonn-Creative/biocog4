// Keeps the last few page errors on this device so a flash of the error
// screen that clears before anyone can screenshot it can still be read later
// (open any page with ?diag=1). Also tags the Microsoft Clarity session so the
// recording can be found with the "app_error" filter. Only the error message,
// path and time are kept: no page content, form values or user details.

const KEY = "senseible_error_log";
const MAX = 5;

export interface LoggedError { at: string; path: string; message: string; where: string }

export function logPageError(error: Error, componentStack?: string | null) {
  const entry: LoggedError = {
    at: new Date().toISOString(),
    path: window.location.pathname,
    message: String(error?.message || error).slice(0, 300),
    where: (componentStack || "").trim().split("\n").slice(0, 3).map(s => s.trim()).join(" < ").slice(0, 300),
  };
  try {
    const list = readPageErrors();
    localStorage.setItem(KEY, JSON.stringify([entry, ...list].slice(0, MAX)));
  } catch { /* storage blocked: nothing to keep */ }
  try {
    const clarity = (window as unknown as { clarity?: (...a: unknown[]) => void }).clarity;
    clarity?.("set", "app_error", entry.message.slice(0, 100));
    clarity?.("event", "app_error");
  } catch { /* analytics unavailable */ }
}

export function readPageErrors(): LoggedError[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}
