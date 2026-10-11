import { describe, expect, it } from 'vitest';
import { decimalKey, headerRow, itemRows, productRows, receiptRows, tuple } from './receivingDatabase';
import { filterList } from './receivingQueries';

describe('Receiving source normalization', () => {
  it('keeps list aliases, nulls and dates while excluding nested items from header storage', () => {
    const row = headerRow({ orderId: 'T1', orderExternalId: '001', orderStatusId: 'ORDER_APPROVED', orderDate: '1000', currencyUom: null, items: [{ productId: 'P1' }] }, 1);
    expect(row).toMatchObject({ orderId: 'T1', externalId: '001', statusId: 'ORDER_APPROVED', orderDate: 1000, currencyUom: null });
    expect(row.raw).not.toHaveProperty('items');
  });

  it('keeps line identity stable when a ship group changes and rejects duplicate lines', () => {
    const item = { orderItemSeqId: '01', productId: 'P1', orderFacilityId: 'B', statusId: 'ITEM_APPROVED', quantity: '1.5', totalIssuedQuantity: 0, totalReceivedQuantity: null };
    const [before] = itemRows({ orderId: 'T1', items: [{ ...item, shipGroupSeqId: '01' }] }, 1);
    const [after] = itemRows({ orderId: 'T1', items: [{ ...item, shipGroupSeqId: '02' }] }, 2);
    expect(before.itemKey).toBe(after.itemKey);
    expect(before).toMatchObject({ quantity: 1.5, totalIssuedQuantity: 0, totalReceivedQuantity: null });
    expect(() => itemRows({ orderId: 'T1', items: [item, item] }, 1)).toThrow('Duplicate');
    expect(tuple('a|b', 'c')).not.toBe(tuple('a', 'b|c'));
  });

  it('prefers the canonical product, retains all identifiers and preserves leading zeros/slashes', () => {
    const { products, identifications } = productRows([
      { productId: 'P1', 'docType-identifier': 'PRODUCT_OLD-P1', productName: 'Old' },
      { productId: 'P1', 'docType-identifier': 'PRODUCT-P1', productName: 'Current', parentProductName: 'Parent', goodIdentifications: ['UPCA/00123', 'UPCA/00456', 'SKU/A/B'] },
    ], 42);
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({ productName: 'Current', parentProductName: 'Parent', updatedAt: 42 });
    expect(identifications.filter(row => row.identKey === 'UPCA').map(row => row.value)).toEqual(['00123', '00456']);
    expect(identifications.find(row => row.identKey === 'SKU')?.value).toBe('A/B');
  });

  it('keys receipt aggregates by the group, keeping accepted quantity out of the key', () => {
    const base = { orderId: 'T1', orderItemSeqId: '01', productId: 'P1', datetimeReceived: 1000, quantityRejected: '0.00', quantity: '2.500', receivedByUserLoginId: 'receiver' };
    const [first] = receiptRows([{ ...base, quantityAccepted: 1 }], 'T1', true, 1);
    const [second] = receiptRows([{ ...base, quantityAccepted: 2, quantityRejected: 0, quantity: 2.5 }], 'T1', true, 1);
    expect(first.receiptGroupKey).toBe(second.receiptGroupKey);
    expect(() => receiptRows([{ ...base, orderId: 'T2' }], 'T1', true, 1)).toThrow('another transfer');
    expect(decimalKey('001.2300e-2')).toBe('0.0123');
    expect(decimalKey('-0.000')).toBe('0');
  });

  it('uses a deterministic duplicate winner and withholds conflicting noncanonical scan codes', () => {
    const older = { productId: 'P1', 'docType-identifier': 'A-P1', productName: 'A', goodIdentifications: ['UPCA/001'] };
    const newer = { productId: 'P1', 'docType-identifier': 'Z-P1', productName: 'Z', goodIdentifications: ['UPCA/002'] };
    const forward = productRows([older, newer], 1);
    const reverse = productRows([newer, older], 1);
    expect(forward.products).toEqual(reverse.products);
    expect(forward.products[0]).toMatchObject({ productName: 'A', identifierConflict: true, canonicalDocument: false });
    expect(forward.identifications).toEqual([]);
    const canonical = productRows([older, { ...newer, 'docType-identifier': 'PRODUCT-P1' }], 1);
    expect(canonical.products[0]).toMatchObject({ canonicalDocument: true, identifierConflict: true });
    expect(canonical.identifications.filter(row => row.identKey === 'UPCA').map(row => row.value)).toEqual(['002']);
  });

  it('applies every search term before paginating', () => {
    const corpus = { rows: Array.from({ length: 50 }, (_, i) => ({ order: { orderId: `T${i}` }, search: i > 40 ? 'blue shirt 00123' : 'red skirt' })), sync: undefined };
    expect(filterList(corpus, 'BLUE 00123', 3)).toMatchObject({ total: 9, list: [{ orderId: 'T41' }, { orderId: 'T42' }, { orderId: 'T43' }] });
  });
});
