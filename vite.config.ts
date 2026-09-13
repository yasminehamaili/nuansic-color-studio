// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Explicitly pin the Netlify preset for self-hosted builds (e.g. Netlify's
  // own CI running `npm run build`). Nitro can auto-detect Netlify on its
  // own, but it's still pre-RC per the wrapper's own docs, so pinning this
  // removes any doubt rather than relying on auto-detection.
  // NOTE: this only applies OUTSIDE a Lovable-triggered build -- publishing
  // through Lovable itself still forces the Cloudflare preset regardless of
  // this setting, so it's safe to leave in either way.
  nitro: {
    preset: "netlify",
  },
});