/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { db, type Row } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "time" | "textarea" | "select" | "email" | "boolean";
  options?: { value: string; label: string }[];
  lookup?: { table: string; labelKey?: string; filter?: [string, any] };
  required?: boolean;
  placeholder?: string;
  full?: boolean;
};

export type ColumnDef = {
  key: string;
  label: string;
  render?: (row: Row) => ReactNode;
  className?: string;
};

export function useLookup(table?: string, labelKey = "full_name", filter?: [string, any]) {
  return useQuery({
    queryKey: ["lookup", table, labelKey, filter?.[0], filter?.[1]],
    enabled: !!table,
    queryFn: async () => {
      let q = db.from(table).select(`id, ${labelKey}`).order(labelKey);
      if (filter) q = q.eq(filter[0], filter[1]);
      const { data } = await q;
      return (data ?? []).map((r: Row) => ({ value: r.id, label: r[labelKey] ?? r.id }));
    },
  });
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
}) {
  const lookup = useLookup(field.lookup?.table, field.lookup?.labelKey, field.lookup?.filter);
  const options: { value: string; label: string }[] = field.options ?? lookup.data ?? [];

  if (field.type === "textarea") {
    return (
      <Textarea
        value={value ?? ""}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <Select
        value={value === undefined || value === null ? "" : value ? "yes" : "no"}
        onValueChange={(v) => onChange(v === "yes")}
      >
        <SelectTrigger>
          <SelectValue placeholder={field.placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="yes">Active</SelectItem>
          <SelectItem value="no">Inactive</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "select" || field.lookup) {
    return (
      <Select
        value={value ? String(value) : ""}
        onValueChange={(v) => onChange(v === "__none" ? null : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder={field.placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {!field.required ? <SelectItem value="__none">— None —</SelectItem> : null}
          {options.map((o) => (
            <SelectItem key={o.value} value={String(o.value)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      type={field.type ?? "text"}
      value={value ?? ""}
      placeholder={field.placeholder}
      onChange={(e) =>
        onChange(
          field.type === "number"
            ? e.target.value === ""
              ? null
              : Number(e.target.value)
            : e.target.value,
        )
      }
    />
  );
}

export function RecordDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  initial?: Row;
  onSubmit: (values: Row) => void;
  submitting?: boolean;
}) {
  const [values, setValues] = useState<Row>(initial ?? {});

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setValues(initial ?? {});
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const missing = fields.filter((f) => f.required && !values[f.name]);
            if (missing.length) {
              toast.error(`Please fill: ${missing.map((m) => m.label).join(", ")}`);
              return;
            }
            onSubmit(values);
          }}
        >
          {fields.map((f) => (
            <div key={f.name} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
              <Label className="mb-1.5 block text-xs font-medium">
                {f.label}
                {f.required ? <span className="text-destructive"> *</span> : null}
              </Label>
              <FieldInput
                field={f}
                value={values[f.name]}
                onChange={(v) => setValues((prev: Row) => ({ ...prev, [f.name]: v }))}
              />
            </div>
          ))}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DataTable({
  columns,
  rows,
  loading,
  onRowClick,
  actions,
  empty = "No records yet.",
}: {
  columns: ColumnDef[];
  rows: Row[];
  loading?: boolean | undefined;
  onRowClick?: ((row: Row) => void) | undefined;
  actions?: ((row: Row) => ReactNode) | undefined;
  empty?: string | undefined;
}) {
  return (
    <div className="surface-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>
                {c.label}
              </TableHead>
            ))}
            {actions ? <TableHead className="w-24 text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1}
                className="py-10 text-center text-muted-foreground"
              >
                Loading…
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1}
                className="py-10 text-center text-muted-foreground"
              >
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className={onRowClick ? "cursor-pointer" : undefined}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.className}>
                    {c.render ? c.render(row) : (row[c.key] ?? "—")}
                  </TableCell>
                ))}
                {actions ? (
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {actions(row)}
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function CrudModule({
  table,
  select = "*",
  orderBy = "created_at",
  columns,
  fields,
  entityName,
  searchKeys = [],
  filter,
  defaults,
  onRowClick,
  toolbar,
  canEdit = true,
  canDelete = true,
}: {
  table: string;
  select?: string;
  orderBy?: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  entityName: string;
  searchKeys?: string[];
  filter?: [string, any];
  defaults?: Row;
  onRowClick?: (row: Row) => void;
  toolbar?: ReactNode;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [table, select, filter?.[0], filter?.[1]],
    queryFn: async () => {
      let q = db.from(table).select(select).order(orderBy, { ascending: false });
      if (filter) q = q.eq(filter[0], filter[1]);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const filtered = useMemo(() => {
    if (!term.trim()) return rows;
    const t = term.toLowerCase();
    return rows.filter((r) =>
      (searchKeys.length ? searchKeys : Object.keys(r)).some((k) =>
        String(r[k] ?? "")
          .toLowerCase()
          .includes(t),
      ),
    );
  }, [rows, term, searchKeys]);

  const save = useMutation({
    mutationFn: async (values: Row) => {
      const payload = { ...defaults, ...values };
      delete payload.id;
      const { data: auth } = await db.auth.getUser();
      if (editing) {
        const { error } = await db
          .from(table)
          .update({ ...payload, updated_by: auth.user?.id })
          .eq("id", editing.id);
        if (error) throw error;
        await logAudit({
          action: "update",
          table,
          recordId: editing.id,
          previous: editing,
          next: payload,
        });
      } else {
        const { data, error } = await db
          .from(table)
          .insert({ ...payload, created_by: auth.user?.id, updated_by: auth.user?.id })
          .select()
          .single();
        if (error) throw error;
        await logAudit({ action: "create", table, recordId: data?.id, next: payload });
      }
    },
    onSuccess: () => {
      toast.success(`${entityName} saved`);
      setDialogOpen(false);
      setEditing(null);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save record"),
  });

  const remove = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await db.from(table).delete().eq("id", row.id);
      if (error) throw error;
      await logAudit({ action: "delete", table, recordId: row.id, previous: row });
    },
    onSuccess: () => {
      toast.success(`${entityName} deleted`);
      setDeleting(null);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not delete record"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={`Search ${entityName.toLowerCase()}s…`}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        {toolbar}
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> New {entityName}
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={isLoading}
        onRowClick={onRowClick}
        actions={
          canEdit || canDelete
            ? (row) => (
                <div className="flex justify-end gap-1">
                  {canEdit ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(row);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete"
                      onClick={() => setDeleting(row)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  ) : null}
                </div>
              )
            : undefined
        }
      />

      {dialogOpen ? (
        <RecordDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={editing ? `Edit ${entityName}` : `New ${entityName}`}
          fields={fields}
          initial={editing ?? {}}
          submitting={save.isPending}
          onSubmit={(v) => save.mutate(v)}
        />
      ) : null}

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {entityName.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Financial records should be reversed rather than
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove.mutate(deleting)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
