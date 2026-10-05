/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Banknote, Wallet, AlertTriangle, Percent, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { DataTable } from "@/components/CrudModule";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ContactActions } from "@/components/ContactActions";
import { Timeline, type TimelineEvent } from "@/components/Timeline";
import { SaleStageBar } from "@/components/SaleStageBar";
import { ClosingChecklist } from "@/components/ClosingChecklist";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatNaira, formatDate, formatDateTime, titleCase, todayLagos } from "@/lib/format";
import { useCurrentUser } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/sales/$saleId")({
  head: () => ({
    meta: [
      { title: "Sale Detail — NEOMARC NDOS" },
      { name: "description", content: "Full NEOMARC Real Estate sale record: stage, payments, commission, checklist and allocation." },
      { property: "og:title", content: "Sale Detail — NEOMARC NDOS" },
      { property: "og:description", content: "Full NEOMARC Real Estate sale record: stage, payments, commission, checklist and allocation." },
    ],
  }),
  component: SaleDetailPage,
});

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="surface-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium break-words">{children}</div>
    </div>
  );
}

function SaleDetailPage() {
  const { saleId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const today = todayLagos();

  const sale = useQuery({
    queryKey: ["sale", saleId],
    queryFn: async () => {
      const { data, error } = await db
        .from("sales")
        .select(
          "*, customers(id, full_name, phone, whatsapp, email), realtors(id, full_name, phone, whatsapp), estates(id, name, location), properties(id, plot_number, block, plot_size, status, allocation_status), payment_plans(name)",
        )
        .eq("id", saleId)
        .maybeSingle();
      if (error) throw error;
      return data as Row | null;
    },
  });

  const schedule = useQuery({
    queryKey: ["sale-schedule", saleId],
    queryFn: async () => {
      const { data, error } = await db
        .from("payment_schedule")
        .select("*")
        .eq("sale_id", saleId)
        .order("installment_no");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const payments = useQuery({
    queryKey: ["sale-payments", saleId],
    queryFn: async () => {
      const { data, error } = await db
        .from("payments")
        .select("*")
        .eq("sale_id", saleId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const commissions = useQuery({
    queryKey: ["sale-commissions", saleId],
    queryFn: async () => {
      const { data, error } = await db
        .from("commissions")
        .select("*, realtors(full_name)")
        .eq("sale_id", saleId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const allocations = useQuery({
    queryKey: ["sale-allocations", saleId],
    queryFn: async () => {
      const { data, error } = await db
        .from("allocations")
        .select("*, properties(plot_number, block), estates(name)")
        .eq("sale_id", saleId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const timeline = useQuery({
    queryKey: ["sale-timeline", saleId],
    queryFn: async () => {
      const { data, error } = await db.rpc("sale_timeline", { _sale_id: saleId });
      if (error) throw error;
      return (data ?? []) as TimelineEvent[];
    },
  });

  const closeSale = useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("close_sale", { _sale_id: saleId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sale closed");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not close sale"),
  });

  const allocate = useMutation({
    mutationFn: async () => {
      const s = sale.data!;
      const { data: auth } = await db.auth.getUser();
      const { error } = await db.from("allocations").insert({
        sale_id: s.id,
        customer_id: s.customer_id,
        property_id: s.property_id,
        estate_id: s.estate_id,
        allocation_date: today,
        allocation_officer: auth.user?.id ?? null,
        status: "completed",
        created_by: auth.user?.id ?? null,
        updated_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Allocation recorded");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not record allocation"),
  });

  if (sale.isLoading) {
    return <p className="py-16 text-center text-muted-foreground">Loading sale…</p>;
  }

  const s = sale.data;
  if (!s) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Sale not found, or you don’t have access to it.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate({ to: "/sales" })}>
          Back to sales
        </Button>
      </div>
    );
  }

  const rows = schedule.data ?? [];
  const totalPayable = Number(s.total_payable ?? 0);
  const amountPaid = rows.reduce((t: number, r: Row) => t + Number(r.amount_paid ?? 0), 0);
  const outstanding = Math.max(totalPayable - amountPaid, 0);
  const progress = totalPayable > 0 ? Math.min((amountPaid / totalPayable) * 100, 100) : 0;
  const overdue = rows
    .filter((r: Row) => r.status !== "paid" && r.status !== "waived" && r.due_date < today)
    .reduce((t: number, r: Row) => t + Math.max(Number(r.amount_due) - Number(r.amount_paid ?? 0), 0), 0);
  const next = rows.find((r: Row) => r.status !== "paid" && r.status !== "waived");

  const allocation = (allocations.data ?? [])[0];
  const canAllocate =
    !allocation && s.stage !== "closed" && s.stage !== "cancelled" && s.property_id;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sale ${s.ref}`}
        description={`${s.customers?.full_name ?? "Customer"} · ${s.estates?.name ?? "Estate"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/sales" })}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Sales
            </Button>
            {me?.isAdmin && s.stage !== "closed" && s.stage !== "cancelled" ? (
              <Button size="sm" disabled={closeSale.isPending} onClick={() => closeSale.mutate()}>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                {closeSale.isPending ? "Closing…" : "Close sale"}
              </Button>
            ) : null}
          </div>
        }
      />

      <Section title="Sale header">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Reference">{s.ref}</Field>
          <Field label="Sale date">{formatDate(s.sale_date)}</Field>
          <Field label="Customer">
            <div className="space-y-1">
              <div>{s.customers?.full_name ?? "—"}</div>
              <ContactActions
                phone={s.customers?.phone}
                whatsapp={s.customers?.whatsapp}
                name={s.customers?.full_name}
              />
            </div>
          </Field>
          <Field label="Realtor">
            <div className="space-y-1">
              <div>{s.realtors?.full_name ?? "—"}</div>
              {s.realtors ? (
                <ContactActions
                  phone={s.realtors?.phone}
                  whatsapp={s.realtors?.whatsapp}
                  name={s.realtors?.full_name}
                />
              ) : null}
            </div>
          </Field>
          <Field label="Estate">{s.estates?.name ?? "—"}</Field>
          <Field label="Plot">
            {s.properties
              ? `${s.properties.block ? s.properties.block + " / " : ""}${s.properties.plot_number}${s.properties.plot_size ? ` · ${s.properties.plot_size}` : ""}`
              : "—"}
          </Field>
          <Field label="Sale amount">{formatNaira(totalPayable)}</Field>
          <Field label="Payment plan">{s.payment_plans?.name ?? "—"}</Field>
          <Field label="Stage">
            <StatusBadge value={s.stage} />
          </Field>
          <Field label="Status">
            <StatusBadge value={s.status} />
          </Field>
          <Field label="Documentation">
            <StatusBadge value={s.documentation_status} />
          </Field>
          <Field label="Allocation">
            <StatusBadge value={s.allocation_status} />
          </Field>
        </div>
      </Section>

      <SaleStageBar stage={s.stage} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sale amount" value={formatNaira(totalPayable)} icon={Banknote} />
        <StatCard label="Amount paid" value={formatNaira(amountPaid)} icon={Wallet} tone="success" />
        <StatCard label="Outstanding" value={formatNaira(outstanding)} icon={Percent} tone="gold" />
        <StatCard
          label="Overdue"
          value={formatNaira(overdue)}
          icon={AlertTriangle}
          tone={overdue > 0 ? "destructive" : "default"}
        />
      </div>

      <Section title="Payment progress">
        <Progress value={progress} className="h-2" />
        <p className="mt-2 text-sm text-muted-foreground">
          {progress.toFixed(1)}% collected
          {next ? ` · next: ${next.label ?? `Instalment ${next.installment_no}`} — ${formatNaira(Number(next.amount_due) - Number(next.amount_paid ?? 0))} due ${formatDate(next.due_date)}` : " · schedule fully settled"}
        </p>
      </Section>

      <Section title="Payment schedule">
        <DataTable
          loading={schedule.isLoading}
          empty="No schedule generated for this sale."
          rows={rows}
          columns={[
            { key: "installment_no", label: "#" },
            { key: "label", label: "Label", render: (r) => r.label ?? `Instalment ${r.installment_no}` },
            { key: "due_date", label: "Due", render: (r) => formatDate(r.due_date) },
            { key: "amount_due", label: "Due", render: (r) => formatNaira(r.amount_due) },
            { key: "amount_paid", label: "Paid", render: (r) => formatNaira(r.amount_paid) },
            {
              key: "balance",
              label: "Balance",
              render: (r) => formatNaira(Math.max(Number(r.amount_due) - Number(r.amount_paid ?? 0), 0)),
            },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          ]}
        />
      </Section>

      <Section
        title="Payments"
        action={
          <Link to="/payments" className="text-sm font-medium text-primary hover:underline">
            All payments
          </Link>
        }
      >
        <DataTable
          loading={payments.isLoading}
          empty="No payments recorded."
          rows={payments.data ?? []}
          columns={[
            { key: "receipt_number", label: "Receipt" },
            { key: "payment_date", label: "Date", render: (r) => formatDate(r.payment_date) },
            { key: "amount", label: "Amount", render: (r) => formatNaira(r.amount) },
            { key: "method", label: "Method", render: (r) => titleCase(r.method) },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          ]}
        />
      </Section>

      <Section
        title="Commission"
        action={
          <Link to="/commissions" className="text-sm font-medium text-primary hover:underline">
            All commissions
          </Link>
        }
      >
        <DataTable
          loading={commissions.isLoading}
          empty="No commission accrued for this sale."
          rows={commissions.data ?? []}
          columns={[
            { key: "ref", label: "Ref" },
            { key: "realtor", label: "Realtor", render: (r) => r.realtors?.full_name ?? "—" },
            { key: "rate", label: "Rate", render: (r) => `${Number(r.rate ?? 0)}%` },
            { key: "amount", label: "Amount", render: (r) => formatNaira(r.amount) },
            { key: "amount_paid", label: "Paid", render: (r) => formatNaira(r.amount_paid) },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          ]}
        />
      </Section>

      <Section
        title="Allocation"
        action={
          canAllocate ? (
            <Button size="sm" disabled={allocate.isPending} onClick={() => allocate.mutate()}>
              {allocate.isPending ? "Allocating…" : "Record allocation"}
            </Button>
          ) : null
        }
      >
        {allocation ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Reference">{allocation.ref}</Field>
            <Field label="Status">
              <StatusBadge value={allocation.status} />
            </Field>
            <Field label="Allocation date">{formatDate(allocation.allocation_date)}</Field>
            <Field label="Completed">{allocation.completed_at ? formatDateTime(allocation.completed_at) : "—"}</Field>
            <Field label="Property">
              {allocation.properties
                ? `${allocation.properties.block ? allocation.properties.block + " / " : ""}${allocation.properties.plot_number}`
                : "—"}
            </Field>
            <Field label="Estate">{allocation.estates?.name ?? "—"}</Field>
            <Field label="Notes">{allocation.notes ?? "—"}</Field>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No allocation recorded yet. Allocation is written to the allocations table; property status is updated by
            the database.
          </p>
        )}
      </Section>

      <Section title="Closing checklist">
        <ClosingChecklist saleId={saleId} />
        {s.stage === "closed" ? (
          <p className="mt-3 text-sm text-success">Closed {formatDateTime(s.closed_at)}</p>
        ) : !me?.isAdmin ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Only Management / Super Admin can close a transaction.
          </p>
        ) : null}
      </Section>

      <Section title="Transaction timeline">
        {timeline.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading timeline…</p>
        ) : (
          <Timeline events={timeline.data ?? []} />
        )}
      </Section>
    </div>
  );
}
