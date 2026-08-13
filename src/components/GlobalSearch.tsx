import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

type Hit = { id: string; label: string; sub: string; to: string };

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  const { data: hits = [] } = useQuery({
    queryKey: ["global-search", term],
    enabled: open && term.trim().length > 1,
    queryFn: async () => {
      const q = `%${term.trim()}%`;
      const [leads, customers, realtors, properties, sales, payments] = await Promise.all([
        supabase
          .from("leads")
          .select("id, ref, full_name, phone, email")
          .or(`full_name.ilike.${q},phone.ilike.${q},email.ilike.${q},ref.ilike.${q}`)
          .limit(5),
        supabase
          .from("customers")
          .select("id, ref, full_name, phone, email")
          .or(`full_name.ilike.${q},phone.ilike.${q},email.ilike.${q},ref.ilike.${q}`)
          .limit(5),
        supabase
          .from("realtors")
          .select("id, ref, full_name, phone")
          .or(`full_name.ilike.${q},phone.ilike.${q},ref.ilike.${q}`)
          .limit(5),
        supabase
          .from("properties")
          .select("id, ref, plot_number, status")
          .or(`plot_number.ilike.${q},ref.ilike.${q}`)
          .limit(5),
        supabase.from("sales").select("id, ref, status").ilike("ref", q).limit(5),
        supabase
          .from("payments")
          .select("id, ref, receipt_number, amount")
          .or(`ref.ilike.${q},receipt_number.ilike.${q},transaction_reference.ilike.${q}`)
          .limit(5),
      ]);

      const out: { group: string; items: Hit[] }[] = [
        {
          group: "Leads",
          items: (leads.data ?? []).map((r) => ({
            id: r.id,
            label: r.full_name,
            sub: r.phone ?? r.ref,
            to: `/leads/${r.id}`,
          })),
        },
        {
          group: "Customers",
          items: (customers.data ?? []).map((r) => ({
            id: r.id,
            label: r.full_name,
            sub: r.phone ?? r.ref,
            to: `/customers/${r.id}`,
          })),
        },
        {
          group: "Realtors",
          items: (realtors.data ?? []).map((r) => ({
            id: r.id,
            label: r.full_name,
            sub: r.phone ?? r.ref,
            to: `/realtors`,
          })),
        },
        {
          group: "Inventory",
          items: (properties.data ?? []).map((r) => ({
            id: r.id,
            label: `Plot ${r.plot_number}`,
            sub: r.status,
            to: `/inventory`,
          })),
        },
        {
          group: "Sales",
          items: (sales.data ?? []).map((r) => ({
            id: r.id,
            label: r.ref,
            sub: r.status,
            to: `/sales/${r.id}`,
          })),
        },
        {
          group: "Payments",
          items: (payments.data ?? []).map((r) => ({
            id: r.id,
            label: r.receipt_number ?? r.ref,
            sub: `₦${Number(r.amount).toLocaleString()}`,
            to: `/payments`,
          })),
        },
      ];
      return out.filter((g) => g.items.length > 0);
    },
  });

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search by name, phone, email, plot, reference or receipt…"
        value={term}
        onValueChange={setTerm}
      />
      <CommandList>
        <CommandEmpty>
          {term.length > 1 ? "No matching records." : "Type at least 2 characters."}
        </CommandEmpty>
        {hits.map((group) => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.items.map((item) => (
              <CommandItem
                key={group.group + item.id}
                value={`${group.group}-${item.label}-${item.id}`}
                onSelect={() => {
                  onOpenChange(false);
                  setTerm("");
                  navigate({ to: item.to });
                }}
              >
                <span className="font-medium">{item.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{item.sub}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
