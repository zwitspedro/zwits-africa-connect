import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDirectPaymentDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ bookingId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: accounts, error } = await context.supabase.rpc("booking_direct_accounts", { _booking_id: data.bookingId });
    if (error) throw new Error(error.message);
    const { data: receipt, error: receiptError } = await context.supabase.from("booking_direct_receipts")
      .select("method, account_snapshot, confirmed_at").eq("booking_id", data.bookingId).maybeSingle();
    if (receiptError) throw new Error(receiptError.message);
    return { accounts, receipt };
  });

export const chooseDirectPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ bookingId: z.string().uuid(), method: z.enum(["cash", "direct_ecocash", "direct_bank"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("choose_booking_direct_payment", { _booking_id: data.bookingId, _method: data.method });
    if (error) throw new Error(error.message);
    return result;
  });