import { describe, expect, it } from 'vitest';
import { isDeliveryProofPath } from './delivery-proof';

describe('delivery-specific private proof', () => {
  const driver = '11111111-1111-4111-8111-111111111111';
  const delivery = '22222222-2222-4222-8222-222222222222';
  const photo = 'delivery-proof-33333333-3333-4333-8333-333333333333.jpg';
  it('rejects missing proof', () => expect(isDeliveryProofPath('', driver, delivery)).toBe(false));
  it('rejects another delivery', () => expect(isDeliveryProofPath(`${driver}/another/${photo}`, driver, delivery)).toBe(false));
  it('rejects a previous delivery', () => expect(isDeliveryProofPath(`${driver}/previous/${photo}`, driver, delivery)).toBe(false));
  it('accepts the correct delivery path', () => expect(isDeliveryProofPath(`${driver}/${delivery}/${photo}`, driver, delivery)).toBe(true));
  it('rejects another driver', () => expect(isDeliveryProofPath(`other/${delivery}/${photo}`, driver, delivery)).toBe(false));
  it('rejects traversal and URLs', () => {
    expect(isDeliveryProofPath(`${driver}/${delivery}/../${photo}`, driver, delivery)).toBe(false);
    expect(isDeliveryProofPath(`https://example.com/${driver}/${delivery}/${photo}`, driver, delivery)).toBe(false);
  });
});