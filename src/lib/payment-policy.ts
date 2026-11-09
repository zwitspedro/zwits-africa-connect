import { z } from "zod";

/** Keep input types compatible with existing callers while rejecting inactive rails. */
export const activePaymentMethodSchema = z.enum([
  "cash", "ecocash", "innbucks", "zipit", "mukuru", "bank_transfer", "onemoney", "card",
]).refine((method) => method === "cash", "Only cash on completion is available.");