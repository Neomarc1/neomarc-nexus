/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Flame,
  CalendarCheck,
  BookmarkCheck,
  Banknote,
  Receipt,
  AlertTriangle,
  Building2,
  TrendingUp,
  Handshake,
  Map,
  HardHat,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { db, type Row } from "@/lib/db";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/layout/AppShell";
import { formatNaira, formatDate, todayLagos, titleCase } from "@/lib/format";
import { useCurrentUser } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Executive Command Centre — NEOMARC NDOS" },
      {
        name: "description",
        content:
          "Live NEOMARC Realty command centre: leads, sales, collections, receivables, inventory and realtor performance.",
      },
      { property: "og:title", content: "Executive Command Centre — NEOMARC NDOS" },
      {
        property: "og:description",
        content: "Live NEOMARC Realty sales, collections and inventory intelligence.",
      },
    ],
  }),
  component: Dashboard,
});

function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = todayLagos();
      const monthStart = today.slice(0, 8) + "01";

      const [leads, properties, sales, payments, schedule, inspections, commissions, projects, estates, realtors] =
        await Promise.all([
          db.from("leads").select("id, full_name, status, temperature, created_at, next_followup_at, source, ref"),
          db.from("properties").select("id, status, price, estate_id"),
          db.from("sales").select("id, ref, total_payable, sale_date, estate_id, realtor_id, status, documentation_status, allocation_status"),
          db.from("payments").select("id, amount, status, payment_date, customer_id"),
          db.from("payment_schedule").select("id, sale_id, customer_id, due_date, amount_due, amount_paid, status"),
          db.from("inspections").select("id, scheduled_date, status, estate_id"),
          db.from("commissions").select("id, amount, amount_paid, status, realtor_id"),
          db.from("projects").select("id, name, progress, status"),
          db.from("estates").select("id, name"),
          db.from("realtors").select("id, full_name"),
        ]);

      return {
        today,
        monthStart,
        leads: (leads.data ?? []) as Row[],
        properties: (properties.data ?? []) as Row[],
        sales: (sales.data ?? []) as Row[],
        payments: (payments.data ?? []) as Row[],
        schedule: (schedule.data ?? []) as Row[],
        inspections: (inspections.data ?? []) as Row[],
        commissions: (commissions.data ?? []) as Row[],
        projects: (projects.data ?? []) as Row[],
        estates: (estates.data ?? []) as Row[],
        realtors: (realtors.data ?? []) as Row[],
      };
    },
  });
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface-card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Dashboard() {
  const { data: me } = useCurrentUser();
  const { data, isLoading } = useDashboard();

  const { data: reservations = [] } = useQuery({
    queryKey: ["dash-reservations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reservations")
        .select("id, ref, expiry_date, status, customer_id")
        .eq("status", "active");
      return data ?? [];
    },
  });

  if (isLoading || !data) {
    return <p className="text-muted-foreground">Loading command centre…</p>;
  }

  const { leads, properties, sales, payments, schedule, inspections, commissions, projects, estates } = data;
  const today = data.today;
  const monthStart = data.monthStart;

  const verified = payments.filter((p) => p.status === "verified");
  const collected = verified.reduce((s, p) => s + Number(p.amount), 0);
  const contractValue = sales.reduce((s, r) => s + Number(r.total_payable ?? 0), 0);
  const outstanding = Math.max(contractValue - collected, 0);
  const overdue = schedule
    .filter((s) => s.status !== "paid" && s.due_date < today)
    .reduce((s, r) => s + (Number(r.amount_due) - Number(r.amount_paid)), 0);

  const monthSales = sales.filter((s) => s.sale_date >= monthStart);
  const monthCollected = verified
    .filter((p) => p.payment_date >= monthStart)
    .reduce((s, p) => s + Number(p.amount), 0);

  const inv = (status: string) => properties.filter((p) => p.status === status).length;

  const stats = [
    { label: "Total Leads", value: leads.length, icon: Users },
    {
      label: "New Leads Today",
      value: leads.filter((l) => String(l.created_at).slice(0, 10) === today).length,
      icon: Users,
      tone: "info" as const,
    },
    {
      label: "Hot Leads",
      value: leads.filter((l) => l.temperature === "hot").length,
      icon: Flame,
      tone: "destructive" as const,
    },
    {
      label: "Inspections Scheduled",
      value: inspections.filter((i) => ["scheduled", "confirmed"].includes(i.status)).length,
      icon: CalendarCheck,
    },
    { label: "Active Reservations", value: reservations.length, icon: BookmarkCheck, tone: "warning" as const },
    { label: "Sales This Month", value: monthSales.length, icon: TrendingUp, tone: "success" as const },
    { label: "Total Sales Value", value: formatNaira(contractValue, true), icon: Banknote, tone: "gold" as const },
    { label: "Amount Collected", value: formatNaira(collected, true), icon: Receipt, tone: "success" as const },
    { label: "Outstanding Receivables", value: formatNaira(outstanding, true), icon: Receipt, tone: "warning" as const },
    { label: "Overdue Payments", value: formatNaira(overdue, true), icon: AlertTriangle, tone: "destructive" as const },
    { label: "Available Inventory", value: inv("available"), icon: Map, tone: "success" as const },
    { label: "Reserved", value: inv("reserved"), icon: BookmarkCheck, tone: "warning" as const },
    { label: "Sold", value: inv("sold"), icon: Building2 },
    { label: "Allocated", value: inv("allocated"), icon: Building2 },
    {
      label: "Realtor Commissions",
      value: formatNaira(commissions.reduce((s, c) => s + Number(c.amount), 0), true),
      icon: Handshake,
      tone: "gold" as const,
    },
    {
      label: "Active Projects",
      value: projects.filter((p) => p.status === "active").length,
      icon: HardHat,
    },
  ];

  // Charts
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleDateString("en-CA").slice(0, 7);
  });
  const salesTrend = months.map((m) => ({
    month: new Date(m + "-01").toLocaleDateString("en-NG", { month: "short" }),
    sales: sales.filter((s) => String(s.sale_date).startsWith(m)).length,
    value: sales
      .filter((s) => String(s.sale_date).startsWith(m))
      .reduce((a, b) => a + Number(b.total_payable ?? 0), 0),
    collected: verified
      .filter((p) => String(p.payment_date).startsWith(m))
      .reduce((a, b) => a + Number(b.amount), 0),
  }));

  const inventoryPie = ["available", "reserved", "sold", "allocated", "on_hold", "blocked"]
    .map((s) => ({ name: titleCase(s), value: inv(s) }))
    .filter((d) => d.value > 0);
  const PIE_COLORS = [
    "var(--color-success)",
    "var(--color-warning)",
    "var(--color-primary)",
    "var(--color-info)",
    "var(--color-muted-foreground)",
    "var(--color-destructive)",
  ];

  const sourceData = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      const k = l.source ?? "Unspecified";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const estatePerf = estates.map((e) => ({
    name: e.name,
    sold: properties.filter((p) => p.estate_id === e.id && ["sold", "allocated"].includes(p.status)).length,
    available: properties.filter((p) => p.estate_id === e.id && p.status === "available").length,
  }));

  // NEOMARC TODAY
  const followupsDue = leads.filter((l) => l.next_followup_at && String(l.next_followup_at).slice(0, 10) <= today);
  const inspectionsToday = inspections.filter((i) => i.scheduled_date === today);
  const overdueRows = schedule.filter((s) => s.status !== "paid" && s.due_date < today);
  const pendingDocs = sales.filter((s) => s.documentation_status !== "completed");
  const pendingAllocations = sales.filter(
    (s) => s.documentation_status === "completed" && s.allocation_status !== "allocated",
  );
  const expiring = reservations.filter(
    (r: any) => r.expiry_date && r.expiry_date <= new Date(Date.now() + 7 * 864e5).toLocaleDateString("en-CA"),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Executive Command Centre`}
        description={`Welcome ${me?.profile?.full_name ?? ""}. NEOMARC Realty · ${formatDate(new Date())} (Africa/Lagos)`}
        action={
          <Link to="/ai">
            <Button>Generate AI Briefing</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Sales & Collections Trend">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => formatNaira(v, true)} />
                <Tooltip formatter={(v: any) => formatNaira(Number(v))} />
                <Line type="monotone" dataKey="value" name="Sales value" stroke="var(--color-primary)" strokeWidth={2} />
                <Line type="monotone" dataKey="collected" name="Collected" stroke="var(--color-gold)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </div>
        <Panel title="Inventory Status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={inventoryPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {inventoryPie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {inventoryPie.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Lead Sources">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sourceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" name="Leads" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Estate Performance">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={estatePerf}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="sold" name="Sold" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="available" name="Available" fill="var(--color-gold)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="NEOMARC Today">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <TodayCard
            title="Leads requiring follow-up"
            count={followupsDue.length}
            to="/leads"
            items={followupsDue.slice(0, 4).map((l) => `${l.full_name} · ${titleCase(l.status)}`)}
          />
          <TodayCard
            title="Inspections today"
            count={inspectionsToday.length}
            to="/inspections"
            items={inspectionsToday.slice(0, 4).map((i) => `${titleCase(i.status)} · ${formatDate(i.scheduled_date)}`)}
          />
          <TodayCard
            title="Overdue payments"
            count={overdueRows.length}
            to="/receivables"
            items={overdueRows
              .slice(0, 4)
              .map((s) => `${formatNaira(Number(s.amount_due) - Number(s.amount_paid))} due ${formatDate(s.due_date)}`)}
          />
          <TodayCard
            title="Reservations expiring"
            count={expiring.length}
            to="/reservations"
            items={expiring.slice(0, 4).map((r: any) => `${r.ref} expires ${formatDate(r.expiry_date)}`)}
          />
          <TodayCard
            title="Pending documentation"
            count={pendingDocs.length}
            to="/documents"
            items={pendingDocs.slice(0, 4).map((s) => `${s.ref} · ${titleCase(s.documentation_status)}`)}
          />
          <TodayCard
            title="Pending allocations"
            count={pendingAllocations.length}
            to="/sales"
            items={pendingAllocations.slice(0, 4).map((s) => `${s.ref}`)}
          />
        </div>
      </Panel>

      <Panel title="Recent Sales" action={<Link to="/sales" className="text-xs text-primary underline">View all</Link>}>
        {sales.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sales recorded yet. Start from Leads → Reservation → Sale.
          </p>
        ) : (
          <div className="space-y-2">
            {sales.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-medium">{s.ref}</span>
                <span className="text-muted-foreground">{formatDate(s.sale_date)}</span>
                <span className="font-semibold">{formatNaira(s.total_payable)}</span>
                <StatusBadge value={s.status} />
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-xs text-muted-foreground">
        Monthly collections: {formatNaira(monthCollected)} · Collection rate:{" "}
        {contractValue > 0 ? ((collected / contractValue) * 100).toFixed(1) : "0.0"}%
      </p>
    </div>
  );
}

function TodayCard({
  title,
  count,
  items,
  to,
}: {
  title: string;
  count: number;
  items: string[];
  to: string;
}) {
  return (
    <Link to={to} className="rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{count}</span>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        {items.length ? items.map((i, idx) => <li key={idx}>• {i}</li>) : <li>Nothing pending.</li>}
      </ul>
    </Link>
  );
}
