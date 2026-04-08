const REQUIRED_FIELDS = ['name', 'barcode_id', 'price', 'stock', 'category', 'description'];

/**
 * Validates the Add Product form state.
 * Returns an object mapping field names to error messages.
 * An empty object means the form is valid.
 */
export function validateProductForm(form) {
  const errs = {};
  REQUIRED_FIELDS.forEach(f => {
    if (!form[f]?.trim()) errs[f] = 'This field is required';
  });
  if (form.price && (isNaN(Number(form.price)) || Number(form.price) < 0))
    errs.price = 'Must be a valid positive number';
  if (form.stock && (isNaN(Number(form.stock)) || Number(form.stock) < 0 || !Number.isInteger(Number(form.stock))))
    errs.stock = 'Must be a valid non-negative integer';
  return errs;
}

export { REQUIRED_FIELDS };
