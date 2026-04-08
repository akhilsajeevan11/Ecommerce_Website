/**
 * Filters products by name or category matching a search query (case-insensitive).
 * @param {Array<{ name: string, category: string }>} products
 * @param {string} query
 * @returns {Array<{ name: string, category: string }>}
 */
export const filterProducts = (products, query) => {
  if (!query) return products;
  const q = query.toLowerCase();
  return products.filter(
    (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );
};
