// Feature: admin-dashboard, Property 9: Form validation for required fields
import fc from 'fast-check';
import { validateProductForm, REQUIRED_FIELDS } from '../utils/validateProductForm';

const validForm = () => ({
  name: 'Test Product',
  barcode_id: 'SKU-001',
  price: '29.99',
  stock: '10',
  category: 'T-Shirt',
  description: 'A nice product',
  sizes: '',
  colors: '',
  story: '',
});

describe('Property 9: Form validation for required fields', () => {
  it('returns no errors when all required fields are valid', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          barcode_id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          price: fc.float({ min: 0, noNaN: true, noDefaultInfinity: true }).map(String),
          stock: fc.nat({ max: 100000 }).map(String),
          category: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          description: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          sizes: fc.constant(''),
          colors: fc.constant(''),
          story: fc.constant(''),
        }),
        (form) => {
          const errors = validateProductForm(form);
          expect(Object.keys(errors)).toHaveLength(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('returns an error for every required field that is empty', () => {
    fc.assert(
      fc.property(
        fc.subarray(REQUIRED_FIELDS, { minLength: 1 }),
        (emptyFields) => {
          const form = validForm();
          emptyFields.forEach(f => { form[f] = ''; });

          const errors = validateProductForm(form);

          emptyFields.forEach(f => {
            expect(errors[f]).toBeDefined();
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  it('returns an error for required fields that are only whitespace', () => {
    fc.assert(
      fc.property(
        fc.subarray(REQUIRED_FIELDS, { minLength: 1 }),
        fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 5 }),
        (emptyFields, whitespace) => {
          const form = validForm();
          emptyFields.forEach(f => { form[f] = whitespace; });

          const errors = validateProductForm(form);

          emptyFields.forEach(f => {
            expect(errors[f]).toBeDefined();
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  it('returns a price error for negative prices', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-1e6), max: Math.fround(-0.01), noNaN: true, noDefaultInfinity: true }),
        (price) => {
          const form = validForm();
          form.price = String(price);
          const errors = validateProductForm(form);
          expect(errors.price).toBe('Must be a valid positive number');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('returns a stock error for non-integer stock values', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true, noDefaultInfinity: true }).filter(n => !Number.isInteger(n)),
        (stock) => {
          const form = validForm();
          form.stock = String(stock);
          const errors = validateProductForm(form);
          expect(errors.stock).toBe('Must be a valid non-negative integer');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('returns a stock error for negative stock values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100000, max: -1 }),
        (stock) => {
          const form = validForm();
          form.stock = String(stock);
          const errors = validateProductForm(form);
          expect(errors.stock).toBe('Must be a valid non-negative integer');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('non-required fields being empty never causes errors', () => {
    const nonRequired = ['sizes', 'colors', 'story'];
    fc.assert(
      fc.property(
        fc.subarray(nonRequired, { minLength: 1 }),
        (emptyFields) => {
          const form = validForm();
          emptyFields.forEach(f => { form[f] = ''; });

          const errors = validateProductForm(form);
          emptyFields.forEach(f => {
            expect(errors[f]).toBeUndefined();
          });
        }
      ),
      { numRuns: 20 }
    );
  });
});
