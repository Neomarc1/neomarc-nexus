/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatDate, formatNaira, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/properties/$propertyId")({
  head: () => ({
    meta: [
      { title: "Property Detail — NEOMARC NDOS" },
      { name: "description", content: "Plot details, price, documentation and availability for NEOMARC estate inventory." },
      { property: "og:title", content: "Property Detail — NEOMARC NDOS" },
      { property: "og:description", content: "Plot details, price, documentation and availability." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PropertyDetailPage,
});

function Line({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

function PropertyDetailPage() {
  const { propertyId } = Route.useParams();
  const navigate = useNavigate();

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data, error } = await db
        .from("properties")
        .select("*, estates(name, location, state, lga, title_documentation, default_plot_size)")
        .eq("id", propertyId)
        .maybeSingle();
      if (error) throw error;
      return data as Row | null;
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["payment_plans", property?.estate_id],
    enabled: !!property?.estate_id,
    queryFn: async () => {
      const { data, error } = await db
        .from("payment_plans")
        .select("*")
        .eq("estate_id", property!.estate_id)
        .eq("is_active", true);
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: reservation } = useQuery({
    queryKey: ["property-reservation", propertyId],
    queryFn: async () => {
      const { data } = await db
        .from("reservations")
        .select("ref, status, expiry_date, reservation_date")
        .eq("property_id", propertyId)
        .eq("status", "active")
        .maybeSingle();
      return data as Row | null;
    },
  });

  if (isLoading) return <p className="py-10 text-center text-muted-foreground">Loading…</p>;
  if (!property) return <p className="py-10 text-center text-muted-foreground">Property not found.</p>;

  const available = property.status === "available";

  return (
    <div className="space-y-5">
      <Button variant="ghost" className="h-10 px-2" onClick={() => navigate({ to: "/properties/search" })}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Property finder
      </Button>

      <PageHeader
        title={`Plot ${property.plot_number}${property.block ? ` · Block ${property.block}` : ""}`}
        description={`${property.estates?.name ?? ""} · ${property.ref}`}
        action={<StatusBadge value={property.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-4">
          <p className="mb-2 font-display text-sm font-bold uppercase tracking-wide">Plot</p>
          <Line label="Estate" value={property.estates?.name} />
          <Line
            label="Location"
            value={[property.estates?.location, property.estates?.lga, property.estates?.state]
              .filter(Boolean)
              .join(", ")}
          />
          <Line label="Plot size" value={property.plot_size ?? property.estates?.default_plot_size} />
          <Line label="Type" value={titleCase(property.property_type)} />
          <Line label="Price" value={formatNaira(property.promo_price ?? property.price)} />
          <Line
            label="Documentation"
            value={property.title_documentation ?? property.estates?.title_documentation}
          />
          <Line label="Demo inventory" value={property.is_demo ? "Yes — demo plot" : "No"} />
        </div>

        <div className="surface-card p-4">
          <p className="mb-2 font-display text-sm font-bold uppercase tracking-wide">Payment options</p>
          {plans.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No payment plan configured for this estate yet.</p>
          ) : (
            plans.map((p) => (
              <Line
                key={p.id}
                label={p.name}
                value={
                  p.plan_type === "outright"
                    ? formatNaira(p.total_payable)
                    : `${formatNaira(p.initial_deposit)} + ${p.installment_count} × ${formatNaira(p.installment_amount)}`
                }
              />
            ))
          )}

          <p className="mb-2 mt-5 font-display text-sm font-bold uppercase tracking-wide">Availability</p>
          {available ? (
            <>
              <p className="text-sm text-success">This plot is available for reservation.</p>
              <Button
                className="mt-3 h-12 w-full"
                onClick={() => navigate({ to: "/reserve", search: { propertyId: property.id } as any })}
              >
                Reserve property
              </Button>
            </>
          ) : property.status === "reserved" ? (
            <div className="space-y-1 text-sm">
              <p className="text-warning-foreground">Currently reserved — reservation must lapse or convert first.</p>
              {reservation ? (
                <p className="text-muted-foreground">
                  {reservation.ref} · reserved {formatDate(reservation.reservation_date)} · expires{" "}
                  {formatDate(reservation.expiry_date)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This plot is {titleCase(property.status).toLowerCase()} and cannot be reserved.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
