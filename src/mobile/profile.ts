/**
 * Profile module — the signed-in user's identity, shared by all three apps.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireOnline } from "./offline";
import { mobileStorage } from "./storage";

export type MobileProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
};

const CACHE_KEY = "profile";

export function useMobileProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, phone")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return; // offline — keep the cached copy
    if (data) {
      setProfile(data as MobileProfile);
      await mobileStorage.setJSON(CACHE_KEY, data);
    }
  }, [userId]);

  useEffect(() => {
    let alive = true;
    void mobileStorage.getJSON<MobileProfile | null>(CACHE_KEY, null).then((cached) => {
      if (alive && cached && cached.user_id === userId) setProfile(cached);
    });
    void load().finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId, load]);

  const update = useCallback(
    async (patch: Partial<Pick<MobileProfile, "display_name" | "phone" | "avatar_url">>) => {
      if (!userId) return;
      await requireOnline("Updating your profile");
      const { error } = await supabase.from("profiles").update(patch as never).eq("user_id", userId);
      if (error) throw new Error(error.message);
      await load();
    },
    [userId, load],
  );

  return { profile, loading, refresh: load, update };
}
