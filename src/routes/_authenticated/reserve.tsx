/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { useCurrentUser } from "@/hooks/useAuth";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNaira, todayLagos } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reserve")({
  validateSearch: (search: Record<string, unknown>) => ({
    propertyId: typeof search['propertyId'] === "string" ? (search['propertyId'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reserve a Plot — NEOMARC NDOS" },
      { name: "description", content: "Guided reservation flow: pick the buyer, confirm the plot and lock the reservation fee." },
      { property: "og:title", content: "Reserve a Plot — NEOMARC NDOS" },
      { property: "og:description", content: "Guided reservation flow for NEOMARC estate plots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReservePage,
});

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function ReservePage() {
  const { propertyId } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const today = todayLagos();

  const [selectedProperty, setSelectedProperty] = useState<string | undefined>(propertyId);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [fee, setFee] = useState("");
  const [expiry, setExpiry] = useState(addDays(today, 14));
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<Row | null>(null);

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", "available"],
    queryFn: async () => {
      const { data, error } = await db
        .from("properties")
        .select("*, estates(name)")
        .in("status", ["available"])
        .order("plot_number");
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "lookup"],
    queryFn: async () => {
      const { data, error } = await db.from("customers").select("id, full_name, phone").order("full_name");
      if (error) throw error;
      return data as Row[];
    },
  });

  const property = useMemo(
    () => properties.find((p) => p.id === selectedProperty) ?? null,
    [properties, selectedProperty],
  );

  const reserve = useMutation({
    mutationFn: async () => {
      if (!property) throw new Error("Choose an available plot.");
      if (!customerId) throw new Error("Choose the buyer.");
      if (!fee || Number(fee) <= 0) throw new Error("Enter the reservation fee received.");
      const { data: auth } = await db.auth.getUser();
      const { data, error } = await db
        .from("reservations")
        .insert({
          customer_id: customerId,
          property_id: property.id,
          estate_id: property.estate_id,
          realtor_id: me?.realtorId ?? null,
          reservation_date: today,
          expiry_date: expiry,
          reservation_fee: Number(fee),
          payment_status: "pending",
          status: "active",
          notes: notes || null,
          created_by: auth.user?.id,
          updated_by: auth.user?.id,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: (row) => {
      setDone(row);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h1 className="font-display text-2xl font-bold">Reservation {done.ref} created</h1>
        <p className="text-sm text-muted-foreground">
          Plot held until {done.expiry_date}. Accounts must verify the {formatNaira(done.reservation_fee)}{" "}
          reservation fee.
        </p>
        <div className="flex flex-col gap-2">
          <Button className="h-12" onClick={() => navigate({ to: "/reservations" })}>
            View reservations
          </Button>
          <Button variant="outline" className="h-12" onClick={() => navigate({ to: "/properties/search" })}>
            Back to property finder
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Button variant="ghost" className="h-10 px-2" onClick={() => navigate({ to: "/properties/search" })}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Property finder
      </Button>

      <PageHeader title="Reserve a plot" description="Hold inventory for a committed buyer." />

      <div className="surface-card space-y-4 p-4">
        <div>
          <Label className="mb-1.5 block text-xs font-medium">Plot</Label>
          <Select value={selectedProperty ?? ""} onValueChange={setSelectedProperty}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Choose an available plot" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.estates?.name} · Plot {p.plot_number}
                  {p.block ? ` (Blk ${p.block})` : ""} — {formatNaira(p.promo_price ?? p.price)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {properties.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">No available plots in inventory right now.</p>
          ) : null}
        </div>

        <div>
          <Label className="mb-1.5 block text-xs font-medium">Buyer</Label>
          <Select value={customerId ?? ""} onValueChange={setCustomerId}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Choose the customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                  {c.phone ? ` · ${c.phone}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Buyer not listed? Convert the lead to a customer from the lead page first.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Reservation fee (₦)</Label>
            <Input
              className="h-12"
              type="number"
              inputMode="numeric"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Hold expires</Label>
            <Input className="h-12" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs font-medium">Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {property ? (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">
              {property.estates?.name} · Plot {property.plot_number}
            </p>
            <p className="text-muted-foreground">
              {property.plot_size ?? "—"} · {formatNaira(property.promo_price ?? property.price)}
            </p>
          </div>
        ) : null}

        <Button className="h-12 w-full" disabled={reserve.isPending} onClick={() => reserve.mutate()}>
          {reserve.isPending ? "Reserving…" : "Confirm reservation"}
        </Button>
      </div>
    </div>
  );
}
