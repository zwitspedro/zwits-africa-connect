import { expect, it } from "vitest";
import { validateReviewDocument } from "./provider-review-rules";
it("accepts a 10 MB ID PDF", () => expect(() => validateReviewDocument("id_document_url",10485760,"application/pdf")).not.toThrow());
it("rejects uploads above 10 MB", () => expect(() => validateReviewDocument("id_document_url",10485761,"image/jpeg")).toThrow());
it("rejects documents below 20 KB", () => expect(() => validateReviewDocument("id_document_url",20479,"image/jpeg")).toThrow());
it("requires a selfie image rather than PDF", () => expect(() => validateReviewDocument("selfie_url",30000,"application/pdf")).toThrow());
it("rejects HTML uploads", () => expect(() => validateReviewDocument("business_doc_url",30000,"text/html")).toThrow());