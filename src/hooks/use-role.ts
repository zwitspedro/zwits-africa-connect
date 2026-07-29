import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { ACTIVE_ROLE_KEY, pickDefaultRole, type AppRole } from "@/lib/roles";

export function useRoles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      const roles = (data ?? []).map((r) => r.role as AppRole);
      return roles.length ? roles : (["customer"] as AppRole[]);
    },
  });
}

export function useHasRole(role: AppRole) {
  const { data } = useRoles();
  return (data ?? []).includes(role);
}

export function useIsProvider() {
  return useHasRole("provider");
}

/** The portal the user is currently working in, persisted in this browser. */
export function useActiveRole() {
  const { data: roles, isLoading } = useRoles();
  const [stored, setStored] = useState<AppRole | null>(null);

  useEffect(() => {
    setStored((localStorage.getItem(ACTIVE_ROLE_KEY) as AppRole | null) ?? null);
  }, []);

  const available = roles ?? [];
  const activeRole: AppRole =
    stored && available.includes(stored) ? stored : pickDefaultRole(available);

  const setActiveRole = useCallback((role: AppRole) => {
    localStorage.setItem(ACTIVE_ROLE_KEY, role);
    setStored(role);
  }, []);

  return { activeRole, setActiveRole, roles: available, isLoading };
}

/** Activate an additional non-admin role on the signed-in account. */
export function useAddRole() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (role: Exclude<AppRole, "admin">) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: user!.id, role });
      if (error && !error.message.includes("duplicate")) throw error;
      return role;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles", user?.id] }),
  });
}
