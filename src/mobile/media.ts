/**
 * Media upload module — camera/gallery capture that reuses the platform's
 * secure upload pipeline (magic-byte sniffing, size caps, user-rooted paths).
 */
import { secureUpload, MB, type SniffedType } from "@/lib/secure-upload";
import { nativeOnly, isNative } from "./platform";
import { requireOnline } from "./offline";

export type CaptureSource = "camera" | "gallery";

export const IMAGE_TYPES: SniffedType[] = ["image/jpeg", "image/png", "image/webp"];
export const DOC_TYPES: SniffedType[] = [...IMAGE_TYPES, "application/pdf"];
export const MAX_UPLOAD_BYTES = 8 * MB;

/** Captures a photo on device, or opens the file picker on web. */
export async function capturePhoto(source: CaptureSource = "camera"): Promise<File | null> {
  const mod = await nativeOnly(() => import("@capacitor/camera"));

  if (mod) {
    const photo = await mod.Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: mod.CameraResultType.Uri,
      source: source === "camera" ? mod.CameraSource.Camera : mod.CameraSource.Photos,
      width: 1600,
      correctOrientation: true,
    });
    if (!photo.webPath) return null;
    const blob = await (await fetch(photo.webPath)).blob();
    return new File([blob], `capture.${photo.format || "jpg"}`, { type: blob.type || "image/jpeg" });
  }

  if (typeof document === "undefined") return null;
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") input.capture = "environment";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Captures and uploads in one step; returns the stored object path. */
export async function captureAndUpload(opts: {
  bucket: string;
  userId: string;
  scope?: string;
  prefix?: string;
  source?: CaptureSource;
  allowed?: SniffedType[];
}) {
  await requireOnline("Uploading a photo");
  const file = await capturePhoto(opts.source ?? "camera");
  if (!file) return null;
  return secureUpload(file, {
    bucket: opts.bucket,
    userId: opts.userId,
    scope: opts.scope,
    prefix: opts.prefix,
    allowed: opts.allowed ?? IMAGE_TYPES,
    maxBytes: MAX_UPLOAD_BYTES,
  });
}

export function supportsNativeCamera() {
  return isNative();
}
