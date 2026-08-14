import { MessageCircle, Phone } from "lucide-react";

function normalize(raw?: string | null) {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return "234" + digits.slice(1);
  return digits;
}

/** Mobile-first tap-to-call / tap-to-WhatsApp actions for a contact row. */
export function ContactActions({
  phone,
  whatsapp,
  name,
}: {
  phone?: string | null;
  whatsapp?: string | null;
  name?: string | null;
}) {
  const call = phone ?? whatsapp;
  const wa = normalize(whatsapp ?? phone);

  if (!call && !wa) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <span className="hidden whitespace-nowrap sm:inline">{call ?? "—"}</span>
      {call ? (
        <a
          href={`tel:${call}`}
          aria-label={`Call ${name ?? "contact"}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
        >
          <Phone className="h-4 w-4" />
        </a>
      ) : null}
      {wa ? (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp ${name ?? "contact"}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-success/40 text-success transition-colors hover:bg-success/10"
        >
          <MessageCircle className="h-4 w-4" />
        </a>
      ) : null}
    </div>
  );
}
