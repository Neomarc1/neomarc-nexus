/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const DOCUMENT_TYPES = [
  { value: "application_form", label: "Application Form" },
  { value: "identification", label: "Identification" },
  { value: "payment_receipt", label: "Payment Receipt" },
  { value: "contract_of_sale", label: "Contract of Sale" },
  { value: "deed_of_assignment", label: "Deed of Assignment" },
  { value: "registered_survey", label: "Registered Survey" },
  { value: "allocation_letter", label: "Allocation Letter" },
  { value: "offer_letter", label: "Offer Letter" },
  { value: "other", label: "Other" },
];

/** Opens a short-lived signed URL for a private document. Never exposes a public URL. */
export async function openDocument(storagePath?: string | null) {
  if (!storagePath) {
    toast.error("This record has no stored file.");
    return;
  }
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(storagePath, 120);
  if (error || !data?.signedUrl) {
    toast.error(error?.message ?? "You are not authorised to open this document.");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

export function DocumentUploader({
  customerId,
  saleId,
  estateId,
  propertyId,
  documentGroupId,
  fixedType,
  label = "Upload document",
}: {
  customerId?: string | null;
  saleId?: string | null;
  estateId?: string | null;
  propertyId?: string | null;
  /** Supplying a group id uploads a NEW VERSION of that document. */
  documentGroupId?: string | null;
  fixedType?: string;
  label?: string;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState(fixedType ?? "identification");

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { data: auth } = await db.auth.getUser();
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${customerId ?? "general"}/${docType}/${crypto.randomUUID()}-${safe}`;

      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) throw upErr;

      const payload: any = {
        customer_id: customerId ?? null,
        sale_id: saleId ?? null,
        estate_id: estateId ?? null,
        property_id: propertyId ?? null,
        document_type: docType,
        category: docType,
        title: file.name,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
        status: "pending",
        uploaded_by: auth.user?.id ?? null,
        created_by: auth.user?.id ?? null,
        updated_by: auth.user?.id ?? null,
      };
      if (documentGroupId) payload.document_group_id = documentGroupId;

      const { error } = await db.from("documents").insert(payload);
      if (error) {
        await supabase.storage.from("documents").remove([path]);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success(documentGroupId ? "New version uploaded" : "Document uploaded");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Upload failed"),
  });

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      {!fixedType ? (
        <div className="min-w-0 flex-1">
          <Label className="mb-1.5 block text-xs font-medium">Document type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload.mutate(f);
          e.target.value = "";
        }}
      />
      <Button className="h-11" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
        <Upload className="mr-2 h-4 w-4" />
        {upload.isPending ? "Uploading…" : label}
      </Button>
    </div>
  );
}
