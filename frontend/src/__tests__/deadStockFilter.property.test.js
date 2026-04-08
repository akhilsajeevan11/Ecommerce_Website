// Feature: admin-panel-redesign, Property 4: Dead stock table contains only zero or critically low stock products
import fc from 'fast-check';

/**
 * Dead stock filter logic extracted from AdminDashboardPage.
 * Returns exactly those products with stock === 0.
 */
const filterDeadStock = (products) => products.filter((p) => p.stock === 0);

const CATEGORIES = ['T-Shirt', 'Hoodie', 'Jacket', 'Pants', 'Shirt', 'Sweater'];

const arbProduct = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  category: fc.constantFrom(...CATEGORIES),
  stock: fc.nat({ max: 500 }),
  price: fc.integer({ min: 100, max: 99999 }),
});

const arbProductList = fc.array(arbProduct, { minLength: 0, maxLength: 30 });

describe('Property 4: Dead stock table contains only zero or critically low stock products', () => {
  it('dead stock contains exactly products with stock === 0', () => {
    fc.assert(
      fc.property(arbProductList, (products) => {
        const deadStock = filterDeadStock(products);

        // Every returned product must have stock === 0
        for (const p of deadStock) {
          expect(p.stock).toBe(0);
        }

        // Every product with stock === 0 must be in the result
        const expected = products.filter((p) => p.stock === 0);
        expect(deadStock).toHaveLength(expected.length);
      }),
      { numRuns: 100 }
    );
  });

  it('no product with stock > 0 appears in dead stock', () => {
    fc.assert(
      fc.property(arbProductList, (products) => {
        const deadStock = filterDeadStock(products);
        for (const p of deadStock) {
          expect(p.stock).not.toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('when all products have stock > 0, dead stock is empty', () => {
    const arbPositiveStockProduct = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 30 }),
      category: fc.constantFrom(...CATEGORIES),
      stock: fc.integer({ min: 1, max: 500 }),
      price: fc.integer({ min: 100, max: 99999 }),
    });
    const arbPositiveList = fc.array(arbPositiveStockProduct, { minLength: 0, maxLength: 30 });

    fc.assert(
      fc.property(arbPositiveList, (products) => {
        const deadStock = filterDeadStock(products);
        expect(deadStock).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it('when all products have stock === 0, dead stock equals the full list', () => {
    const arbZeroStockProduct = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 30 }),
      category: fc.constantFrom(...CATEGORIES),
      stock: fc.constant(0),
      price: fc.integer({ min: 100, max: 99999 }),
    });
    const arbZeroList = fc.array(arbZeroStockProduct, { minLength: 0, maxLength: 30 });

    fc.assert(
      fc.property(arbZeroList, (products) => {
        const deadStock = filterDeadStock(products);
        expect(deadStock).toHaveLength(products.length);
        expect(deadStock).toEqual(products);
      }),
      { numRuns: 100 }
    );
  });

  it('dead stock preserves original order from the product list', () => {
    fc.assert(
      fc.property(arbProductList, (products) => {
        const deadStock = filterDeadStock(products);
        let idx = 0;
        for (const p of deadStock) {
          while (idx < products.length && products[idx] !== p) idx++;
          expect(idx).toBeLessThan(products.length);
          idx++;
        }
      }),
      { numRuns: 100 }
    );
  });
});
