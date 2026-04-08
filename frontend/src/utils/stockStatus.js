/**
 * Classifies a product's stock level into a status label and CSS class.
 * @param {number} stock - The current stock quantity
 * @returns {{ label: string, className: string }}
 */
export const getStockStatus = (stock) => {
  if (stock === 0) return { label: 'OUT OF STOCK', className: 'bg-red-100 text-red-800' };
  if (stock < 10) return { label: 'LOW STOCK', className: 'bg-amber-100 text-amber-800' };
  return { label: 'IN STOCK', className: 'bg-zinc-100 text-zinc-800' };
};
