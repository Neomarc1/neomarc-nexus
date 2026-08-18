import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { CrudModule } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useCurrentUser } from "@/hooks/useAuth";
import { db, type Row } from "@/lib/db";
import { formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/commission-rules")({
  head: () => ({
    meta: [
      { title: "Commission Rules — NEOMARC NDOS" },
      {
        name: "description",
        content:
          "Administer NEOMARC commission rules by estate, property type, realtor and sales channel.",
      },
      { property: "og:title", content: "Commission Rules — NEOMARC NDOS" },
      {
        property: "og:description",
        content: "Configure the rates the NEOMARC commission engine resolves for each sale.",
      },
    ],
  }),
  component: CommissionRulesPage,
});

function specificity(r: Row) {
  return (
    (r.realtor_id ? 16 : 0) +
    (r.estate_id ? 8 : 0) +
    (r.property_type ? 4 : 0) +
    (r.sales_channel ? 2 : 0) +
    (r.referral_type ? 1 : 0)
  );
}

function scopeLabel(r: Row, estates: Record<string, string>, realtors: Record<string, string>) {
  const parts = [
    r.estate_id ? (estates[r.estate_id] ?? "Estate") : "All estates",
    r.property_type ? titleCase(r.property_type) : "All property types",
    r.realtor_id ? (realtors[r.realtor_id] ?? "Realtor") : "All realtors",
    r.sales_channel ? titleCase(r.sales_channel) : "All channels",
    r.referral_type ? `${titleCase(r.referral_type)} referral` : "Any referral type",
  ];
  return parts.join(" · ");
}


function CommissionRulesPage() {
  const { data: me } = useCurrentUser();
  const isAdmin = !!me?.isAdmin;

  const { data: estates = [] } = useQuery({
    queryKey: ["estates-lookup"],
    queryFn: async () => {
      const { data } = await db.from("estates").select("id, name").order("name");
      return (data ?? []) as Row[];
    },
  });
  const { data: realtors = [] } = useQuery({
    queryKey: ["realtors-lookup"],
    queryFn: async () => {
      const { data } = await db.from("realtors").select("id, full_name").order("full_name");
      return (data ?? []) as Row[];
    },
  });
  const { data: rules = [] } = useQuery({
    queryKey: ["commission_rules", "overlap"],
    queryFn: async () => {
      const { data } = await db.from("commission_rules").select("*");
      return (data ?? []) as Row[];
    },
  });

  const estateMap = Object.fromEntries(estates.map((e: Row) => [e.id, e.name]));
  const realtorMap = Object.fromEntries(realtors.map((r: Row) => [r.id, r.full_name]));

  // Ambiguity warning: active rules with identical scope AND identical priority —
  // the engine's resolver would then fall back to date/created_at ordering.
  const ambiguous = new Set<string>();
  const buckets = new Map<string, Row[]>();
  for (const r of rules.filter((x: Row) => x.is_active)) {
    const key = [
      r.estate_id,
      r.property_type,
      r.realtor_id,
      r.sales_channel,
      r.referral_type,
      r.priority,
    ].join("|");

    buckets.set(key, [...(buckets.get(key) ?? []), r]);
  }
  for (const group of buckets.values()) {
    if (group.length > 1) group.forEach((r) => ambiguous.add(r.id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commission Rules"
        description="Rates resolved by the commission engine. Most specific active rule wins."
      />

      {!isAdmin ? (
        <div className="surface-card flex items-start gap-3 p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
          <p className="text-muted-foreground">
            You have read-only visibility. Only Super Admin / Management may create or change
            commission rules — this is enforced by the database, not the interface.
          </p>
        </div>
      ) : null}

      {ambiguous.size > 0 ? (
        <div className="surface-card flex items-start gap-3 border-warning/40 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
          <p>
            {ambiguous.size} active rule(s) share an identical scope and priority. The engine will
            pick one by effective/created date — raise the priority on the intended rule to remove
            the ambiguity.
          </p>
        </div>
      ) : null}

      <CrudModule
        table="commission_rules"
        entityName="Commission rule"
        orderBy="priority"
        searchKeys={["name", "property_type", "sales_channel"]}
        defaults={{ is_active: true, priority: 0, fixed_amount: 0 }}
        canEdit={isAdmin}
        canDelete={isAdmin}
        columns={[
          {
            key: "name",
            label: "Rule",
            render: (r) => (
              <div className="min-w-[160px]">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {scopeLabel(r, estateMap, realtorMap)}
                </p>
                {ambiguous.has(r.id) ? (
                  <p className="mt-0.5 text-xs text-warning-foreground">
                    Overlaps another active rule
                  </p>
                ) : null}
              </div>
            ),
          },
          {
            key: "referral_type",
            label: "Referral type",
            render: (r) => (r.referral_type ? titleCase(r.referral_type) : "Any"),
          },
          { key: "rate", label: "Rate", render: (r) => `${Number(r.rate ?? 0)}%` },

          {
            key: "fixed_amount",
            label: "Fixed",
            render: (r) =>
              Number(r.fixed_amount ?? 0) ? `₦${Number(r.fixed_amount).toLocaleString()}` : "—",
          },
          { key: "priority", label: "Priority" },
          { key: "specificity", label: "Specificity", render: (r) => specificity(r) },
          {
            key: "effective_from",
            label: "Effective",
            render: (r) =>
              `${formatDate(r.effective_from)} → ${r.effective_to ? formatDate(r.effective_to) : "open"}`,
          },
          {
            key: "is_active",
            label: "Status",
            render: (r) => <StatusBadge value={r.is_active ? "active" : "inactive"} />,
          },
          { key: "created_at", label: "Created", render: (r) => formatDate(r.created_at) },
        ]}
        fields={[
          { name: "name", label: "Rule name", required: true },
          {
            name: "referral_type",
            label: "Referral type (blank = any)",
            type: "select",
            options: [
              { value: "direct", label: "Direct (10% policy)" },
              { value: "indirect", label: "First-level indirect (3% policy)" },
            ],
          },
          { name: "rate", label: "Rate (%)", type: "number", required: true },

          { name: "fixed_amount", label: "Fixed component (₦)", type: "number" },
          {
            name: "estate_id",
            label: "Estate (blank = all)",
            type: "select",
            lookup: { table: "estates", labelKey: "name" },
          },
          {
            name: "realtor_id",
            label: "Realtor (blank = all)",
            type: "select",
            lookup: { table: "realtors", labelKey: "full_name" },
          },
          {
            name: "property_type",
            label: "Property type (blank = all)",
            type: "select",
            options: ["land", "residential", "commercial"].map((v) => ({
              value: v,
              label: titleCase(v),
            })),
          },
          {
            name: "sales_channel",
            label: "Sales channel (blank = all)",
            type: "select",
            options: ["direct", "referral", "online", "walk_in"].map((v) => ({
              value: v,
              label: titleCase(v),
            })),
          },
          { name: "priority", label: "Priority (higher wins ties)", type: "number" },
          { name: "is_active", label: "Rule status", type: "boolean" },
          { name: "effective_from", label: "Effective from", type: "date" },
          { name: "effective_to", label: "Effective to", type: "date" },
          { name: "notes", label: "Notes", type: "textarea", full: true },
        ]}
      />
    </div>
  );
}
