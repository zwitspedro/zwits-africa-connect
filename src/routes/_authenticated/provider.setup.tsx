import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Check, FileText, IdCard, Camera, ChevronLeft, ChevronRight, ShieldCheck, AlertCircle, CircleDot, History, ChevronDown } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { AuditExportButtons } from "@/components/audit-export-buttons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { services } from "@/data/services";

export const Route = createFileRoute("/_authenticated/provider/setup")({
  head: () => ({ meta: [{ title: "Provider onboarding — Zwits" }] }),
  component: ProviderSetup,
});

type DocKey = "id_document_url" | "selfie_url" | "business_doc_url";

type DocSpec = {
  label: string;
  hint: string;
  icon: typeof IdCard;
  accept: string;
  mimes: string[];
  maxBytes: number;
  minImageDim?: number;   // min width & height in px (images only)
  imageOnly?: boolean;
  requirements: string[];
};

const MB = 1024 * 1024;

const DOC_META: Record<DocKey, DocSpec> = {
  id_document_url: {
    label: "Government ID",
    hint: "Passport, national ID or driver's license",
    icon: IdCard,
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    mimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    maxBytes: 10 * MB,
    minImageDim: 600,
    requirements: [
      "Government-issued: passport, national ID or driver's license",
      "All four corners visible, not cropped",
      "Colour photo or scan — no black & white",
      "Text and photo legible, no glare",
      "JPG, PNG, WEBP or PDF · max 10 MB",
    ],
  },
  selfie_url: {
    label: "Selfie with ID",
    hint: "Hold your ID next to your face, well lit",
    icon: Camera,
    accept: "image/jpeg,image/png,image/webp",
    mimes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 10 * MB,
    minImageDim: 600,
    imageOnly: true,
    requirements: [
      "Your face clearly visible, no sunglasses, no hat",
      "Hold the same ID document next to your face",
      "Well-lit, no heavy filters or edits",
      "Image only — JPG, PNG or WEBP · max 10 MB",
    ],
  },
  business_doc_url: {
    label: "Business / certification doc",
    hint: "Trade license, certificate, utility bill",
    icon: FileText,
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    mimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    maxBytes: 10 * MB,
    requirements: [
      "Trade license, professional certificate, or recent utility bill",
      "Issued in the last 12 months",
      "Your name or business name clearly shown",
      "JPG, PNG, WEBP or PDF · max 10 MB",
    ],
  },
};

async function validateFile(spec: DocSpec, file: File): Promise<{ errors: string[]; dimensions: { width: number; height: number } | null }> {
  const errors: string[] = [];
  if (!spec.mimes.includes(file.type)) {
    errors.push(`Unsupported file type (${file.type || "unknown"}). Accepted: ${spec.mimes.map((m) => m.split("/")[1].toUpperCase()).join(", ")}.`);
  }
  if (file.size > spec.maxBytes) {
    errors.push(`File is ${(file.size / MB).toFixed(1)} MB — must be under ${(spec.maxBytes / MB).toFixed(0)} MB.`);
  }
  if (file.size < 20 * 1024) {
    errors.push("File looks too small to be a real document (under 20 KB).");
  }
  let dimensions: { width: number; height: number } | null = null;
  if (file.type.startsWith("image/")) {
    dimensions = await readImageDimensions(file).catch(() => null);
    if (spec.minImageDim) {
      if (!dimensions) {
        errors.push("Could not read image. Try a different file.");
      } else if (dimensions.width < spec.minImageDim || dimensions.height < spec.minImageDim) {
        errors.push(`Image is ${dimensions.width}×${dimensions.height}px — needs to be at least ${spec.minImageDim}×${spec.minImageDim}px.`);
      }
    }
  }
  return { errors, dimensions };
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
    img.src = url;
  });
}

function ProviderSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load any existing provider row so re-entry resumes the flow.
  const { data: existing, refetch } = useQuery({
    queryKey: ["my-provider-setup", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState(services[0].slug);
  const [city, setCity] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [bio, setBio] = useState("");
  const [docs, setDocs] = useState<Record<DocKey, string | null>>({
    id_document_url: null, selfie_url: null, business_doc_url: null,
  });

  // Hydrate from existing row on first load
  const [hydrated, setHydrated] = useState(false);
  if (existing && !hydrated) {
    setBusinessName(existing.business_name ?? "");
    setCategory(existing.category ?? services[0].slug);
    setCity(existing.city ?? "");
    setHourlyRate(existing.hourly_rate ? String(existing.hourly_rate) : "");
    setBio(existing.bio ?? "");
    setDocs({
      id_document_url: (existing as any).id_document_url ?? null,
      selfie_url: (existing as any).selfie_url ?? null,
      business_doc_url: (existing as any).business_doc_url ?? null,
    });
    setHydrated(true);
  }

  const step1Valid = businessName.trim() && city.trim() && Number(hourlyRate) > 0;
  const allDocs = !!docs.id_document_url && !!docs.selfie_url && !!docs.business_doc_url;

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const payload = {
        user_id: user.id,
        business_name: businessName.trim(),
        category, city: city.trim(),
        hourly_rate: Number(hourlyRate) || 0,
        bio: bio.trim(),
        id_document_url: docs.id_document_url,
        selfie_url: docs.selfie_url,
        business_doc_url: docs.business_doc_url,
        submitted_at: new Date().toISOString(),
      };
      if (existing) {
        const { error } = await supabase.from("providers").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("providers").insert(payload);
        if (error) throw error;
        await supabase.from("user_roles").upsert(
          { user_id: user.id, role: "provider" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      }
    },
    onSuccess: () => {
      toast.success("Profile submitted — you're verified!");
      navigate({ to: "/provider" });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not submit"),
  });

  return (
    <SiteShell>
      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Become a Zwits provider</h1>
        <p className="mt-2 text-sm text-muted-foreground">A quick three-step setup. Documents are kept private and used only for verification.</p>

        <Steps step={step} />

        <div className="mt-6 rounded-3xl border border-border bg-card p-6">
          {step === 0 && (
            <div className="grid gap-4">
              <Field label="Business / professional name" value={businessName} onChange={setBusinessName} required />
              <label className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">Service category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                  {services.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                </select>
              </label>
              <Field label="City" value={city} onChange={setCity} required />
              <Field label="Hourly rate (USD)" value={hourlyRate} onChange={setHourlyRate} type="number" required />
              <label className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">About you</span>
                <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="size-4 text-primary" /> Before you upload
                </div>
                <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <li>· Documents must be genuine, current, and unedited.</li>
                  <li>· Each file: max 10 MB · JPG, PNG, WEBP or PDF (selfie must be an image).</li>
                  <li>· Photos must be sharp — no blur, no glare, all edges visible.</li>
                </ul>
              </div>

              {(Object.keys(DOC_META) as DocKey[]).map((k) => (
                <DocUpload
                  key={k}
                  docKey={k}
                  userId={user?.id ?? ""}
                  value={docs[k]}
                  onChange={(url) => setDocs((d) => ({ ...d, [k]: url }))}
                />
              ))}
              <p className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                Files are uploaded to a private bucket. Only you and Zwits reviewers can access them.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4">
              <h2 className="font-display text-lg font-semibold">Review & submit</h2>
              <Row label="Business name" value={businessName} />
              <Row label="Category" value={services.find((s) => s.slug === category)?.name ?? category} />
              <Row label="City" value={city} />
              <Row label="Hourly rate" value={`$${hourlyRate}/hr`} />
              {bio && <Row label="Bio" value={bio} />}
              <div className="grid gap-2 rounded-xl bg-muted/30 p-3 text-sm">
                {(Object.keys(DOC_META) as DocKey[]).map((k) => (
                  <div key={k} className="flex items-center justify-between">
                    <span>{DOC_META[k].label}</span>
                    <span className={docs[k] ? "flex items-center gap-1 text-emerald-400" : "text-destructive"}>
                      {docs[k] ? <><Check className="size-4" /> Uploaded</> : "Missing"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs text-foreground">
                <ShieldCheck className="mt-0.5 size-4 text-gold" />
                <span>By submitting, you confirm the documents are genuine. Zwits may revoke verification at any time.</span>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground disabled:opacity-40"
            >
              <ChevronLeft className="size-4" /> Back
            </button>
            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 0 && !step1Valid) || (step === 1 && !allDocs)}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Continue <ChevronRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => submit.mutate()}
                disabled={submit.isPending || !step1Valid || !allDocs}
                className="rounded-full bg-gold px-6 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                {submit.isPending ? "Submitting…" : "Submit & go live"}
              </button>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function Steps({ step }: { step: number }) {
  const labels = ["Profile", "Documents", "Review"];
  return (
    <ol className="mt-6 flex items-center gap-2 text-xs">
      {labels.map((l, i) => (
        <li key={l} className="flex flex-1 items-center gap-2">
          <span className={`flex size-6 items-center justify-center rounded-full text-[10px] font-semibold ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {i < step ? <Check className="size-3" /> : i + 1}
          </span>
          <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{l}</span>
          {i < labels.length - 1 && <span className="ml-1 h-px flex-1 bg-border" />}
        </li>
      ))}
    </ol>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs text-muted-foreground">{label}{required && " *"}</span>
      <input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function DocUpload({ docKey, userId, value, onChange }: { docKey: DocKey; userId: string; value: string | null; onChange: (url: string | null) => void }) {
  const meta = DOC_META[docKey];
  const Icon = meta.icon;
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showReqs, setShowReqs] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const auditKey = ["doc-audit", userId, docKey];
  const { data: audits } = useQuery({
    queryKey: auditKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_document_audits")
        .select("*")
        .eq("provider_user_id", userId)
        .eq("doc_key", docKey)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const writeAudit = async (row: {
    status: "validated" | "rejected" | "uploaded" | "upload_error";
    file: File;
    dimensions: { width: number; height: number } | null;
    errors: string[];
    storage_path: string | null;
  }) => {
    await supabase.from("provider_document_audits").insert({
      provider_user_id: userId,
      doc_key: docKey,
      file_name: row.file.name,
      file_size: row.file.size,
      mime_type: row.file.type || null,
      width: row.dimensions?.width ?? null,
      height: row.dimensions?.height ?? null,
      status: row.status,
      errors: row.errors,
      storage_path: row.storage_path,
    });
    qc.invalidateQueries({ queryKey: auditKey });
  };

  const handleFile = async (file: File) => {
    if (!userId) return;
    setErrors([]);
    setFileName(file.name);

    const { errors: validationErrors, dimensions } = await validateFile(meta, file);
    if (validationErrors.length) {
      setErrors(validationErrors);
      toast.error(`${meta.label}: ${validationErrors[0]}`);
      await writeAudit({ status: "rejected", file, dimensions, errors: validationErrors, storage_path: null });
      return;
    }

    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
      const path = `${userId}/${docKey}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("provider-verification").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      onChange(path);
      toast.success(`${meta.label} uploaded`);
      await writeAudit({ status: "uploaded", file, dimensions, errors: [], storage_path: path });
    } catch (e: any) {
      const msg = e.message ?? "Upload failed. Please try again.";
      setErrors([msg]);
      toast.error(msg);
      await writeAudit({ status: "upload_error", file, dimensions, errors: [msg], storage_path: null });
    } finally {
      setUploading(false);
    }
  };

  const status: "missing" | "error" | "uploaded" = errors.length ? "error" : value ? "uploaded" : "missing";
  const ringClass =
    status === "error" ? "border-destructive/60" :
    status === "uploaded" ? "border-emerald-500/50" :
    "border-border";

  return (
    <div className={`rounded-2xl border bg-background p-3 ${ringClass}`}>
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{meta.label}</span>
            {status === "uploaded" && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-400">Ready</span>}
            {status === "error" && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-destructive">Action needed</span>}
          </div>
          <button
            type="button"
            onClick={() => setShowReqs((v) => !v)}
            className="mt-0.5 block truncate text-left text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {fileName ?? (value ? "Uploaded — tap to replace" : meta.hint)} · {showReqs ? "hide" : "see"} requirements
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={meta.accept}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs ${
            status === "uploaded" ? "bg-emerald-500/20 text-emerald-400" :
            status === "error" ? "bg-destructive text-destructive-foreground" :
            "bg-primary text-primary-foreground"
          }`}
        >
          {uploading ? "Uploading…" : status === "uploaded" ? <><Check className="size-3" /> Done</> : status === "error" ? "Retry" : <><Upload className="size-3" /> Upload</>}
        </button>
      </div>

      {showReqs && (
        <ul className="mt-3 grid gap-1 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          {meta.requirements.map((r) => (
            <li key={r} className="flex items-start gap-2">
              <CircleDot className="mt-0.5 size-3 shrink-0 text-primary" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {errors.length > 0 && (
        <ul className="mt-3 grid gap-1 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {errors.map((e) => (
            <li key={e} className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-3 shrink-0" />
              <span>{e}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setShowAudit((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <History className="size-3" />
        {showAudit ? "Hide" : "View"} upload history{audits?.length ? ` (${audits.length})` : ""}
      </button>

      {showAudit && (
        <div className="mt-2 grid gap-1.5 rounded-xl bg-muted/30 p-3 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{audits?.length ? `${audits.length} entr${audits.length === 1 ? "y" : "ies"}` : "No upload attempts yet."}</span>
            <AuditExportButtons
              rows={audits as any}
              filenameBase={`audit-${docKey}`}
              pdfTitle={`Upload audit — ${meta.label}`}
              pdfSubtitle={`Provider user ${userId}`}
            />
          </div>
          {audits?.map((a) => <AuditRow key={a.id} audit={a} />)}
        </div>
      )}
    </div>
  );
}

function AuditRow({ audit }: { audit: any }) {
  const [open, setOpen] = useState(false);

  const tone =
    audit.status === "uploaded"
      ? "text-emerald-400"
      : audit.status === "rejected"
      ? "text-destructive"
      : audit.status === "upload_error"
      ? "text-destructive"
      : "text-muted-foreground";

  const label =
    audit.status === "uploaded"
      ? "Uploaded"
      : audit.status === "rejected"
      ? "Rejected"
      : audit.status === "upload_error"
      ? "Upload error"
      : audit.status;

  const hasChecks =
    audit.mime_type ||
    audit.file_size ||
    audit.width ||
    audit.height ||
    audit.errors?.length;

  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className={`text-xs font-medium ${tone}`}>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {new Date(audit.created_at).toLocaleString()}
          </span>
          <ChevronDown className={`size-3 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      <div className="mt-1 truncate text-[11px] text-muted-foreground">
        {audit.file_name ?? "—"} · {audit.file_size ? `${(audit.file_size / (1024 * 1024)).toFixed(2)} MB` : "?"}
        {audit.width && audit.height ? ` · ${audit.width}×${audit.height}px` : ""}
      </div>

      {open && (
        <div className="mt-2 grid gap-1 rounded-lg border border-border/40 bg-muted/30 p-2.5 text-[11px]">
          <h4 className="mb-0.5 font-medium text-foreground">File checks</h4>

          <CheckLine
            label="Format"
            value={audit.mime_type ?? "unknown"}
            pass={!audit.errors?.some((e: string) => e.includes("file type") || e.includes("Unsupported"))}
          />
          <CheckLine
            label="Size"
            value={audit.file_size ? `${(audit.file_size / (1024 * 1024)).toFixed(2)} MB` : "unknown"}
            pass={!audit.errors?.some((e: string) => e.includes("size") || e.includes("MB") || e.includes("KB"))}
          />
          {audit.width && audit.height && (
            <CheckLine
              label="Dimensions"
              value={`${audit.width}×${audit.height}px`}
              pass={!audit.errors?.some((e: string) => e.includes("px") && e.includes("needs to be at least"))}
            />
          )}
          {audit.storage_path && (
            <CheckLine label="Storage path" value={audit.storage_path} pass />
          )}

          {audit.errors?.length > 0 && (
            <div className="mt-1.5 grid gap-1">
              <h4 className="font-medium text-destructive">Exact errors</h4>
              {audit.errors.map((e: string, i: number) => (
                <div key={i} className="flex items-start gap-1.5 text-destructive">
                  <AlertCircle className="mt-0.5 size-3 shrink-0" />
                  <span>{e}</span>
                </div>
              ))}
            </div>
          )}

          {!hasChecks && (
            <span className="text-muted-foreground">No detailed checks recorded for this attempt.</span>
          )}
        </div>
      )}
    </div>
  );
}

function CheckLine({ label, value, pass }: { label: string; value: string; pass: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {pass ? (
        <Check className="size-3 shrink-0 text-emerald-400" />
      ) : (
        <AlertCircle className="size-3 shrink-0 text-destructive" />
      )}
      <span className="text-muted-foreground">{label}:</span>
      <span className={pass ? "text-foreground" : "text-destructive font-medium"}>{value}</span>
    </div>
  );
}
