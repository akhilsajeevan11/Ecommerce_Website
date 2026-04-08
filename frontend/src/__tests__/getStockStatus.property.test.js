// Feature: admin-dashboard, Property 6: Stock status classification
import fc from 'fast-check';
import { getStockStatus } from '../utils/stockStatus';

describe('Property 6: Stock status classification', () => {
  it('returns "OUT OF STOCK" when stock is exactly 0', () => {
    const result = getStockStatus(0);
    expect(result.label).toBe('OUT OF STOCK');
    expect(result.className).toBe('bg-red-100 text-red-800');
  });

  it('returns "LOW STOCK" for any stock between 1 and 9 inclusive', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 9 }), (stock) => {
        const result = getStockStatus(stock);
        expect(result.label).toBe('LOW STOCK');
        expect(result.className).toBe('bg-amber-100 text-amber-800');
      }),
      { numRuns: 20 }
    );
  });

  it('returns "IN STOCK" for any stock >= 10', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 1_000_000 }), (stock) => {
        const result = getStockStatus(stock);
        expect(result.label).toBe('IN STOCK');
        expect(result.className).toBe('bg-zinc-100 text-zinc-800');
      }),
      { numRuns: 20 }
    );
  });

  it('classifies any non-negative integer into exactly one of the three statuses', () => {
    const validLabels = new Set(['OUT OF STOCK', 'LOW STOCK', 'IN STOCK']);

    fc.assert(
      fc.property(fc.nat({ max: 10_000 }), (stock) => {
        const result = getStockStatus(stock);
        expect(validLabels.has(result.label)).toBe(true);

        if (stock === 0) expect(result.label).toBe('OUT OF STOCK');
        else if (stock < 10) expect(result.label).toBe('LOW STOCK');
        else expect(result.label).toBe('IN STOCK');
      }),
      { numRuns: 20 }
    );
  });
});
