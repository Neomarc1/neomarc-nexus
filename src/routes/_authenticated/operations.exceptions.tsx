/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { db, type Row } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate, formatDateTime, formatNaira, todayLagos } from "@/lib/format";
import {
  useOpsThresholds,
  daysAgoISO,
  daysAheadDate,
  hoursAgoISO,
  THRESHOLD_LABELS,
  THRESHOLDS_KEY,
  type OpsThresholds,
} from "@/hooks/useOpsThresholds";

export const Route = createFileRoute("/_authenticated/operations/exceptions")({
  head: () => ({
    meta: [
      { title: "Exception Centre — NEOMARC NDOS" },
      {
        name: "description",
        content:
          "Leads, reservations, payments, documentation and sales that need attention right now, with configurable thresholds.",
      },
      { property: "og:title", content: "Exception Centre — NEOMARC NDOS" },
      { property: "og:description", content: "Every record that is off-track, in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireRole level="staff">
      <ExceptionCentre />
    </RequireRole>
  ),
});

type ExceptionRow = { id: string; primary: string; secondary: string; to?: string };
type Group = { title: string; rows: ExceptionRow[] };

function ThresholdsDialog({ thresholds }: { thresholds: OpsThresholds }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<OpsThresholds>(thresholds);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({ key: THRESHOLDS_KEY, value: draft as never });
    setSaving(false);
    if (error) {
      toast.error("Only management can change thresholds.");
      return;
    }
    toast.success("Thresholds updated.");
    await qc.invalidateQueries();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10">
          <SlidersHorizontal className="mr-2 h-4 w-4" /> Thresholds
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exception thresholds</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {(Object.keys(THRESHOLD_LABELS) as (keyof OpsThresholds)[]).map((k) => (
            <div key={k} className="space-y-1.5">
              <Label className="text-xs">{THRESHOLD_LABELS[k]}</Label>
              <Input
                type="number"
                min={0}
                className="h-11"
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })}
              />
            </div>
          ))}
          <Button className="h-11 w-full" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save thresholds"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GroupCard({ group }: { group: Group }) {
  return (
    <div className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-display text-sm font-bold uppercase tracking-wide">{group.title}</p>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
          {group.rows.length}
        </span>
      </div>
      {group.rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Nothing to action.</p>
      ) : (
        <div className="space-y-2">
          {group.rows.slice(0, 20).map((r) => {
            const body = (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.primary}</p>
                <p className="truncate text-xs text-muted-foreground">{r.secondary}</p>
              </div>
            );
            return r.to ? (
              <Link
                key={r.id}
                to={r.to}
                className="block rounded-lg border border-border p-3 transition-colors hover:bg-muted/60"
              >
                {body}
              </Link>
            ) : (
              <div key={r.id} className="rounded-lg border border-border p-3">
                {body}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExceptionCentre() {
  const { data: t } = useOpsThresholds();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["exceptions", t],
    enabled: !!t,
    queryFn: async (): Promise<Group[]> => {
      const th = t!;
      const today = todayLagos();

      const [
        uncontacted,
        overdueFollowup,
        unassigned,
        expiringSoon,
        expired,
        awaitingVerification,
        rejectedPayments,
        overdueInstallments,
        pendingDocs,
        rejectedDocs,
        stalledDocs,
        inactiveSales,
        stuckSales,
        readyAllocation,
        readyClose,
      ] = await Promise.all([
        db
          .from("leads")
          .select("id, ref, full_name, created_at")
          .eq("status", "new")
          .is("last_contact_at", null)
          .lt("created_at", hoursAgoISO(th.new_lead_uncontacted_hours))
          .order("created_at"),
        db
          .from("leads")
          .select("id, full_name, next_followup_at, realtors(full_name)")
          .not("next_followup_at", "is", null)
          .lt("next_followup_at", daysAgoISO(th.followup_overdue_days))
          .not("status", "in", "(closed_won,closed_lost)")
          .order("next_followup_at"),
        db
          .from("leads")
          .select("id, full_name, created_at")
          .is("realtor_id", null)
          .not("status", "in", "(closed_won,closed_lost)")
          .order("created_at"),
        db
          .from("reservations")
          .select("id, ref, expiry_date, customers(full_name), properties(plot_number)")
          .eq("status", "active")
          .gte("expiry_date", today)
          .lte("expiry_date", daysAheadDate(th.reservation_expiring_days))
          .order("expiry_date"),
        db
          .from("reservations")
          .select("id, ref, expiry_date, customers(full_name)")
          .eq("status", "expired")
          .order("expiry_date", { ascending: false })
          .limit(20),
        db
          .from("payments")
          .select("id, ref, amount, created_at, customers(full_name)")
          .eq("status", "pending")
          .lt("created_at", hoursAgoISO(th.payment_verification_hours))
          .order("created_at"),
        db
          .from("payments")
          .select("id, ref, amount, payment_date, customers(full_name)")
          .eq("status", "failed")
          .order("payment_date", { ascending: false })
          .limit(20),
        db
          .from("payment_schedule")
          .select("id, sale_id, due_date, amount_due, amount_paid, customers(full_name)")
          .eq("status", "overdue")
          .lt("due_date", daysAheadDate(-th.installment_overdue_days))
          .order("due_date"),
        db
          .from("documents")
          .select("id, ref, title, document_type, created_at")
          .eq("status", "pending")
          .order("created_at"),
        db
          .from("documents")
          .select("id, ref, title, document_type, updated_at")
          .eq("status", "rejected")
          .order("updated_at", { ascending: false })
          .limit(20),
        db
          .from("sales")
          .select("id, ref, stage, updated_at, customers(full_name)")
          .eq("stage", "documentation")
          .lt("updated_at", daysAgoISO(th.documentation_stalled_days))
          .neq("status", "cancelled"),
        db
          .from("sales")
          .select("id, ref, stage, updated_at, customers(full_name)")
          .lt("updated_at", daysAgoISO(th.sale_inactive_days))
          .not("stage", "in", "(closed,cancelled)")
          .neq("status", "cancelled")
          .order("updated_at"),
        db
          .from("sales")
          .select("id, ref, stage, created_at, customers(full_name)")
          .lt("created_at", daysAgoISO(th.sale_stage_stuck_days))
          .not("stage", "in", "(closed,cancelled)")
          .neq("status", "cancelled")
          .order("created_at"),
        db
          .from("sales")
          .select("id, ref, customers(full_name)")
          .eq("allocation_status", "pending")
          .eq("stage", "allocation")
          .neq("status", "cancelled"),
        db
          .from("sales")
          .select("id, ref, customers(full_name), total_payable")
          .eq("stage", "allocation")
          .eq("allocation_status", "allocated")
          .neq("status", "cancelled"),
      ]);

      const rows = (res: any): Row[] => (res?.data ?? []) as Row[];

      return [
        {
          title: "Leads — new, not contacted",
          rows: rows(uncontacted).map((l) => ({
            id: l.id,
            primary: l.full_name,
            secondary: `Created ${formatDateTime(l.created_at)}`,
            to: "/leads",
          })),
        },
        {
          title: "Leads — follow-up overdue",
          rows: rows(overdueFollowup).map((l) => ({
            id: l.id,
            primary: l.full_name,
            secondary: `Due ${formatDate(l.next_followup_at)} · ${l.realtors?.full_name ?? "Unassigned"}`,
            to: "/leads",
          })),
        },
        {
          title: "Leads — no realtor assigned",
          rows: rows(unassigned).map((l) => ({
            id: l.id,
            primary: l.full_name,
            secondary: `Created ${formatDate(l.created_at)}`,
            to: "/leads",
          })),
        },
        {
          title: "Reservations — expiring soon",
          rows: rows(expiringSoon).map((r) => ({
            id: r.id,
            primary: `${r.customers?.full_name ?? "—"} · Plot ${r.properties?.plot_number ?? "—"}`,
            secondary: `${r.ref} · expires ${formatDate(r.expiry_date)}`,
            to: "/reservations",
          })),
        },
        {
          title: "Reservations — expired",
          rows: rows(expired).map((r) => ({
            id: r.id,
            primary: r.customers?.full_name ?? "—",
            secondary: `${r.ref} · expired ${formatDate(r.expiry_date)}`,
            to: "/reservations",
          })),
        },
        {
          title: "Payments — awaiting verification",
          rows: rows(awaitingVerification).map((p) => ({
            id: p.id,
            primary: `${p.customers?.full_name ?? "—"} · ${formatNaira(p.amount)}`,
            secondary: `${p.ref} · lodged ${formatDateTime(p.created_at)}`,
            to: "/accounts/payments",
          })),
        },
        {
          title: "Payments — rejected / failed",
          rows: rows(rejectedPayments).map((p) => ({
            id: p.id,
            primary: `${p.customers?.full_name ?? "—"} · ${formatNaira(p.amount)}`,
            secondary: `${p.ref} · ${formatDate(p.payment_date)}`,
            to: "/payments",
          })),
        },
        {
          title: "Installments — overdue",
          rows: rows(overdueInstallments).map((s) => ({
            id: s.id,
            primary: `${s.customers?.full_name ?? "—"} · ${formatNaira(Number(s.amount_due) - Number(s.amount_paid))} outstanding`,
            secondary: `Due ${formatDate(s.due_date)}`,
            to: "/receivables",
          })),
        },
        {
          title: "Documentation — pending review",
          rows: rows(pendingDocs).map((d) => ({
            id: d.id,
            primary: d.title ?? d.document_type,
            secondary: `${d.ref} · uploaded ${formatDate(d.created_at)}`,
            to: "/documentation",
          })),
        },
        {
          title: "Documentation — rejected",
          rows: rows(rejectedDocs).map((d) => ({
            id: d.id,
            primary: d.title ?? d.document_type,
            secondary: `${d.ref} · ${formatDate(d.updated_at)}`,
            to: "/documentation",
          })),
        },
        {
          title: "Documentation — stalled",
          rows: rows(stalledDocs).map((s) => ({
            id: s.id,
            primary: s.customers?.full_name ?? "—",
            secondary: `${s.ref} · no movement since ${formatDate(s.updated_at)}`,
            to: "/documentation",
          })),
        },
        {
          title: "Sales — no recent activity",
          rows: rows(inactiveSales).map((s) => ({
            id: s.id,
            primary: s.customers?.full_name ?? "—",
            secondary: `${s.ref} · ${s.stage} · last touched ${formatDate(s.updated_at)}`,
          })),
        },
        {
          title: "Sales — stuck in a stage",
          rows: rows(stuckSales).map((s) => ({
            id: s.id,
            primary: s.customers?.full_name ?? "—",
            secondary: `${s.ref} · ${s.stage} since ${formatDate(s.created_at)}`,
          })),
        },
        {
          title: "Sales — ready for allocation",
          rows: rows(readyAllocation).map((s) => ({
            id: s.id,
            primary: s.customers?.full_name ?? "—",
            secondary: `${s.ref} · awaiting allocation`,
            to: "/documentation",
          })),
        },
        {
          title: "Sales — ready to close",
          rows: rows(readyClose).map((s) => ({
            id: s.id,
            primary: s.customers?.full_name ?? "—",
            secondary: `${s.ref} · ${formatNaira(s.total_payable)}`,
            to: "/operations",
          })),
        },
      ];
    },
  });

  const total = groups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Exception Centre"
        description="Records that need attention. Thresholds are configurable."
        action={t ? <ThresholdsDialog thresholds={t} /> : undefined}
      />

      {isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Loading exceptions…</p>
      ) : total === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No exceptions right now."
          description="Every workflow is inside its configured thresholds."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((g) => (
            <GroupCard key={g.title} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}
