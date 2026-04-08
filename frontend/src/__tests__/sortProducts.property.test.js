// Feature: admin-dashboard, Property 8: Table column sorting
import fc from 'fast-check';
import { sortProducts } from '../utils/sortProducts';

const productArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  category: fc.string({ minLength: 1, maxLength: 20 }),
  stock: fc.nat({ max: 10000 }),
  price: fc.float({ min: Math.fround(0.01), max: Math.fround(9999), noNaN: true }),
});

const productListArb = fc.array(productArb, { minLength: 0, maxLength: 30 });

const stringColumns = ['name', 'category'];
const numericColumns = ['stock', 'price'];
const allColumns = [...stringColumns, ...numericColumns];

describe('Property 8: Table column sorting', () => {
  it.each(allColumns)(
    'ascending sort by "%s" produces non-decreasing order',
    (column) => {
      fc.assert(
        fc.property(productListArb, (products) => {
          const sorted = sortProducts(products, column, 'asc');
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1][column];
            const curr = sorted[i][column];
            if (typeof prev === 'string') {
              expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
            } else {
              expect(prev).toBeLessThanOrEqual(curr);
            }
          }
        }),
        { numRuns: 20 }
      );
    }
  );

  it.each(allColumns)(
    'descending sort by "%s" produces non-increasing order',
    (column) => {
      fc.assert(
        fc.property(productListArb, (products) => {
          const sorted = sortProducts(products, column, 'desc');
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1][column];
            const curr = sorted[i][column];
            if (typeof prev === 'string') {
              expect(prev.localeCompare(curr)).toBeGreaterThanOrEqual(0);
            } else {
              expect(prev).toBeGreaterThanOrEqual(curr);
            }
          }
        }),
        { numRuns: 20 }
      );
    }
  );

  it('sorting preserves all elements (no items lost or duplicated)', () => {
    fc.assert(
      fc.property(
        productListArb,
        fc.constantFrom(...allColumns),
        fc.constantFrom('asc', 'desc'),
        (products, column, direction) => {
          const sorted = sortProducts(products, column, direction);
          expect(sorted).toHaveLength(products.length);
          // Every original product appears in sorted output
          const sortedIds = sorted.map((p) => p.id);
          const originalIds = products.map((p) => p.id);
          expect(sortedIds.sort()).toEqual(originalIds.sort());
        }
      ),
      { numRuns: 20 }
    );
  });

  it('sorting does not mutate the original array', () => {
    fc.assert(
      fc.property(
        productListArb,
        fc.constantFrom(...allColumns),
        fc.constantFrom('asc', 'desc'),
        (products, column, direction) => {
          const copy = [...products];
          sortProducts(products, column, direction);
          expect(products).toEqual(copy);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('sorting an empty list returns an empty list', () => {
    for (const col of allColumns) {
      expect(sortProducts([], col, 'asc')).toEqual([]);
      expect(sortProducts([], col, 'desc')).toEqual([]);
    }
  });
});
