import { formatPrice } from './api.js';

const $ = (sel) => document.querySelector(sel);

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));

/* ============================================================
   Чтение идентификатора товара из URL
   ============================================================ */
function readProductKey() {
  const p = new URLSearchParams(window.location.search);
  const id = p.get('id');
  const sku = p.get('sku');
  if (id) return { id };
  if (sku) return { sku };
  return null;
}

/* ============================================================
   Загрузка товара из статического JSON
   ============================================================ */
async function loadProductFromStatic(key) {
  // Отключаем кеш, чтобы браузер всегда брал свежий JSON при разработке
  const res = await fetch('data/products.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('products.json недоступен');
  
  const packed = await res.json();
  const idx = { 
    id: packed.cols.indexOf('id'), 
    sku: packed.cols.indexOf('sku')
  };

  let row = null;
  if (key.id) row = packed.rows.find((r) => String(r[idx.id]) === String(key.id));
  if (!row && key.sku) row = packed.rows.find((r) => String(r[idx.sku]) === String(key.sku));
  
  if (!row) return null;

  const product = {};
  packed.cols.forEach((col, i) => { product[col] = row[i]; });
  return product;
}

/* ============================================================
   Рендер состояний
   ============================================================ */
function showLoading() {
  $('#product-loading').hidden = false;
  $('#product-page').hidden = true;
  $('#product-specs').hidden = true;
  $('#product-error').hidden = true;
}

function showError() {
  $('#product-loading').hidden = true;
  $('#product-page').hidden = true;
  $('#product-specs').hidden = true;
  $('#product-error').hidden = false;
}

function showProduct() {
  $('#product-loading').hidden = true;
  $('#product-page').hidden = false;
  $('#product-error').hidden = true; // Обязательно скрываем блок ошибки
}

/* ============================================================
   Отрисовка карточки
   ============================================================ */
function renderImage(product) {
  const wrap = $('#product-image');
  const letter = (product.name || '?').trim().charAt(0).toUpperCase();
  wrap.innerHTML = `<span class="product-image__ph" aria-hidden="true">${esc(letter)}</span>`;
}

function renderStock(product) {
  const el = $('#product-stock');
  const inStock = product.stock !== 0;
  el.textContent = inStock ? 'В наличии' : 'Нет в наличии';
  el.className = `product-stock ${inStock ? 'product-stock--in' : 'product-stock--out'}`;
  return inStock;
}

function renderAddButton(product, inStock) {
  const btn = $('#product-add');
  if (!inStock) {
    btn.disabled = true;
    btn.textContent = 'Нет в наличии';
    Object.keys(btn.dataset).forEach(key => delete btn.dataset[key]);
    return;
  }

  btn.disabled = false;
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.4 11.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 7H6"/></svg>
    В корзину`;

  btn.dataset.addToCart = '';
  btn.dataset.sku = product.sku;
  btn.dataset.name = product.name;
  btn.dataset.brand = product.brand || '';
  btn.dataset.price = String(product.price || 0);
  btn.dataset.unit = product.unit || 'шт';
}

function renderBreadcrumbs(product) {
  const el = $('#breadcrumb-current');
  if (el) el.textContent = product.name;

  const catLink = document.querySelector('#breadcrumbs a[href="catalog.html"]');
  if (catLink && product.category) {
    catLink.href = `catalog.html?category=${encodeURIComponent(product.category)}`;
  }
}

function renderSpecs(product) {
  const rows = [];

  if (product.brand) rows.push(['Бренд', product.brand]);
  if (product.category) rows.push(['Категория', product.category]);
  if (product.unit) rows.push(['Единица измерения', product.unit]);

  // Выводим характеристики из JSON
  if (product.specs && typeof product.specs === 'object') {
    for (const [key, value] of Object.entries(product.specs)) {
      if (value == null || value === '') continue;
      rows.push([key, String(value)]);
    }
  }

  if (!rows.length) {
    $('#product-specs').hidden = true;
    return;
  }

  const table = $('#specs-table');
  table.innerHTML = rows
    .map(
      ([label, value]) => `
      <div class="specs-table__row">
        <dt>${esc(label)}</dt>
        <dd>${esc(value)}</dd>
      </div>`
    )
    .join('');

  $('#product-specs').hidden = false;
}

function renderProduct(product) {
  document.title = `${product.name} — купить в «Улов 100 Пудов»`;
  
  renderBreadcrumbs(product);
  renderImage(product);

  $('#product-title').textContent = product.name;

  const brandEl = $('#product-brand');
  if (product.brand) {
    brandEl.hidden = false;
    brandEl.textContent = product.brand;
    brandEl.href = `catalog.html?brand=${encodeURIComponent(product.brand)}`;
  } else {
    brandEl.hidden = true;
  }

  $('#product-sku').textContent = product.sku ? `Артикул: ${product.sku}` : '';

  const inStock = renderStock(product);
  $('#product-price').textContent = formatPrice(product.price);
  $('#product-price-unit').textContent = `за ${product.unit || 'шт'}`;

  renderAddButton(product, inStock);
  renderSpecs(product);

  showProduct();
}

/* ============================================================
   Точка входа
   ============================================================ */
async function init() {
  const key = readProductKey();
  if (!key) {
    showError();
    return;
  }

  showLoading();

  try {
    const product = await loadProductFromStatic(key);
    if (!product) {
      showError();
      return;
    }
    renderProduct(product);
  } catch (error) {
    console.error('[product] error:', error);
    showError();
  }
}

init();