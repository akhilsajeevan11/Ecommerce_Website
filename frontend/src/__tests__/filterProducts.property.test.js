// Feature: admin-dashboard, Property 7: Product search filtering
import fc from 'fast-check';
import { filterProducts } from '../utils/filterProducts';

const productArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  category: fc.string({ minLength: 1, maxLength: 20 }),
  stock: fc.nat({ max: 10000 }),
  price: fc.float({ min: Math.fround(0.01), max: Math.fround(9999), noNaN: true }),
});

const productListArb = fc.array(productArb, { minLength: 0, maxLength: 30 });

describe('Property 7: Product search filtering', () => {
  it('returns all products when query is empty', () => {
    fc.assert(
      fc.property(productListArb, (products) => {
        expect(filterProducts(products, '')).toEqual(products);
      }),
      { numRuns: 20 }
    );
  });

  it('every returned product matches the query in name or category (case-insensitive)', () => {
    fc.assert(
      fc.property(productListArb, fc.string({ minLength: 1, maxLength: 10 }), (products, query) => {
        const results = filterProducts(products, query);
        const q = query.toLowerCase();
        results.forEach((p) => {
          const matches =
            p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
          expect(matches).toBe(true);
        });
      }),
      { numRuns: 20 }
    );
  });

  it('contains all matching products from the original list', () => {
    fc.assert(
      fc.property(productListArb, fc.string({ minLength: 1, maxLength: 10 }), (products, query) => {
        const results = filterProducts(products, query);
        const q = query.toLowerCase();
        const expected = products.filter(
          (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
        );
        expect(results).toEqual(expected);
      }),
      { numRuns: 20 }
    );
  });

  it('filtered result is a subset of the original list (preserves order)', () => {
    fc.assert(
      fc.property(productListArb, fc.string({ minLength: 1, maxLength: 10 }), (products, query) => {
        const results = filterProducts(products, query);
        let idx = 0;
        for (const p of products) {
          if (idx < results.length && p === results[idx]) {
            idx++;
          }
        }
        expect(idx).toBe(results.length);
      }),
      { numRuns: 20 }
    );
  });

  it('filtering is case-insensitive', () => {
    fc.assert(
      fc.property(productListArb, fc.string({ minLength: 1, maxLength: 10 }), (products, query) => {
        const lower = filterProducts(products, query.toLowerCase());
        const upper = filterProducts(products, query.toUpperCase());
        expect(lower).toEqual(upper);
      }),
      { numRuns: 20 }
    );
  });
});
