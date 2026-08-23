/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { createFileRoute as _unused } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { ROLE_LABELS, type AppRole } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/system/roles")({
  head: () => ({
    meta: [
      { title: "Role Access Review — NEOMARC NDOS" },
      {
        name: "description",
        content:
          "Read-only review of what each NEOMARC role can see and do across CRM, inventory, finance, documentation and administration.",
      },
      { property: "og:title", content: "Role Access Review — NEOMARC NDOS" },
      { property: "og:description", content: "What each NEOMARC role can see and do." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireRole level="super_admin">
      <RolesPage />
    </RequireRole>
  ),
});

type Perm = "READ" | "CREATE" | "UPDATE" | "APPROVE" | "VERIFY" | "ALLOCATE" | "CLOSE";

const MODULES = [
  "Dashboard",
  "Leads / CRM",
  "Customers",
  "Realtors",
  "Inventory & Estates",
  "Reservations",
  "Sales",
  "Payments",
  "Receivables",
  "Commissions",
  "Documents",
  "Projects",
  "Reports",
  "Audit Log",
  "System Testing",
] as const;

type Module = (typeof MODULES)[number];

const MATRIX: Record<AppRole, Partial<Record<Module, Perm[]>>> = {
  super_admin: Object.fromEntries(
    MODULES.map((m) => [m, ["READ", "CREATE", "UPDATE", "APPROVE", "VERIFY", "ALLOCATE", "CLOSE"]]),
  ) as Partial<Record<Module, Perm[]>>,
  management: Object.fromEntries(
    MODULES.map((m) => [m, ["READ", "CREATE", "UPDATE", "APPROVE", "CLOSE"]]),
  ) as Partial<Record<Module, Perm[]>>,
  sales_manager: {
    Dashboard: ["READ"],
    "Leads / CRM": ["READ", "CREATE", "UPDATE"],
    Customers: ["READ", "CREATE", "UPDATE"],
    Realtors: ["READ", "CREATE", "UPDATE"],
    "Inventory & Estates": ["READ"],
    Reservations: ["READ", "CREATE", "UPDATE"],
    Sales: ["READ", "CREATE", "UPDATE"],
    Payments: ["READ"],
    Receivables: ["READ"],
    Commissions: ["READ"],
    Documents: ["READ"],
    Reports: ["READ"],
  },
  realtor: {
    Dashboard: ["READ"],
    "Leads / CRM": ["READ", "CREATE", "UPDATE"],
    Customers: ["READ"],
    "Inventory & Estates": ["READ"],
    Reservations: ["READ", "CREATE"],
    Sales: ["READ"],
    Commissions: ["READ"],
    Documents: ["READ"],
  },
  accounts: {
    Dashboard: ["READ"],
    Customers: ["READ"],
    Sales: ["READ"],
    Payments: ["READ", "CREATE", "UPDATE", "VERIFY"],
    Receivables: ["READ", "UPDATE"],
    Commissions: ["READ", "APPROVE"],
    Reports: ["READ"],
  },
  documentation: {
    Dashboard: ["READ"],
    Customers: ["READ"],
    Sales: ["READ", "UPDATE"],
    Documents: ["READ", "CREATE", "UPDATE", "APPROVE"],
    "Inventory & Estates": ["READ"],
    Reservations: ["READ"],
  },
  project_manager: {
    Dashboard: ["READ"],
    Projects: ["READ", "CREATE", "UPDATE"],
    "Inventory & Estates": ["READ", "UPDATE"],
  },
  customer: {
    Documents: ["READ"],
    Payments: ["READ"],
  },
};

const ROLES = Object.keys(ROLE_LABELS) as AppRole[];

function RolesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Role Access Review"
        description="Review only. Actual enforcement lives in the database security policies — this screen documents them."
      />

      {ROLES.map((role) => {
        const grants = MATRIX[role] ?? {};
        const accessible = MODULES.filter((m) => grants[m]?.length);
        const restricted = MODULES.filter((m) => !grants[m]?.length);
        return (
          <div key={role} className="surface-card p-4">
            <p className="font-display text-sm font-bold uppercase tracking-wide">
              {ROLE_LABELS[role]}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2">Module</th>
                    <th className="pb-2">Permission level</th>
                  </tr>
                </thead>
                <tbody>
                  {accessible.map((m) => (
                    <tr key={m} className="border-t border-border">
                      <td className="py-2 pr-4 font-medium">{m}</td>
                      <td className="py-2">
                        <span className="flex flex-wrap gap-1">
                          {grants[m]!.map((p) => (
                            <span
                              key={p}
                              className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                            >
                              {p}
                            </span>
                          ))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-medium">Restricted:</span>{" "}
              {restricted.length ? restricted.join(", ") : "None"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
