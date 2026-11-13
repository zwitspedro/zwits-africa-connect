/** Canonical private upload path shared by evidence signing and regression checks. */
export function isDeliveryProofPath(path: string, driverId: string, deliveryId: string): boolean {
  const prefix = `${driverId}/${deliveryId}/`;
  return path.startsWith(prefix) && /^delivery-proof-[0-9a-f-]+\.(jpg|png|webp)$/.test(path.slice(prefix.length));
}