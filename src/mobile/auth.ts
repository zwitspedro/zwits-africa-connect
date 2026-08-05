/**
 * Authentication module for the shared mobile core.
 *
 * Wraps the existing Lovable Cloud auth (email/password + Google) with the
 * bits a native shell needs: role-aware landing route, deep-link handling for
 * OAuth returns, and a cached "last known roles" value so a cold, offline
 * launch can render the right portal immediately.
 */
import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { ROLES, pickDefaultRole, type AppRole } from "@/lib/roles";
import { mobileStorage } from "./storage";
import { nativeOnly, isNative } from "./platform";

const ROLES_CACHE_KEY = "auth.roles";

export type MobileAuthState = {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  activeRole: AppRole;
  /** Route the shell should land on for the active role. */
  home: string;
  loading: boolean;
};

/** Reads the roles cached from the last successful session. */
export async function cachedRoles(): Promise<AppRole[]> {
  return mobileStorage.getJSON<AppRole[]>(ROLES_CACHE_KEY, []);
}

async function fetchRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  const roles = (data ?? []).map((r) => r.role as AppRole);
  return roles.length ? roles : ["customer"];
}

export function useMobileAuth(): MobileAuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void cachedRoles().then((r) => {
      if (alive && r.length) setRoles(r);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setRoles([]);
        void mobileStorage.remove(ROLES_CACHE_KEY);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!alive) return;
      setSession(s);
      setLoading(false);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    let alive = true;
    fetchRoles(userId)
      .then((r) => {
        if (!alive) return;
        setRoles(r);
        void mobileStorage.setJSON(ROLES_CACHE_KEY, r);
      })
      .catch(() => {
        /* offline — keep the cached roles */
      });
    return () => {
      alive = false;
    };
  }, [session?.user?.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  }, []);

  const signOut = useCallback(async () => {
    await mobileStorage.remove(ROLES_CACHE_KEY);
    await supabase.auth.signOut();
  }, []);

  const activeRole = pickDefaultRole(roles);

  return {
    session,
    user: session?.user ?? null,
    roles,
    activeRole,
    home: ROLES[activeRole].home,
    loading,
    signIn,
    signInWithGoogle,
    signOut,
  };
}

/**
 * Handles OAuth/app deep links (`zwits://` or an https app link) by feeding the
 * returned tokens into Supabase. Call once from the mobile shell root.
 */
export function useAuthDeepLinks() {
  useEffect(() => {
    if (!isNative()) return;
    let remove: (() => void) | undefined;

    void nativeOnly(() => import("@capacitor/app")).then(async (mod) => {
      if (!mod) return;
      const handle = await mod.App.addListener("appUrlOpen", async ({ url }) => {
        const hash = url.includes("#") ? url.slice(url.indexOf("#") + 1) : "";
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      });
      remove = () => void handle.remove();
    });

    return () => remove?.();
  }, []);
}
