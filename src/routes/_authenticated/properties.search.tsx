/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Map, Search, Share2 } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/properties/search")({
  head: () => ({
    meta: [
      { title: "Property Finder — NEOMARC NDOS" },
      { name: "description", content: "Search NEOMARC estate inventory by estate, size, price and availability from your phone." },
      { property: "og:title", content: "Property Finder — NEOMARC NDOS" },
      { property: "og:description", content: "Search NEOMARC estate inventory by estate, size, price and availability." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PropertyFinderPage,
});

function PropertyFinderPage() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [estate, setEstate] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("available");
  const [maxPrice, setMaxPrice] = useState("");

  const { data: estates = [] } = useQuery({
    queryKey: ["estates", "lookup-full"],
    queryFn: async () => {
      const { data, error } = await db.from("estates").select("*").order("name");
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", "finder"],
    queryFn: async () => {
      const { data, error } = await db
        .from("properties")
        .select("*, estates(name, location, state, lga, title_documentation)")
        .order("plot_number");
      if (error) throw error;
      return data as Row[];
    },
  });

  const rows = useMemo(() => {
    const t = term.trim().toLowerCase();
    return properties.filter((p) => {
      if (estate !== "all" && p.estate_id !== estate) return false;
      if (type !== "all" && p.property_type !== type) return false;
      if (status !== "all" && p.status !== status) return false;
      if (maxPrice && Number(p.promo_price ?? p.price) > Number(maxPrice)) return false;
      if (t) {
        const hay = [p.plot_number, p.block, p.plot_size, p.ref, p.estates?.name, p.estates?.location]
          .map((v: any) => String(v ?? "").toLowerCase())
          .join(" ");
        if (!hay.includes(t)) return false;
      }
      return true;
    });
  }, [properties, term, estate, type, status, maxPrice]);

  const types = Array.from(new Set(properties.map((p) => p.property_type).filter(Boolean)));

  async function share(p: Row) {
    const text = `${p.estates?.name ?? "NEOMARC Estate"} — Plot ${p.plot_number}${p.block ? ` (Block ${p.block})` : ""}\n${p.plot_size ?? ""} · ${formatNaira(p.promo_price ?? p.price)}\n${p.estates?.location ?? ""}\nNEOMARC Real Estate — Creating Value, and Sustainable Wealth.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "NEOMARC property", text });
        return;
      } catch {
        /* user dismissed */
      }
    }
    await navigator.clipboard.writeText(text);
    toast.success("Property details copied");
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Property Finder" description="Live inventory you are authorised to sell." />

      <div className="surface-card space-y-3 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-9"
            placeholder="Plot number, block or estate…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Estate</Label>
            <Select value={estate} onValueChange={setEstate}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All estates</SelectItem>
                {estates.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["available", "reserved", "sold", "allocated", "on_hold", "all"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "Any status" : s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Max price (₦)</Label>
            <Input
              className="h-11"
              type="number"
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading inventory…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Map}
          title="No plots match this search."
          description="Try widening the price range or clearing the estate filter."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <div key={p.id} className="surface-card space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    Plot {p.plot_number}
                    {p.block ? ` · Block ${p.block}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.estates?.name} · {p.estates?.location ?? ""}
                  </p>
                </div>
                <StatusBadge value={p.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium">{p.plot_size ?? "—"}</span>
                <span className="font-display font-bold">{formatNaira(p.promo_price ?? p.price)}</span>
                {p.is_demo ? (
                  <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground">
                    DEMO
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Title: {p.title_documentation ?? p.estates?.title_documentation ?? "—"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="h-10"
                  onClick={() => navigate({ to: "/properties/$propertyId", params: { propertyId: p.id } })}
                >
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10"
                  disabled={p.status !== "available"}
                  onClick={() => navigate({ to: "/reserve", search: { propertyId: p.id } as any })}
                >
                  Reserve
                </Button>
                <Button size="sm" variant="ghost" className="h-10" onClick={() => share(p)}>
                  <Share2 className="mr-1 h-4 w-4" /> Share
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
