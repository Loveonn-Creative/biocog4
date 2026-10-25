// On a first visit the server sends the page's text (the prerendered
// .ssr-shell). React clears #root when it starts, and until the page's code
// arrives the screen went blank, so slow connections saw text, then nothing,
// then the page. This keeps that text on screen as the loading state of the
// first page only, then lets go once the real page has rendered. The element
// itself is moved, not copied, so it is never parsed twice.

let kept: HTMLElement | null = null;

/** Call just before createRoot: takes the prerendered page out of #root. */
export function keepPrerenderedPage() {
  if (typeof document === "undefined") return;
  const shell = document.querySelector<HTMLElement>("#root > .ssr-shell");
  if (!shell) return;
  // Very large prerendered pages (the /answers index lists every answer) cost
  // more to keep on screen while the app renders than the brief blank they hide.
  if (shell.getElementsByTagName("a").length > 300) return;
  // Already faded in: keep it visible. Not yet: let its fade-in run as before.
  if (Number(getComputedStyle(shell).opacity) > 0) shell.classList.add("ssr-shell-shown");
  shell.remove();
  kept = shell;
}

/** The prerendered page to show while the first page's code loads. */
export function prerenderedPage(): HTMLElement | null {
  return kept;
}

/** The first page has rendered: later loads use the normal loader. */
export function releasePrerenderedPage() {
  kept = null;
}
