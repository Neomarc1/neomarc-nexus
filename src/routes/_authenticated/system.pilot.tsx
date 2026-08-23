/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { EmptyState } from "@/components/EmptyState";
import { DataTable } from "@/components/CrudModule";
import { StatCard } from "@/components/StatCard";
import { ROLE_LABELS, type AppRole } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/system/pilot")({
  head: () => ({
    meta: [
      { title: "Pilot Team — NEOMARC NDOS" },
      {
        name: "description",
        content:
          "Pilot readiness view of NEOMARC NDOS users: roles, last sign-in and onboarding status.",
      },
      { property: "og:title", content: "Pilot Team — NEOMARC NDOS" },
      { property: "og:description", content: "Who is on the pilot and whether they are ready." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireRole>
      <PilotPage />
    </RequireRole>
  ),
});

const PILOT_ROLES: AppRole[] = [
  "super_admin",
  "management",
  "sales_manager",
  "realtor",
  "accounts",
  "documentation",
];

function PilotPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pilot_users"],
    queryFn: async () => {
      const { data } = await db.rpc("pilot_users");
      return (data ?? []) as Row[];
    },
  });

  const covered = PILOT_ROLES.filter((r) =>
    rows.some((u) => (u.roles ?? []).includes(r)),
  );
  const active = rows.filter((u) => !!u.last_sign_in_at);
  const onboarded = rows.filter((u) => u.onboarding_dismissed_at || u.onboarding_completed_at);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pilot Team"
        description="Real accounts only — no fake users are created by NDOS."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pilot users" value={String(rows.length)} icon={Users} />
        <StatCard label="Have signed in" value={String(active.length)} tone="success" />
        <StatCard label="Onboarding done" value={String(onboarded.length)} tone="info" />
        <StatCard
          label="Pilot roles covered"
          value={`${covered.length}/${PILOT_ROLES.length}`}
          tone={covered.length === PILOT_ROLES.length ? "success" : "warning"}
        />
      </div>

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">
          Required pilot roles
        </p>
        <div className="flex flex-wrap gap-2">
          {PILOT_ROLES.map((r) => {
            const has = covered.includes(r);
            return (
              <span
                key={r}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium " +
                  (has
                    ? "border-success/30 bg-success/15 text-success"
                    : "border-warning/40 bg-warning/20 text-warning-foreground")
                }
              >
                {ROLE_LABELS[r]} {has ? "✓" : "— not assigned"}
              </span>
            );
          })}
        </div>
      </div>

      {!isLoading && rows.length === 0 ? (
        <EmptyState icon={Users} title="No users yet." />
      ) : (
        <DataTable
          loading={isLoading}
          rows={rows.map((r) => ({ ...r, id: r.user_id }))}
          empty="No users yet."
          columns={[
            { key: "full_name", label: "Name", render: (r) => r.full_name ?? "—" },
            { key: "email", label: "Email" },
            {
              key: "roles",
              label: "Roles",
              render: (r) =>
                (r.roles ?? []).length
                  ? (r.roles as AppRole[]).map((x) => ROLE_LABELS[x] ?? x).join(", ")
                  : "No role assigned",
            },
            {
              key: "last_sign_in_at",
              label: "Last login",
              render: (r) => (r.last_sign_in_at ? formatDateTime(r.last_sign_in_at) : "Never"),
            },
            {
              key: "onboarding",
              label: "Onboarding",
              render: (r) =>
                r.onboarding_completed_at || r.onboarding_dismissed_at ? "Completed" : "Pending",
            },
            {
              key: "status",
              label: "Status",
              render: (r) => (r.last_sign_in_at ? "Active" : "Inactive"),
            },
          ]}
        />
      )}
    </div>
  );
}
