/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { useCurrentUser } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — NEOMARC NDOS" },
      { name: "description", content: "System alerts for payments, reservations, follow-ups and approvals." },
      { property: "og:title", content: "Notifications — NEOMARC NDOS" },
      { property: "og:description", content: "System alerts for payments, reservations and follow-ups." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["notifications", me?.user.id],
    enabled: !!me?.user.id,
    queryFn: async () => {
      const { data } = await db
        .from("notifications")
        .select("*")
        .eq("user_id", me!.user.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Row[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await db.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Everything that needs your attention." />
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">You are all caught up.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((n: Row) => (
            <div
              key={n.id}
              className={`surface-card flex items-start justify-between gap-4 p-4 ${n.is_read ? "opacity-70" : ""}`}
            >
              <div>
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                  Mark read
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
