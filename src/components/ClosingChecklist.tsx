/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db, type Row } from "@/lib/db";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateTime } from "@/lib/format";

/**
 * Renders closing_checklist_templates joined with sale_closing_checklist rows.
 * Required/optional rules live in the database — never duplicated here.
 */
export function ClosingChecklist({ saleId }: { saleId: string }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["sale-checklist", saleId],
    queryFn: async () => {
      const [{ data: templates, error: tErr }, { data: items, error: iErr }] = await Promise.all([
        db.from("closing_checklist_templates").select("*").eq("is_active", true).order("sort_order"),
        db.from("sale_closing_checklist").select("*").eq("sale_id", saleId),
      ]);
      if (tErr) throw tErr;
      if (iErr) throw iErr;
      const byCode = new Map<string, Row>((items ?? []).map((i: Row) => [i.item_code, i]));
      const doneBy = Array.from(
        new Set((items ?? []).map((i: Row) => i.done_by).filter(Boolean)),
      ) as string[];
      let profiles: Row[] = [];
      if (doneBy.length) {
        const { data: p } = await db.from("profiles").select("id, full_name").in("id", doneBy);
        profiles = p ?? [];
      }
      const nameOf = (id?: string | null) =>
        profiles.find((p) => p.id === id)?.full_name ?? (id ? "Staff" : null);
      return (templates ?? []).map((t: Row) => {
        const item = byCode.get(t.code);
        return {
          code: t.code as string,
          label: t.label as string,
          required: !!t.is_required,
          done: !!item?.is_done,
          doneAt: item?.done_at ?? null,
          doneByName: nameOf(item?.done_by),
        };
      });
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ code, next }: { code: string; next: boolean }) => {
      const { data: auth } = await db.auth.getUser();
      const { error } = await db.from("sale_closing_checklist").upsert(
        {
          sale_id: saleId,
          item_code: code,
          is_done: next,
          done_by: next ? (auth.user?.id ?? null) : null,
        },
        { onConflict: "sale_id,item_code" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sale-checklist", saleId] });
      qc.invalidateQueries({ queryKey: ["sale-timeline", saleId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update checklist item"),
  });

  if (isLoading) return <p className="py-6 text-center text-sm text-muted-foreground">Loading checklist…</p>;

  type ChecklistItem = {
    code: string;
    label: string;
    required: boolean;
    done: boolean;
    doneAt: string | null;
    doneByName: string | null;
  };
  const items: ChecklistItem[] = (data ?? []) as ChecklistItem[];
  const requiredOutstanding = items.filter((i) => i.required && !i.done).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {requiredOutstanding === 0
          ? "All required items complete."
          : `${requiredOutstanding} required item(s) outstanding.`}
      </p>
      <ul className="divide-y divide-border">
        {items.map((i) => (
          <li key={i.code} className="flex items-start gap-3 py-3">
            <Checkbox
              className="mt-0.5 h-5 w-5"
              checked={i.done}
              onCheckedChange={(v) => toggle.mutate({ code: i.code, next: !!v })}
              aria-label={i.label}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {i.label}{" "}
                <span
                  className={
                    i.required ? "text-xs text-destructive" : "text-xs text-muted-foreground"
                  }
                >
                  {i.required ? "· required" : "· optional"}
                </span>
              </p>
              {i.done ? (
                <p className="text-xs text-muted-foreground">
                  Completed {formatDateTime(i.doneAt)}
                  {i.doneByName ? ` · ${i.doneByName}` : ""}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
