import { Link } from "@tanstack/react-router";
import { FileCheck2, FileWarning, Upload } from "lucide-react";
import { Panel, EmptyState } from "./dashboard-kit";
import type { ProviderData } from "./use-provider-data";

const DOC_LABELS: Record<string, string> = {
  id_document: "National ID / passport",
  selfie: "Selfie verification",
  business_doc: "Business document",
};

export function DocumentsSection({ data }: { data: ProviderData }) {
  const { provider, documents } = data;

  const required = [
    { key: "id_document", url: provider?.id_document_url },
    { key: "selfie", url: provider?.selfie_url },
    { key: "business_doc", url: provider?.business_doc_url },
  ];

  return (
    <div className="grid gap-4">
      <Panel
        title="Verification documents"
        description="Keep your documents current to stay eligible for jobs."
        action={
          <Link
            to="/provider/verify"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
          >
            <Upload className="size-3.5" /> Upload
          </Link>
        }
      >
        <ul className="grid gap-2">
          {required.map((d) => (
            <li key={d.key} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3">
              {d.url ? <FileCheck2 className="size-5 shrink-0 text-emerald-400" /> : <FileWarning className="size-5 shrink-0 text-gold" />}
              <span className="min-w-0 truncate text-sm">{DOC_LABELS[d.key]}</span>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] ${d.url ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                {d.url ? "Uploaded" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Upload history">
        {documents.length === 0 ? (
          <EmptyState title="No uploads yet." />
        ) : (
          <ul className="grid gap-2">
            {documents.map((d: any) => (
              <li key={d.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm">{DOC_LABELS[d.doc_key] ?? d.doc_key}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {d.file_name ?? "file"} · {new Date(d.created_at).toLocaleString()}
                    {d.errors?.length ? ` · ${d.errors.join(", ")}` : ""}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] capitalize ${
                    d.status === "accepted" ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {d.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
