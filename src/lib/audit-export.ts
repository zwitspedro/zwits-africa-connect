import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type AuditRecord = {
  id: string;
  created_at: string;
  doc_key: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  status: string;
  errors: string[] | null;
  storage_path: string | null;
  provider_user_id?: string;
};

const DOC_LABELS: Record<string, string> = {
  id_document_url: "Government ID",
  selfie_url: "Selfie with ID",
  business_doc_url: "Business document",
};

const fmtSize = (b: number | null) => {
  if (!b && b !== 0) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

const fmtDate = (s: string) => new Date(s).toLocaleString();

const csvEscape = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function exportAuditsCSV(rows: AuditRecord[], filenameBase = "document-audit") {
  const headers = [
    "Timestamp",
    "Document",
    "Status",
    "File name",
    "File size",
    "MIME type",
    "Width",
    "Height",
    "Errors",
    "Storage path",
    "Provider user id",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        fmtDate(r.created_at),
        DOC_LABELS[r.doc_key] ?? r.doc_key,
        r.status,
        r.file_name ?? "",
        fmtSize(r.file_size),
        r.mime_type ?? "",
        r.width ?? "",
        r.height ?? "",
        (r.errors ?? []).join(" | "),
        r.storage_path ?? "",
        r.provider_user_id ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filenameBase}-${Date.now()}.csv`);
}

export function exportAuditsPDF(
  rows: AuditRecord[],
  opts: { title?: string; subtitle?: string; filenameBase?: string } = {},
) {
  const { title = "Document upload audit", subtitle, filenameBase = "document-audit" } = opts;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text(title, 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()} · ${rows.length} entries`, 40, 58);
  if (subtitle) doc.text(subtitle, 40, 72);

  autoTable(doc, {
    startY: subtitle ? 88 : 74,
    head: [["Timestamp", "Document", "Status", "File", "Size", "Dimensions", "Errors"]],
    body: rows.map((r) => [
      fmtDate(r.created_at),
      DOC_LABELS[r.doc_key] ?? r.doc_key,
      r.status,
      r.file_name ?? "—",
      fmtSize(r.file_size),
      r.width && r.height ? `${r.width}×${r.height}` : "—",
      (r.errors ?? []).join("; ") || "—",
    ]),
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [30, 30, 35], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 90 },
      2: { cellWidth: 60 },
      3: { cellWidth: 130 },
      4: { cellWidth: 50 },
      5: { cellWidth: 60 },
      6: { cellWidth: "auto" },
    },
  });

  doc.save(`${filenameBase}-${Date.now()}.pdf`);
}
