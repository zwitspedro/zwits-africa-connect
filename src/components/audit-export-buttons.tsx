import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportAuditsCSV, exportAuditsPDF, type AuditRecord } from "@/lib/audit-export";

type Props = {
  rows: AuditRecord[] | undefined;
  filenameBase: string;
  pdfTitle?: string;
  pdfSubtitle?: string;
  size?: "sm" | "xs";
};

export function AuditExportButtons({ rows, filenameBase, pdfTitle, pdfSubtitle, size = "xs" }: Props) {
  const disabled = !rows?.length;
  const cls =
    size === "sm"
      ? "inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-40"
      : "inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-muted disabled:opacity-40";
  const icon = size === "sm" ? "size-3.5" : "size-3";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Download className={icon} /> Export
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => rows && exportAuditsCSV(rows, filenameBase)}
        className={cls}
      >
        <FileSpreadsheet className={icon} /> CSV
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => rows && exportAuditsPDF(rows, { filenameBase, title: pdfTitle, subtitle: pdfSubtitle })}
        className={cls}
      >
        <FileText className={icon} /> PDF
      </button>
    </div>
  );
}
