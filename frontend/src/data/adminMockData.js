/* ── Shared mock data for admin panel (remove when backend is ready) ── */

export const USE_MOCK = true; // Set to false when backend is ready

export const MOCK_PRODUCTS = [
  { id: '1', name: 'Classic Black Tee', category: 'T-Shirt', stock: 100, price: 2999.00 },
  { id: '2', name: 'Minimalist Hoodie', category: 'Hoodie', stock: 45, price: 6999.00 },
  { id: '3', name: 'Structured Blazer', category: 'Jacket', stock: 12, price: 14999.00 },
  { id: '4', name: 'Wide Leg Trousers', category: 'Pants', stock: 8, price: 7999.00 },
  { id: '5', name: 'Oversized Shirt', category: 'Shirt', stock: 0, price: 4999.00 },
  { id: '6', name: 'Knit Sweater', category: 'Sweater', stock: 67, price: 8999.00 },
];

export const MOCK_CATEGORIES = [
  { category: 'T-Shirt', total_stock: 100 },
  { category: 'Hoodie', total_stock: 45 },
  { category: 'Jacket', total_stock: 12 },
  { category: 'Pants', total_stock: 8 },
  { category: 'Shirt', total_stock: 0 },
  { category: 'Sweater', total_stock: 67 },
];

export const MOCK_SUMMARY = {
  total_stock: 232,
  total_products: 6,
  dead_stock_count: 1,
  out_of_stock_count: 1,
};

export const MOCK_DEAD_STOCK = [
  { id: '5', name: 'Oversized Shirt', category: 'Shirt', stock: 0, price: 4999.00 },
];
