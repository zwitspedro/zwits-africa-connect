import { createMiddleware } from "@tanstack/react-start";

/**
 * Data-light replacement for the generated `attachSupabaseAuth` middleware.
 *
 * The generated version imports `@/integrations/supabase/client` at module
 * scope. Because `src/start.ts` is part of the client entry, that pulled the
 * entire Supabase SDK (auth + realtime + postgrest + storage, ~380 KB raw)
 * into the first byte every visitor downloads — including people who only ever
 * see the landing page.
 *
 * Behaviour is identical: the bearer token is still attached to every server
 * function RPC. The only difference is that the SDK is imported lazily, at the
 * moment the first authenticated RPC is made, so it ships in its own chunk.
 *
 * Do NOT swap this back to the generated middleware.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
