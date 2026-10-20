const STORAGE_KEY = 'ulov_cart_v1';

export function getCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter((i) => i && i.sku && i.qty > 0) : [];
  } catch {
    return [];
  }
}

export function saveCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  document.dispatchEvent(new CustomEvent('cart:change', { detail: items }));
}

export function addToCart(product, qty = 1) {
  const items = getCart();
  const existing = items.find((i) => i.sku === product.sku);

  if (existing) {
    existing.qty += qty;
  } else {
    items.push({
      sku: String(product.sku),
      name: product.name,
      brand: product.brand || '',
      price: Number(product.price) || 0,
      unit: product.unit || 'шт',
      image_url: product.image_url || null,
      qty,
    });
  }

  saveCart(items);
  return items;
}

export function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

export function cartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}