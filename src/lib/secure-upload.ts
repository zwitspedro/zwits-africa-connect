/**
 * Secure client-side upload helper.
 *
 * Never trusts the user-supplied filename or the browser-reported MIME type:
 * the real content type is sniffed from the file's magic bytes, checked against
 * an explicit allow-list and size cap, and the stored object gets a generated
 * name with an extension derived from the *validated* type. Paths are always
 * rooted at the caller's own user id so storage RLS ("first folder must be
 * auth.uid()") can never be side-stepped by a crafted path.
 */
import { supabase } from "@/integrations/supabase/client";

export const MB = 1024 * 1024;

export type SniffedType = "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf";

const EXT_BY_TYPE: Record<SniffedType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/** Detects the true content type from the leading bytes of the file. */
export async function sniffFileType(file: File): Promise<SniffedType | null> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const at = (i: number) => bytes[i] ?? -1;
  const ascii = (start: number, text: string) =>
    text.split("").every((c, i) => at(start + i) === c.charCodeAt(0));

  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (at(0) === 0x89 && ascii(1, "PNG")) return "image/png";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (ascii(0, "GIF8")) return "image/gif";
  if (ascii(0, "%PDF")) return "application/pdf";
  return null;
}

export type SecureUploadOptions = {
  bucket: string;
  /** Owner of the file — must be the signed-in user; becomes the first path segment. */
  userId: string;
  /** Optional extra path segment (e.g. a booking id). Sanitised before use. */
  scope?: string;
  /** Optional filename prefix (e.g. the document key). Sanitised before use. */
  prefix?: string;
  allowed: SniffedType[];
  maxBytes: number;
  minBytes?: number;
  upsert?: boolean;
};

export type SecureUploadResult = {
  path: string;
  contentType: SniffedType;
  size: number;
};

const safeSegment = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64);

export async function secureUpload(file: File, options: SecureUploadOptions): Promise<SecureUploadResult> {
  if (!options.userId) throw new Error("You must be signed in to upload files.");
  if (file.size > options.maxBytes) {
    throw new Error(`File is ${(file.size / MB).toFixed(1)} MB — the limit is ${(options.maxBytes / MB).toFixed(0)} MB.`);
  }
  if (options.minBytes && file.size < options.minBytes) {
    throw new Error("That file looks too small to be a real document.");
  }

  const contentType = await sniffFileType(file);
  if (!contentType || !options.allowed.includes(contentType)) {
    throw new Error(
      `Unsupported file. Allowed: ${options.allowed.map((t) => EXT_BY_TYPE[t].toUpperCase()).join(", ")}.`,
    );
  }

  const segments = [options.userId];
  if (options.scope) segments.push(safeSegment(options.scope));
  const name = `${options.prefix ? `${safeSegment(options.prefix)}-` : ""}${crypto.randomUUID()}.${EXT_BY_TYPE[contentType]}`;
  const path = `${segments.join("/")}/${name}`;

  const { error } = await supabase.storage.from(options.bucket).upload(path, file, {
    contentType,
    upsert: options.upsert ?? false,
  });
  if (error) throw new Error(error.message);

  return { path, contentType, size: file.size };
}
