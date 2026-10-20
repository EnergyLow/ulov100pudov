import { formatPrice } from './api.js';
import { addToCart, cartCount } from './cart.js';

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));

/* ---------------- Бургер-меню ---------------- */
function initBurger() {
  const burger = document.querySelector('[data-burger]');
  const nav = document.getElementById('nav');
  if (!burger || !nav) return;
  burger.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(isOpen));
  });
  nav.addEventListener('click', (event) => {
    if (event.target.closest('.nav__link')) {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ---------------- Бейдж корзины ---------------- */
function updateCartBadge() {
  const count = cartCount();
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = count > 99 ? '99+' : String(count);
    el.dataset.empty = count === 0 ? 'true' : 'false';
  });
}

/* ---------------- Тост ---------------- */
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

/* ---------------- Карточка товара ---------------- */
function productCardTemplate(product) {
  const url = `product.html?id=${encodeURIComponent(product.id)}`;
  const media = `<span class="product-card__ph" aria-hidden="true">${esc((product.name || '?').trim().charAt(0).toUpperCase())}</span>`;

  return `
    <article class="product-card">
      <a class="product-card__media" href="${url}" aria-label="${esc(product.name)}">${media}</a>
      <div class="product-card__body">
        ${product.brand ? `<span class="product-card__brand">${esc(product.brand)}</span>` : ''}
        <h3 class="product-card__title"><a href="${url}">${esc(product.name)}</a></h3>
        <div class="product-card__foot">
          <span class="product-card__price">
            ${formatPrice(product.price)}
            <span class="product-card__unit">за ${esc(product.unit || 'шт')}</span>
          </span>
          <button class="btn btn--cta btn--sm" type="button" data-add-to-cart
                  data-sku="${esc(product.sku)}" data-name="${esc(product.name)}"
                  data-brand="${esc(product.brand || '')}" data-price="${Number(product.price) || 0}"
                  data-unit="${esc(product.unit || 'шт')}" data-image="">В корзину</button>
        </div>
      </div>
    </article>`;
}

/* ---------------- Популярные товары ---------------- */
async function initPopularProducts() {
  const grid = document.getElementById('popular-grid');
  if (!grid) return;

  grid.innerHTML = Array.from({ length: 8 }).map(() => '<div class="skeleton skeleton-card"></div>').join('');

  try {
    const res = await fetch('data/popular.json', { cache: 'force-cache' });
    if (!res.ok) throw new Error('Ошибка загрузки');
    const products = await res.json();
    if (products.length) {
      grid.innerHTML = products.slice(0, 8).map(productCardTemplate).join('');
    } else {
      grid.innerHTML = '<div class="state"><p class="state__text">Популярные товары скоро появятся.</p></div>';
    }
  } catch (error) {
    console.warn('[popular] ошибка:', error);
    grid.innerHTML = '<div class="state"><p class="state__text">Не удалось загрузить товары.</p></div>';
  }
}

/* ---------------- Добавление в корзину ---------------- */
function initAddToCart() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-to-cart]');
    if (!button) return;

    addToCart({
      sku: button.dataset.sku,
      name: button.dataset.name,
      brand: button.dataset.brand,
      price: Number(button.dataset.price) || 0,
      unit: button.dataset.unit,
      image_url: button.dataset.image || null,
    });
    showToast('Товар добавлен в корзину');
  });

  document.addEventListener('cart:change', updateCartBadge);
  window.addEventListener('storage', (event) => {
    if (event.key === 'ulov_cart_v1') updateCartBadge();
  });
}

/* ---------------- Старт ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  initBurger();
  initAddToCart();
  updateCartBadge();
  initPopularProducts();
  document.querySelectorAll('[data-current-year]').forEach(el => el.textContent = String(new Date().getFullYear()));
});