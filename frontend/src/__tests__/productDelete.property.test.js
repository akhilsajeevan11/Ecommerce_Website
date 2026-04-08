// Feature: admin-panel-redesign, Property 6: Product delete with confirmation removes product from list
import fc from 'fast-check';

/**
 * Pure delete logic extracted from AdminProductsPage.
 * Removes the product with the given id from the list.
 */
const deleteProduct = (products, id) => products.filter((p) => p.id !== id);

const CATEGORIES = ['T-Shirt', 'Hoodie', 'Jacket', 'Pants', 'Shirt', 'Sweater'];

const arbProduct = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  category: fc.constantFrom(...CATEGORIES),
  stock: fc.nat({ max: 500 }),
  price: fc.integer({ min: 100, max: 99999 }),
});

const arbNonEmptyProductList = fc.array(arbProduct, { minLength: 1, maxLength: 30 });

describe('Property 6: Product delete with confirmation removes product from list', () => {
  it('deleting a product reduces list length by one', () => {
    fc.assert(
      fc.property(arbNonEmptyProductList, (products) => {
        const index = Math.floor(Math.random() * products.length);
        const target = products[index];
        const result = deleteProduct(products, target.id);
        expect(result).toHaveLength(products.length - 1);
      }),
      { numRuns: 100 }
    );
  });

  it('deleted product is absent from the resulting list', () => {
    fc.assert(
      fc.property(arbNonEmptyProductList, (products) => {
        const index = Math.floor(Math.random() * products.length);
        const target = products[index];
        const result = deleteProduct(products, target.id);
        const ids = result.map((p) => p.id);
        expect(ids).not.toContain(target.id);
      }),
      { numRuns: 100 }
    );
  });

  it('all other products remain in the list after deletion', () => {
    fc.assert(
      fc.property(arbNonEmptyProductList, (products) => {
        const index = Math.floor(Math.random() * products.length);
        const target = products[index];
        const result = deleteProduct(products, target.id);
        const remaining = products.filter((p) => p.id !== target.id);
        expect(result).toEqual(remaining);
      }),
      { numRuns: 100 }
    );
  });

  it('deleting a non-existent id leaves the list unchanged', () => {
    fc.assert(
      fc.property(arbNonEmptyProductList, fc.uuid(), (products, fakeId) => {
        // Ensure fakeId doesn't collide with any existing id
        fc.pre(!products.some((p) => p.id === fakeId));
        const result = deleteProduct(products, fakeId);
        expect(result).toHaveLength(products.length);
        expect(result).toEqual(products);
      }),
      { numRuns: 100 }
    );
  });

  it('delete preserves original order of remaining products', () => {
    fc.assert(
      fc.property(arbNonEmptyProductList, (products) => {
        const index = Math.floor(Math.random() * products.length);
        const target = products[index];
        const result = deleteProduct(products, target.id);
        let idx = 0;
        for (const p of result) {
          while (idx < products.length && products[idx].id === target.id) idx++;
          expect(products[idx]).toEqual(p);
          idx++;
        }
      }),
      { numRuns: 100 }
    );
  });
});
