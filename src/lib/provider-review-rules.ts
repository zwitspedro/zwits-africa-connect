export const REVIEW_DOC_KEYS = ["id_document_url", "selfie_url", "business_doc_url"] as const;
export type ReviewDocKey = typeof REVIEW_DOC_KEYS[number];
export function validateReviewDocument(key: ReviewDocKey, size: number, mime: string) {
  if (size < 20480 || size > 10485760) throw new Error("Choose a document between 20 KB and 10 MB.");
  const allowed = key === "selfie_url" ? ["image/jpeg", "image/png", "image/webp"] : ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(mime)) throw new Error("Choose a JPG, PNG, WEBP or permitted PDF document.");
}