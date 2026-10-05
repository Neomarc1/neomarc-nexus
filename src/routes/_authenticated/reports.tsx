/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { DataTable } from "@/components/CrudModule";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — NEOMARC NDOS" },
      { name: "description", content: "Sales, collections, realtor and estate performance reports for NEOMARC Real Estate." },
      { property: "og:title", content: "Reports & Analytics — NEOMARC NDOS" },
      { property: "og:description", content: "Sales, collections and performance reporting." },
    ],
  }),
  component: ReportsPage,
});

function toCsv(rows: Record<string, any>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]!);
  return [keys.join(","), ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? "")}"`).join(","))].join("\n");
}

function download(name: string, rows: Record<string, any>[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [realtors, sales, payments, estates, properties, commissions] = await Promise.all([
        db.from("realtors").select("id, full_name"),
        db.from("sales").select("id, realtor_id, estate_id, total_payable"),
        db.from("payments").select("amount, status, customer_id"),
        db.from("estates").select("id, name"),
        db.from("properties").select("id, estate_id, status, price"),
        db.from("commissions").select("realtor_id, amount, amount_paid"),
      ]);
      return {
        realtors: (realtors.data ?? []) as Row[],
        sales: (sales.data ?? []) as Row[],
        payments: (payments.data ?? []) as Row[],
        estates: (estates.data ?? []) as Row[],
        properties: (properties.data ?? []) as Row[],
        commissions: (commissions.data ?? []) as Row[],
      };
    },
  });

  const realtorRows =
    data?.realtors.map((r: Row) => {
      const s = data.sales.filter((x: Row) => x.realtor_id === r.id);
      const c = data.commissions.filter((x: Row) => x.realtor_id === r.id);
      return {
        realtor: r.full_name,
        deals: s.length,
        value: s.reduce((a: number, b: Row) => a + Number(b.total_payable ?? 0), 0),
        commission: c.reduce((a: number, b: Row) => a + Number(b.amount ?? 0), 0),
        paid: c.reduce((a: number, b: Row) => a + Number(b.amount_paid ?? 0), 0),
      };
    }) ?? [];

  const estateRows =
    data?.estates.map((e: Row) => {
      const p = data.properties.filter((x: Row) => x.estate_id === e.id);
      const s = data.sales.filter((x: Row) => x.estate_id === e.id);
      return {
        estate: e.name,
        total_plots: p.length,
        available: p.filter((x: Row) => x.status === "available").length,
        sold: p.filter((x: Row) => ["sold", "allocated"].includes(x.status)).length,
        sales_value: s.reduce((a: number, b: Row) => a + Number(b.total_payable ?? 0), 0),
      };
    }) ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title="Reports & Analytics" description="Export-ready performance summaries." />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide">Realtor performance</h2>
          <Button size="sm" variant="outline" onClick={() => download("realtor-performance", realtorRows)}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
        <DataTable
          loading={isLoading}
          rows={realtorRows}
          empty="No realtor activity yet."
          columns={[
            { key: "realtor", label: "Realtor" },
            { key: "deals", label: "Deals" },
            { key: "value", label: "Sales value", render: (r) => formatNaira(r.value) },
            { key: "commission", label: "Commission", render: (r) => formatNaira(r.commission) },
            { key: "paid", label: "Paid out", render: (r) => formatNaira(r.paid) },
          ]}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide">Estate performance</h2>
          <Button size="sm" variant="outline" onClick={() => download("estate-performance", estateRows)}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
        <DataTable
          loading={isLoading}
          rows={estateRows}
          empty="No estates yet."
          columns={[
            { key: "estate", label: "Estate" },
            { key: "total_plots", label: "Plots" },
            { key: "available", label: "Available" },
            { key: "sold", label: "Sold" },
            { key: "sales_value", label: "Sales value", render: (r) => formatNaira(r.sales_value) },
          ]}
        />
      </section>
    </div>
  );
}
