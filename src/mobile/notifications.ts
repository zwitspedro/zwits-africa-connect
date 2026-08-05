/**
 * Notification module — native push registration + in-app notification feed.
 *
 * On device the FCM token is stored against the signed-in user so the existing
 * backend notification engine can target it. On web it falls back to the
 * existing realtime notifications table subscription.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { nativeOnly, isNative, getPlatform } from "./platform";
import { mobileStorage } from "./storage";

const TOKEN_KEY = "push.token";

export type PushRegistration = {
  token: string | null;
  permission: "granted" | "denied" | "prompt" | "unsupported";
};

/**
 * Requests push permission and returns the device token.
 * Safe to call on web — it resolves as "unsupported".
 */
export async function registerPush(): Promise<PushRegistration> {
  const mod = await nativeOnly(() => import("@capacitor/push-notifications"));
  if (!mod) return { token: null, permission: "unsupported" };

  const perm = await mod.PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return { token: null, permission: "denied" };

  const token = await new Promise<string | null>((resolve) => {
    const timeout = setTimeout(() => resolve(null), 10_000);
    void mod.PushNotifications.addListener("registration", (t) => {
      clearTimeout(timeout);
      resolve(t.value);
    });
    void mod.PushNotifications.register();
  });

  if (token) await mobileStorage.set(TOKEN_KEY, token);
  return { token, permission: "granted" };
}

/**
 * Stores the device token for the signed-in user so the backend can push to
 * this handset. No-op when there is no token (web build).
 */
export async function syncPushToken(userId: string): Promise<void> {
  const token = await mobileStorage.get(TOKEN_KEY);
  if (!token) return;
  await supabase.from("device_tokens").upsert(
    { user_id: userId, token, platform: getPlatform() } as never,
    { onConflict: "token" },
  );
}

export async function unregisterPush(): Promise<void> {
  const token = await mobileStorage.get(TOKEN_KEY);
  await mobileStorage.remove(TOKEN_KEY);
  if (!token) return;
  await supabase.from("device_tokens").delete().eq("token", token);
}

/** Foreground push + tap handling. Returns the last tapped deep link. */
export function usePushHandlers(onOpen?: (link: string) => void) {
  const [lastMessage, setLastMessage] = useState<{ title?: string; body?: string } | null>(null);

  useEffect(() => {
    if (!isNative()) return;
    const removers: Array<() => void> = [];

    void nativeOnly(() => import("@capacitor/push-notifications")).then(async (mod) => {
      if (!mod) return;
      const received = await mod.PushNotifications.addListener("pushNotificationReceived", (n) =>
        setLastMessage({ title: n.title ?? undefined, body: n.body ?? undefined }),
      );
      const action = await mod.PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (a) => {
          const link = (a.notification.data as any)?.link;
          if (typeof link === "string") onOpen?.(link);
        },
      );
      removers.push(() => void received.remove(), () => void action.remove());
    });

    return () => removers.forEach((r) => r());
  }, [onOpen]);

  return { lastMessage };
}

/** Unread count for the in-app bell, shared by all three apps. */
export function useUnreadCount(userId: string | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let alive = true;

    const load = async () => {
      const { count: c } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
      if (alive) setCount(c ?? 0);
    };
    void load();

    const channel = supabase
      .channel(`mobile-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return count;
}
