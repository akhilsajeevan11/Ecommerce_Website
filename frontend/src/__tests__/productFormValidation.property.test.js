// Feature: admin-panel-redesign, Property 8: Empty required fields produce validation errors
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

describe('Property 8: Empty required fields produce validation errors', () => {
  it('returns errors for exactly the emptied required fields and no others', () => {
    fc.assert(
      fc.property(
        fc.subarray(REQUIRED_FIELDS, { minLength: 1 }),
        (emptyFields) => {
          const form = validForm();
          emptyFields.forEach(f => { form[f] = ''; });

          const errors = validateProductForm(form);
          const errorKeys = Object.keys(errors);

          // Every emptied field must have an error
          emptyFields.forEach(f => {
            expect(errors[f]).toBeDefined();
          });

          // No non-emptied required field should have an error
          const keptFields = REQUIRED_FIELDS.filter(f => !emptyFields.includes(f));
          keptFields.forEach(f => {
            expect(errors[f]).toBeUndefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns no errors when all required fields are filled with valid data', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          barcode_id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          price: fc.float({ min: Math.fround(0.01), noNaN: true, noDefaultInfinity: true }).map(String),
          stock: fc.nat({ max: 100000 }).map(String),
          category: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          description: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          sizes: fc.constant(''),
          colors: fc.constant(''),
          story: fc.constant(''),
        }),
        (form) => {
          const errors = validateProductForm(form);
          REQUIRED_FIELDS.forEach(f => {
            expect(errors[f]).toBeUndefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('whitespace-only required fields produce errors for exactly those fields', () => {
    fc.assert(
      fc.property(
        fc.subarray(REQUIRED_FIELDS, { minLength: 1 }),
        fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 5 }),
        (emptyFields, whitespace) => {
          const form = validForm();
          emptyFields.forEach(f => { form[f] = whitespace; });

          const errors = validateProductForm(form);

          // Whitespace-only fields must produce errors
          emptyFields.forEach(f => {
            expect(errors[f]).toBeDefined();
          });

          // Non-emptied required fields must not have errors
          const keptFields = REQUIRED_FIELDS.filter(f => !emptyFields.includes(f));
          keptFields.forEach(f => {
            expect(errors[f]).toBeUndefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
