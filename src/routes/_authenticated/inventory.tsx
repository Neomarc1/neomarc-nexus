/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { db, type Row } from "@/lib/db";
import { CrudModule, useLookup } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatNaira, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Plot Inventory — NEOMARC NDOS" },
      {
        name: "description",
        content: "Visual plot inventory map for NEOMARC estates: available, reserved, sold and allocated units.",
      },
      { property: "og:title", content: "Plot Inventory — NEOMARC NDOS" },
      { property: "og:description", content: "Visual plot inventory across NEOMARC estates." },
    ],
  }),
  component: InventoryPage,
});

const STATUSES = ["available", "reserved", "sold", "allocated", "on_hold", "blocked"];

const STATUS_CLASS: Record<string, string> = {
  available: "bg-success/15 text-success border-success/30",
  reserved: "bg-warning/15 text-warning border-warning/40",
  sold: "bg-primary/15 text-primary border-primary/30",
  allocated: "bg-info/15 text-info border-info/30",
  on_hold: "bg-muted text-muted-foreground border-border",
  blocked: "bg-destructive/10 text-destructive border-destructive/30",
};

function InventoryPage() {
  const [view, setView] = useState<"map" | "table">("map");
  const [estateId, setEstateId] = useState<string>("all");
  const estates = useLookup("estates", "name");
  const qc = useQueryClient();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", "map"],
    queryFn: async () => {
      const { data, error } = await db
        .from("properties")
        .select("*")
        .order("block")
        .order("plot_number");
      if (error) throw error;
      return data as Row[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db.from("properties").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plot status updated");
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(
    () => properties.filter((p: Row) => estateId === "all" || p.estate_id === estateId),
    [properties, estateId],
  );

  const blocks = useMemo(() => {
    const map: Record<string, Row[]> = {};
    for (const p of filtered) (map[p.block ?? "Unblocked"] ??= []).push(p);
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const counts = STATUSES.map((s) => ({ s, n: filtered.filter((p: Row) => p.status === s).length }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plot Inventory"
        description="Live availability across every NEOMARC estate."
        action={
          <Button variant="outline" onClick={() => setView(view === "map" ? "table" : "map")}>
            {view === "map" ? "Table view" : "Map view"}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          value={estateId}
          onChange={(e) => setEstateId(e.target.value)}
        >
          <option value="all">All estates</option>
          {(estates.data ?? []).map((e: any) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        {counts.map(({ s, n }) => (
          <span
            key={s}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_CLASS[s]}`}
          >
            {titleCase(s)}: {n}
          </span>
        ))}
      </div>

      {view === "map" ? (
        isLoading ? (
          <p className="text-muted-foreground">Loading inventory…</p>
        ) : blocks.length === 0 ? (
          <p className="text-muted-foreground">No plots yet. Add units from the table view.</p>
        ) : (
          <div className="space-y-5">
            {blocks.map(([block, plots]) => (
              <div key={block} className="surface-card p-5">
                <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide">
                  Block {block} · {plots.length} plots
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2">
                  {plots.map((p: Row) => (
                    <div
                      key={p.id}
                      className={`rounded-lg border p-2 text-center ${STATUS_CLASS[p.status] ?? ""}`}
                      title={`${p.plot_size ?? ""} · ${formatNaira(p.price)}`}
                    >
                      <p className="text-sm font-bold">{p.plot_number}</p>
                      <p className="text-[10px] uppercase tracking-wide">{titleCase(p.status)}</p>
                      <select
                        className="mt-1 w-full rounded border border-border/60 bg-background/70 px-0.5 py-0.5 text-[10px] text-foreground"
                        value={p.status}
                        onChange={(e) => setStatus.mutate({ id: p.id, status: e.target.value })}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {titleCase(s)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <CrudModule
          table="properties"
          entityName="Plot"
          orderBy="plot_number"
          searchKeys={["plot_number", "block", "plot_size"]}
          defaults={{ status: "available", property_type: "land" }}
          columns={[
            { key: "block", label: "Block" },
            { key: "plot_number", label: "Plot" },
            { key: "plot_size", label: "Size" },
            {
              key: "estate_id",
              label: "Estate",
              render: (r) => estates.data?.find((e: any) => e.value === r.estate_id)?.label ?? "—",
            },
            { key: "price", label: "Price", render: (r) => formatNaira(r.price) },
            { key: "promo_price", label: "Promo", render: (r) => formatNaira(r.promo_price) },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          ]}
          fields={[
            {
              name: "estate_id",
              label: "Estate",
              type: "select",
              lookup: { table: "estates", labelKey: "name" },
              required: true,
            },
            { name: "block", label: "Block" },
            { name: "plot_number", label: "Plot number", required: true },
            { name: "plot_size", label: "Plot size", placeholder: "300sqm" },
            {
              name: "property_type",
              label: "Property type",
              type: "select",
              options: ["land", "bungalow", "duplex", "commercial"].map((v) => ({ value: v, label: titleCase(v) })),
            },
            { name: "title_documentation", label: "Title documentation" },
            { name: "price", label: "Price (₦)", type: "number", required: true },
            { name: "promo_price", label: "Promo price (₦)", type: "number" },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: STATUSES.map((v) => ({ value: v, label: titleCase(v) })),
            },
            { name: "notes", label: "Notes", type: "textarea", full: true },
          ]}
        />
      )}
    </div>
  );
}
