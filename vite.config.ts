// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import { loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Load all env vars (including non-VITE_ ones like SUPABASE_SERVICE_ROLE_KEY)
// into process.env for server-side routes. Do NOT expose these to client bundle.
const serverEnv = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // Offline app shell for the Zwits PWA. Registration happens ONLY through
      // src/lib/pwa.ts (injectRegister: null), never in dev or Lovable preview.
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        // Client assets are emitted to dist/client; the worker must live beside them.
        outDir: "dist/client",
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          // DATA-LIGHT: never precache JS. Precaching every route chunk pushed
          // ~4 MB down the wire on a user's first visit — most of it for routes
          // they will never open. The CacheFirst runtimeCaching rules below
          // cache scripts as they are actually requested instead.
          globPatterns: ["**/*.{css,woff2,ico}", "icon-*.png", "favicon.png"],
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "zwits-html", networkTimeoutSeconds: 4 },
            },
            {
              urlPattern: ({ request, sameOrigin }: { request: Request; sameOrigin: boolean }) =>
                sameOrigin && ["style", "script", "worker", "font"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "zwits-assets",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ request, sameOrigin }: { request: Request; sameOrigin: boolean }) =>
                sameOrigin && request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "zwits-images",
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 14 },
              },
            },
          ],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          // DATA-LIGHT: many route files import the backend SDK, so Rollup
          // hoists it into the shared entry chunk and every visitor — including
          // someone who only opens the landing page — downloads ~380 KB of auth
          // and realtime code. Pinning it to its own chunk keeps the first paint
          // cheap; the SDK is fetched only once an authenticated screen needs it.
          manualChunks(id: string) {
            if (id.includes("node_modules/@supabase/")) return "supabase";
            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(
          __dirname,
          "node_modules/entities/lib/decode.js",
        ),
        "entities/lib/encode.js": path.resolve(
          __dirname,
          "node_modules/entities/lib/encode.js",
        ),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
  },
});
