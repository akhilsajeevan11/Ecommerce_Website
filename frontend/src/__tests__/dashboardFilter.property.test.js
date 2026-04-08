// Feature: admin-panel-redesign, Property 5: Dashboard filters correctly restrict displayed data
import fc from 'fast-check';
import { getStockStatus } from '../utils/stockStatus';

/**
 * Pure filter logic extracted from AdminDashboardPage.
 * Composes category + stock status filters with AND logic.
 */
const filterProducts = (products, categoryFilter, stockStatusFilter) => {
  return products.filter((product) => {
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = stockStatusFilter === 'all' || getStockStatus(product.stock).label === stockStatusFilter;
    return matchesCategory && matchesStatus;
  });
};

const CATEGORIES = ['T-Shirt', 'Hoodie', 'Jacket', 'Pants', 'Shirt', 'Sweater'];
const STOCK_STATUSES = ['IN STOCK', 'LOW STOCK', 'OUT OF STOCK'];

const arbProduct = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  category: fc.constantFrom(...CATEGORIES),
  stock: fc.nat({ max: 500 }),
  price: fc.integer({ min: 100, max: 99999 }),
});

const arbProductList = fc.array(arbProduct, { minLength: 0, maxLength: 30 });
const arbCategoryFilter = fc.constantFrom('all', ...CATEGORIES);
const arbStockStatusFilter = fc.constantFrom('all', ...STOCK_STATUSES);

describe('Property 5: Dashboard filters correctly restrict displayed data', () => {
  it('filtered output contains exactly products matching both criteria', () => {
    fc.assert(
      fc.property(arbProductList, arbCategoryFilter, arbStockStatusFilter, (products, catFilter, statusFilter) => {
        const result = filterProducts(products, catFilter, statusFilter);

        // Every returned product must match both filters
        for (const p of result) {
          if (catFilter !== 'all') {
            expect(p.category).toBe(catFilter);
          }
          if (statusFilter !== 'all') {
            expect(getStockStatus(p.stock).label).toBe(statusFilter);
          }
        }

        // Every product matching both filters must be in the result
        const expected = products.filter((p) => {
          const matchCat = catFilter === 'all' || p.category === catFilter;
          const matchStatus = statusFilter === 'all' || getStockStatus(p.stock).label === statusFilter;
          return matchCat && matchStatus;
        });
        expect(result).toHaveLength(expected.length);
      }),
      { numRuns: 100 }
    );
  });

  it('clearing both filters returns the full unfiltered dataset', () => {
    fc.assert(
      fc.property(arbProductList, (products) => {
        const result = filterProducts(products, 'all', 'all');
        expect(result).toHaveLength(products.length);
        expect(result).toEqual(products);
      }),
      { numRuns: 100 }
    );
  });

  it('category-only filter returns exactly products in that category', () => {
    fc.assert(
      fc.property(arbProductList, fc.constantFrom(...CATEGORIES), (products, category) => {
        const result = filterProducts(products, category, 'all');
        const expected = products.filter((p) => p.category === category);
        expect(result).toEqual(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('stock-status-only filter returns exactly products with that status', () => {
    fc.assert(
      fc.property(arbProductList, fc.constantFrom(...STOCK_STATUSES), (products, status) => {
        const result = filterProducts(products, 'all', status);
        const expected = products.filter((p) => getStockStatus(p.stock).label === status);
        expect(result).toEqual(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('filter result is always a subset of the original list (preserves order)', () => {
    fc.assert(
      fc.property(arbProductList, arbCategoryFilter, arbStockStatusFilter, (products, catFilter, statusFilter) => {
        const result = filterProducts(products, catFilter, statusFilter);
        let idx = 0;
        for (const p of result) {
          while (idx < products.length && products[idx] !== p) idx++;
          expect(idx).toBeLessThan(products.length);
          idx++;
        }
      }),
      { numRuns: 100 }
    );
  });
});
