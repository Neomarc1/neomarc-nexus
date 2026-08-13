import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "super_admin"
  | "management"
  | "sales_manager"
  | "realtor"
  | "accounts"
  | "documentation"
  | "project_manager"
  | "customer";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  management: "Management",
  sales_manager: "Sales Manager",
  realtor: "Realtor",
  accounts: "Accounts / Finance",
  documentation: "Documentation Officer",
  project_manager: "Project Manager",
  customer: "Customer",
};

const STAFF_ROLES: AppRole[] = [
  "super_admin",
  "management",
  "sales_manager",
  "accounts",
  "documentation",
  "project_manager",
];

export function useSession() {
  const qc = useQueryClient();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        qc.invalidateQueries();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: profile }, { data: roleRows }, { data: realtor }, { data: customer }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase.from("realtors").select("id, full_name").eq("user_id", user.id).maybeSingle(),
          supabase.from("customers").select("id, full_name").eq("user_id", user.id).maybeSingle(),
        ]);

      const roles = (roleRows ?? []).map((r) => r.role as AppRole);
      return {
        user,
        profile,
        roles,
        realtorId: realtor?.id ?? null,
        customerId: customer?.id ?? null,
        isStaff: roles.some((r) => STAFF_ROLES.includes(r)),
        isAdmin: roles.includes("super_admin") || roles.includes("management"),
        isRealtor: roles.includes("realtor"),
        isCustomerOnly: roles.length > 0 && roles.every((r) => r === "customer"),
        primaryRole: (roles[0] ?? "customer") as AppRole,
      };
    },
  });
}
