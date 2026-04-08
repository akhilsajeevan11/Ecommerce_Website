/**
 * Sort a list of products by a given column and direction.
 *
 * @param {Array<Object>} products - The product list to sort.
 * @param {string} column - The key to sort by (name, category, stock, price).
 * @param {'asc'|'desc'} direction - Sort direction.
 * @returns {Array<Object>} A new sorted array.
 */
export function sortProducts(products, column, direction) {
  return [...products].sort((a, b) => {
    const aVal = a[column];
    const bVal = b[column];
    const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
    return direction === 'asc' ? cmp : -cmp;
  });
}
