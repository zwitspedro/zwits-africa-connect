type Rate = { percent: number; min_fee: number; max_fee?: number | null };
export function estimateCommission(price: number, rate?: Rate) {
  if (!rate) return 0;
  const percent = Math.round(price * Number(rate.percent)) / 100;
  return Math.min(price, Math.max(0, Math.min(rate.max_fee ?? price, Math.max(percent, Number(rate.min_fee)))));
}