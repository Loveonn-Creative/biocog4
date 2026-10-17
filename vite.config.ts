import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Perf: preload the self-hosted Space Grotesk (latin) woff2 that renders the
// homepage hero. The filename is content-hashed, so it is injected at build time
// (Vite appends tags at the end of <head>, outside the <!--seo:head--> markers).
const preloadPrimaryFont = (): Plugin => ({
  name: "senseible-preload-primary-font",
  apply: "build",
  transformIndexHtml: {
    order: "post",
    handler(_html, ctx) {
      const font = Object.keys(ctx.bundle ?? {}).find((f) =>
        /space-grotesk-latin-wght-normal-[\w-]+\.woff2$/.test(f),
      );
      if (!font) return [];
      return [
        {
          tag: "link",
          attrs: { rel: "preload", href: `/${font}`, as: "font", type: "font/woff2", crossorigin: "" },
          injectTo: "head",
        },
      ];
    },
  },
});

// Slow networks: the main stylesheet no longer blocks the first paint, so the
// prerendered page text (inline-styled .ssr-shell) can show while CSS and JS
// download. src/main.tsx starts the app only once this stylesheet has loaded,
// so the app never renders unstyled.
const nonBlockingCss = (): Plugin => ({
  name: "senseible-non-blocking-css",
  apply: "build",
  transformIndexHtml: {
    order: "post",
    handler(html) {
      return html.replace(
        /<link rel="stylesheet" crossorigin href="(\/assets\/index-[\w-]+\.css)">/,
        (_m, href) => `<link rel="preload" as="style" crossorigin href="${href}" id="app-css" onload="this.onload=null;this.rel='stylesheet'">\n    <noscript><link rel="stylesheet" crossorigin href="${href}"></noscript>`,
      );
    },
  },
});

// One id per build, compiled into the bundle and written to /version.json, so
// an open tab can tell a newer build is live (src/lib/reliability/newBuild.ts).
const BUILD_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const buildVersion = (): Plugin => ({
  name: "senseible-build-version",
  apply: "build",
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ build: BUILD_ID }) });
  },
});

// Perf: keep stable, eagerly-needed vendor code in its own long-cacheable chunks
// so routine app deploys do not invalidate them. Only libraries that the entry
// already loads synchronously are grouped (and neither group imports app code),
// so this does not add bytes to first load or create cross-chunk init cycles.
// Everything else keeps Rollup's default splitting (route-level lazy chunks).
const vendorChunk = (id: string): string | undefined => {
  if (!id.includes("/node_modules/")) return undefined;
  if (/\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run\/router)\//.test(id)) {
    return "vendor-react";
  }
  // Supabase is not grouped: it loads lazily (src/integrations/supabase/lazyClient.ts),
  // and a forced chunk would pull shared helpers into the entry's static imports.
  return undefined;
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), preloadPrimaryFont(), nonBlockingCss(), buildVersion(), mode === "development" && componentTagger()].filter(Boolean),
  define: { __BUILD_ID__: JSON.stringify(mode === "production" ? BUILD_ID : "dev") },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Read by scripts/generate-static-html.js to preload each page's chunks; removed after.
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
}));
