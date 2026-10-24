import { lazy, type ComponentType } from "react";
import { isChunkLoadError, reloadOnceForNewBuild } from "./chunkRecovery";

// Route pages load their code on first visit. After a deploy, a tab still
// running the previous build asks for code files that no longer exist. Instead
// of letting that error reach the error screen ("This page could not load"),
// load the new build straight away and keep the current page on screen until
// the browser navigates (the router renders pages in a transition, so a
// never-settling import simply keeps what is already shown).
export function lazyPage<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch((err: unknown) => {
      if (isChunkLoadError(err) && reloadOnceForNewBuild()) return new Promise<{ default: T }>(() => {});
      throw err;
    }),
  );
}
