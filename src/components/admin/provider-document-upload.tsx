import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadProviderReviewDocument } from "@/lib/provider-review.functions";
import type { ReviewDocKey } from "@/lib/provider-review-rules";
export function ProviderDocumentUpload({ providerId, docKey, label }: { providerId: string; docKey: ReviewDocKey; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useServerFn(uploadProviderReviewDocument);
  const qc = useQueryClient();
  const [error,setError] = useState("");
  const mutation = useMutation({ mutationFn: async (file: File) => { const form = new FormData(); form.set("providerId",providerId); form.set("docKey",docKey); form.set("file",file); return upload({data:form}); }, onSuccess: () => {setError("");toast.success("Document uploaded — profile pending review"); void qc.invalidateQueries({queryKey:["admin-providers"]}); void qc.invalidateQueries({queryKey:["admin-provider-docs",providerId]}); void qc.invalidateQueries({queryKey:["admin-provider-audits"]});}, onError:(e:Error)=>setError(e.message) });
  return <div className="grid gap-1"><input ref={input} className="hidden" type="file" aria-label={`Upload ${label}`} accept={docKey === "selfie_url" ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf"} onChange={e=>{const file=e.target.files?.[0];if(file && window.confirm(`Upload this ${label} for the provider? Their profile will return to pending review.`)) mutation.mutate(file);e.target.value="";}}/><Button size="sm" variant="outline" disabled={mutation.isPending} onClick={()=>input.current?.click()}><Upload className="size-4"/>{mutation.isPending ? "Uploading…" : `Upload ${label}`}</Button>{error && <p role="alert" className="max-w-xs text-xs text-destructive">{error}</p>}</div>;
}