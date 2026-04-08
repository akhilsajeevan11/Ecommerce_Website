// Feature: admin-panel-redesign, Property 7: Valid form submission adds product to list
import fc from 'fast-check';

/**
 * Pure validation logic mirroring AdminAddProductPage.validate().
 * Returns an object of field → error message. Empty object = valid.
 */
const validate = (form) => {
  const errs = {};
  if (!form.name.trim()) errs.name = 'Name is required';
  if (!form.description.trim()) errs.description = 'Description is required';
  if (!form.category.trim()) errs.category = 'Category is required';

  const price = parseFloat(form.price);
  if (form.price === '' || form.price.trim() === '') {
    errs.price = 'Price is required';
  } else if (isNaN(price) || price <= 0) {
    errs.price = 'Price must be a positive number';
  }

  const stock = form.stock === '' || form.stock.trim() === '' ? NaN : Number(form.stock);
  if (form.stock === '' || form.stock.trim() === '') {
    errs.stock = 'Stock is required';
  } else if (!Number.isInteger(stock) || stock < 0) {
    errs.stock = 'Stock must be a non-negative integer';
  }

  return errs;
};

/**
 * Pure product builder mirroring AdminAddProductPage.handleSubmit().
 */
const buildProduct = (form) => ({
  id: Date.now().toString(),
  name: form.name.trim(),
  description: form.description.trim(),
  price: parseFloat(form.price),
  category: form.category.trim(),
  stock: parseInt(form.stock, 10),
  sizes: form.sizes ? form.sizes.split(',').map((s) => s.trim()).filter(Boolean) : [],
  colors: form.colors ? form.colors.split(',').map((c) => c.trim()).filter(Boolean) : [],
  images: form.images ? form.images.split(',').map((u) => u.trim()).filter(Boolean) : [],
});

/**
 * Simulates the add-product flow: validate → build → append to list.
 * Returns { products, added } where added is the new product or null if invalid.
 */
const addProduct = (existingProducts, form) => {
  const errs = validate(form);
  if (Object.keys(errs).length) return { products: existingProducts, added: null };
  const newProduct = buildProduct(form);
  return { products: [...existingProducts, newProduct], added: newProduct };
};

const CATEGORIES = ['T-Shirt', 'Hoodie', 'Jacket', 'Pants', 'Shirt', 'Sweater'];

const arbExistingProduct = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  category: fc.constantFrom(...CATEGORIES),
  stock: fc.nat({ max: 500 }),
  price: fc.integer({ min: 100, max: 99999 }),
});

const arbProductList = fc.array(arbExistingProduct, { minLength: 0, maxLength: 20 });

/** Generates a valid form: all required fields non-empty, price > 0, stock >= 0 */
const arbValidForm = fc.record({
  name: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
  description: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  price: fc.double({ min: 0.01, max: 99999, noNaN: true }).map((n) => n.toFixed(2)),
  category: fc.constantFrom(...CATEGORIES),
  sizes: fc.constantFrom('', 'S, M, L', 'XL'),
  colors: fc.constantFrom('', 'Black', 'Black, White'),
  images: fc.constantFrom('', 'https://example.com/img.jpg'),
  stock: fc.nat({ max: 500 }).map(String),
});

describe('Property 7: Valid form submission adds product to list', () => {
  it('adding a valid product increases list length by one', () => {
    fc.assert(
      fc.property(arbProductList, arbValidForm, (products, form) => {
        const { products: result } = addProduct(products, form);
        expect(result).toHaveLength(products.length + 1);
      }),
      { numRuns: 100 }
    );
  });

  it('new product name matches form input', () => {
    fc.assert(
      fc.property(arbProductList, arbValidForm, (products, form) => {
        const { added } = addProduct(products, form);
        expect(added).not.toBeNull();
        expect(added.name).toBe(form.name.trim());
      }),
      { numRuns: 100 }
    );
  });

  it('new product price matches parsed form price', () => {
    fc.assert(
      fc.property(arbProductList, arbValidForm, (products, form) => {
        const { added } = addProduct(products, form);
        expect(added).not.toBeNull();
        expect(added.price).toBeCloseTo(parseFloat(form.price), 2);
      }),
      { numRuns: 100 }
    );
  });

  it('new product stock matches parsed form stock', () => {
    fc.assert(
      fc.property(arbProductList, arbValidForm, (products, form) => {
        const { added } = addProduct(products, form);
        expect(added).not.toBeNull();
        expect(added.stock).toBe(parseInt(form.stock, 10));
      }),
      { numRuns: 100 }
    );
  });

  it('new product category matches form category', () => {
    fc.assert(
      fc.property(arbProductList, arbValidForm, (products, form) => {
        const { added } = addProduct(products, form);
        expect(added).not.toBeNull();
        expect(added.category).toBe(form.category.trim());
      }),
      { numRuns: 100 }
    );
  });

  it('existing products are preserved after adding', () => {
    fc.assert(
      fc.property(arbProductList, arbValidForm, (products, form) => {
        const { products: result } = addProduct(products, form);
        const existing = result.slice(0, products.length);
        expect(existing).toEqual(products);
      }),
      { numRuns: 100 }
    );
  });

  it('new product is the last element in the list', () => {
    fc.assert(
      fc.property(arbProductList, arbValidForm, (products, form) => {
        const { products: result, added } = addProduct(products, form);
        expect(result[result.length - 1]).toEqual(added);
      }),
      { numRuns: 100 }
    );
  });
});
