import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SessionInfo = {
  userId: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
  isActive: boolean;
};

export function useSessionInfo() {
  return useQuery<SessionInfo | null>({
    queryKey: ["session-info"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("username, display_name, is_active").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      return {
        userId: user.id,
        username: profile?.username ?? "",
        displayName: profile?.display_name || profile?.username || "Member",
        isAdmin: (roles ?? []).some((r) => r.role === "admin"),
        isActive: profile?.is_active ?? true,
      };
    },
    staleTime: 60_000,
    refetchOnMount: "always",
    retry: 1,
  });
}
