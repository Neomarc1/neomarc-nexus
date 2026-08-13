/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { CrudModule } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatNaira, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — NEOMARC NDOS" },
      { name: "description", content: "Configure payment plans, lead sources and message templates." },
      { property: "og:title", content: "Settings — NEOMARC NDOS" },
      { property: "og:description", content: "Payment plans, lead sources and message templates." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-10">
      <PageHeader title="Settings" description="System configuration for NEOMARC NDOS." />

      <section className="space-y-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">Payment plans</h2>
        <CrudModule
          table="payment_plans"
          entityName="Payment plan"
          searchKeys={["name", "ref"]}
          defaults={{ is_active: true, status: "active", installment_frequency: "monthly" }}
          columns={[
            { key: "name", label: "Plan" },
            { key: "plan_type", label: "Type", render: (r) => titleCase(r.plan_type) },
            { key: "total_price", label: "Price", render: (r) => formatNaira(r.total_price) },
            { key: "initial_deposit", label: "Deposit", render: (r) => formatNaira(r.initial_deposit) },
            { key: "installment_count", label: "Instalments" },
            { key: "installment_amount", label: "Per instalment", render: (r) => formatNaira(r.installment_amount) },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          ]}
          fields={[
            { name: "name", label: "Plan name", required: true },
            { name: "estate_id", label: "Estate", type: "select", lookup: { table: "estates", labelKey: "name" } },
            {
              name: "plan_type",
              label: "Plan type",
              type: "select",
              options: ["outright", "installment", "promo"].map((v) => ({ value: v, label: titleCase(v) })),
            },
            { name: "total_price", label: "Total price (₦)", type: "number" },
            { name: "initial_deposit", label: "Initial deposit (₦)", type: "number" },
            { name: "installment_count", label: "Number of instalments", type: "number" },
            {
              name: "installment_frequency",
              label: "Frequency",
              type: "select",
              options: ["monthly", "quarterly", "weekly"].map((v) => ({ value: v, label: titleCase(v) })),
            },
            { name: "installment_amount", label: "Instalment amount (₦)", type: "number" },
            { name: "total_payable", label: "Total payable (₦)", type: "number" },
            { name: "grace_period_days", label: "Grace period (days)", type: "number" },
            { name: "penalty_rule", label: "Penalty rule" },
            { name: "description", label: "Description", type: "textarea", full: true },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">Lead sources</h2>
        <CrudModule
          table="lead_sources"
          entityName="Lead source"
          orderBy="name"
          searchKeys={["name"]}
          defaults={{ is_active: true }}
          columns={[{ key: "name", label: "Source" }]}
          fields={[{ name: "name", label: "Source name", required: true }]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">Message templates</h2>
        <CrudModule
          table="message_templates"
          entityName="Template"
          orderBy="name"
          searchKeys={["name", "code"]}
          defaults={{ is_active: true, channel: "whatsapp" }}
          columns={[
            { key: "code", label: "Code" },
            { key: "name", label: "Name" },
            { key: "channel", label: "Channel", render: (r) => titleCase(r.channel) },
          ]}
          fields={[
            { name: "code", label: "Code", required: true },
            { name: "name", label: "Name", required: true },
            {
              name: "channel",
              label: "Channel",
              type: "select",
              options: ["whatsapp", "sms", "email"].map((v) => ({ value: v, label: titleCase(v) })),
            },
            { name: "body", label: "Message body", type: "textarea", full: true, required: true },
          ]}
        />
      </section>
    </div>
  );
}
