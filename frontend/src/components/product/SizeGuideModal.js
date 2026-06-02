import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { cn } from '../../lib/utils';

/**
 * SizeGuideModal — Product_Detail_Page modal that displays a static size
 * chart keyed by `product.category`.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 8.8)
 *   .kiro/specs/storefront-experience-redesign/design.md       (SizeGuideModal)
 *
 * The chart data is intentionally static and bundled with the component:
 *   - There is no admin UI for size charts in this spec.
 *   - The dataset is small enough (a handful of rows per category) that a
 *     network round-trip would degrade UX without buying anything.
 *   - A future spec can move this to a CMS-backed key without changing the
 *     call site.
 *
 * Category keys are matched case-insensitively against `product.category`.
 * When no chart matches the supplied category, falls back to the `default`
 * (apparel) chart so the modal still renders something useful instead of a
 * blank panel.
 *
 * a11y posture:
 *   - Built on Radix Dialog which provides `role="dialog"`,
 *     `aria-modal="true"`, focus trap, and Escape-to-close.
 *   - The table uses real `<th scope="col">` headers so screen-readers
 *     announce column meaning when navigating cells.
 *   - The modal title carries `<DialogTitle>` and a description for
 *     screen-readers.
 *
 * Styling: Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {string|null|undefined} [props.category]
 * @param {string} [props.className]
 */

// Static charts. Sizes are inclusive ranges in cm. Kept brand-agnostic so the
// table reads naturally for any apparel category.
const SIZE_CHARTS = {
  default: {
    label: 'Apparel',
    columns: ['Size', 'Chest (cm)', 'Waist (cm)', 'Length (cm)'],
    rows: [
      ['XS', '86–91', '71–76', '66'],
      ['S', '91–97', '76–81', '68'],
      ['M', '97–102', '81–86', '70'],
      ['L', '102–107', '86–91', '72'],
      ['XL', '107–112', '91–97', '74'],
      ['XXL', '112–117', '97–102', '76'],
    ],
    note: 'Measurements taken with the garment laid flat. Allow 2–3 cm tolerance.',
  },
  hoodie: {
    label: 'Hoodie',
    columns: ['Size', 'Chest (cm)', 'Length (cm)', 'Sleeve (cm)'],
    rows: [
      ['XS', '92', '66', '60'],
      ['S', '98', '68', '62'],
      ['M', '104', '70', '64'],
      ['L', '110', '72', '66'],
      ['XL', '116', '74', '68'],
      ['XXL', '122', '76', '70'],
    ],
    note: 'Oversized fit — for a body-skimming silhouette, size down.',
  },
  't-shirt': {
    label: 'T-Shirt',
    columns: ['Size', 'Chest (cm)', 'Length (cm)', 'Shoulder (cm)'],
    rows: [
      ['XS', '88', '64', '40'],
      ['S', '94', '66', '42'],
      ['M', '100', '68', '44'],
      ['L', '106', '70', '46'],
      ['XL', '112', '72', '48'],
      ['XXL', '118', '74', '50'],
    ],
    note: 'Regular fit. Chest measured 2 cm below the armhole.',
  },
  pants: {
    label: 'Pants',
    columns: ['Size', 'Waist (cm)', 'Inseam (cm)', 'Hip (cm)'],
    rows: [
      ['28', '71', '78', '92'],
      ['30', '76', '78', '97'],
      ['32', '81', '80', '102'],
      ['34', '86', '80', '107'],
      ['36', '91', '82', '112'],
      ['38', '97', '82', '117'],
    ],
    note: 'Sized by waist. Inseam fixed within each block.',
  },
  jacket: {
    label: 'Jacket',
    columns: ['Size', 'Chest (cm)', 'Length (cm)', 'Sleeve (cm)'],
    rows: [
      ['XS', '94', '68', '62'],
      ['S', '100', '70', '64'],
      ['M', '106', '72', '66'],
      ['L', '112', '74', '68'],
      ['XL', '118', '76', '70'],
      ['XXL', '124', '78', '72'],
    ],
    note: 'Outer-layer cut — leaves room for a hoodie or sweater underneath.',
  },
  shoes: {
    label: 'Shoes',
    columns: ['UK', 'EU', 'US (M)', 'CM'],
    rows: [
      ['6', '40', '7', '25.0'],
      ['7', '41', '8', '25.5'],
      ['8', '42', '9', '26.5'],
      ['9', '43', '10', '27.5'],
      ['10', '44', '11', '28.5'],
      ['11', '45', '12', '29.5'],
    ],
    note: 'For half-sizes, size up to the next whole number.',
  },
};

/**
 * Resolve a chart for the given category. Matching is case-insensitive and
 * also tolerates plural forms (Hoodie / Hoodies). Returns the default chart
 * when nothing matches so callers always have something to render.
 */
function resolveChart(category) {
  if (typeof category !== 'string' || category.trim() === '') {
    return SIZE_CHARTS.default;
  }
  const key = category.trim().toLowerCase().replace(/s$/, '');
  return SIZE_CHARTS[key] || SIZE_CHARTS.default;
}

function SizeGuideModal({ open, onOpenChange, category, className }) {
  const chart = resolveChart(category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="size-guide-modal"
        className={cn(
          'max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto rounded-none border border-border bg-background p-0 sm:rounded-none',
          className
        )}
      >
        <DialogHeader className="border-b border-border px-6 py-4 text-left sm:text-left">
          <DialogTitle className="font-heading text-2xl font-bold text-foreground">
            Size Guide
          </DialogTitle>
          <DialogDescription className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {chart.label}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          <div className="overflow-x-auto">
            <table
              data-testid="size-guide-table"
              className="w-full border-collapse font-mono text-sm text-foreground"
            >
              <thead>
                <tr className="border-b border-border">
                  {chart.columns.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="px-3 py-2 text-left text-[0.6875rem] uppercase tracking-[0.15em] text-muted-foreground"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.rows.map((row, rowIdx) => (
                  <tr key={`row-${rowIdx}`} className="border-b border-border last:border-b-0">
                    {row.map((cell, cellIdx) => (
                      <td
                        key={`cell-${rowIdx}-${cellIdx}`}
                        className={cn(
                          'px-3 py-2 text-sm',
                          cellIdx === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {chart.note ? (
            <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground">
              {chart.note}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { SizeGuideModal, SIZE_CHARTS, resolveChart };
export default SizeGuideModal;
