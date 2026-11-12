export function reconcileCash(received: number, commission: number, counted: number | null) {
  return { net: Math.round((received - commission) * 100) / 100, difference: counted === null ? null : Math.round((counted - received) * 100) / 100 };
}