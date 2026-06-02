/**
 * Pure display formatters used across the storefront.
 *
 * Currency is fixed to INR (₹) — NOIR is an India-first brand. The locale is
 * `en-IN` so the lakh/crore grouping (1,23,456) appears for large totals.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/design.md  (formatters)
 */

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formats a numeric amount as Indian Rupees with the ₹ symbol.
 * Returns an em-dash placeholder for nullish/non-finite input so callers do not
 * have to branch when the value is still loading.
 *
 * @param {number|string|null|undefined} value
 * @param {{ minimumFractionDigits?: number, maximumFractionDigits?: number }} [opts]
 * @returns {string}
 */
export function formatPrice(value, opts) {
  const num = typeof value === 'string' ? Number(value) : value;
  if (num === null || num === undefined || !Number.isFinite(num)) return '—';

  if (opts && (opts.minimumFractionDigits !== undefined || opts.maximumFractionDigits !== undefined)) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: opts.minimumFractionDigits ?? 0,
      maximumFractionDigits: opts.maximumFractionDigits ?? 2,
    }).format(num);
  }

  return INR_FORMATTER.format(num);
}

const DEFAULT_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

/**
 * Formats a date-ish input (Date, ISO string, or epoch ms) to a human-readable
 * Indian-locale date. Returns an em-dash placeholder for nullish/invalid input.
 *
 * @param {Date|string|number|null|undefined} value
 * @param {Intl.DateTimeFormatOptions} [opts]
 * @returns {string}
 */
export function formatDate(value, opts) {
  if (value === null || value === undefined || value === '') return '—';

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  if (opts) {
    return new Intl.DateTimeFormat('en-IN', opts).format(d);
  }
  return DEFAULT_DATE_FORMATTER.format(d);
}
