// Must run first: records what an email link put in the address bar.
import "./lib/authLinkSnapshot";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// The main stylesheet loads without blocking the first paint (vite.config.ts,
// nonBlockingCss), so slow networks see the prerendered page text early. The
// app starts only once that stylesheet is in, so it never renders unstyled.
let started = false;
const start = () => {
  if (started) return;
  started = true;
  createRoot(document.getElementById("root")!).render(<App />);
};
const css = document.getElementById("app-css") as HTMLLinkElement | null;
// Ready once the preload has become an applied stylesheet (the inline onload
// switches rel), checked each frame; a failed stylesheet never blocks the app.
const whenStyled = () => {
  if (!css || (css.rel === "stylesheet" && css.sheet)) return start();
  requestAnimationFrame(whenStyled);
};
if (css) {
  css.addEventListener("load", () => { css.rel = "stylesheet"; }, { once: true });
  css.addEventListener("error", start, { once: true });
}
whenStyled();
