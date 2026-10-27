import { Component, type ErrorInfo, type ReactNode } from "react";
import { isChunkLoadError, isReloadingForNewBuild, reloadOnceForNewBuild } from "@/lib/reliability/chunkRecovery";
import { logPageError } from "@/lib/reliability/errorLog";
import { ErrorLogPanel } from "./ErrorLogPanel";

interface Props { children: ReactNode; resetKey?: string }
interface State { error: Error | null; reloading: boolean }

/**
 * Keeps one broken page from blanking the whole app. Resets when the route
 * changes, so navigation always recovers. Stale-build chunk errors reload once.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, reloading: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logPageError(error, info.componentStack);
    // A new build went live: load it quietly instead of showing an error.
    if ((isChunkLoadError(error) && reloadOnceForNewBuild()) || isReloadingForNewBuild()) { this.setState({ reloading: true }); return; }
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null, reloading: false });
  }

  render() {
    if (!this.state.error) return <>{this.props.children}<ErrorLogPanel /></>;
    // Waiting for the new build to load; otherwise say so, never a blank screen.
    if (this.state.reloading || isReloadingForNewBuild()) return <div className="min-h-[60vh]" aria-busy="true" />;
    return (
      <main role="alert" className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">This page could not load.</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Your data is safe. Reload to try again, or go back to the home page.</p>
        <div className="flex gap-3">
          <button onClick={() => window.location.reload()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Reload</button>
          <a href="/" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground">Home</a>
        </div>
      </main>
    );
  }
}
