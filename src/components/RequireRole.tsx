import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useCurrentUser } from "@/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";

export function RequireRole({
  level = "admin",
  children,
}: {
  level?: "admin" | "super_admin" | "staff";
  children: ReactNode;
}) {
  const { data: me, isLoading } = useCurrentUser();
  if (isLoading) return <p className="py-10 text-center text-muted-foreground">Loading…</p>;

  const allowed =
    level === "super_admin"
      ? me?.roles.includes("super_admin")
      : level === "admin"
        ? me?.isAdmin
        : me?.isStaff;

  if (!allowed) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="You don't have access to this screen."
        description="This area is restricted to authorised NEOMARC staff."
      />
    );
  }
  return <>{children}</>;
}
