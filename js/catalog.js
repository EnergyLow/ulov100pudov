import { formatPrice } from './api.js';

const $ = (sel) => document.querySelector(sel);

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));

const state = {
  category: 'all',
  q: '',
  minPrice: '',
  maxPrice: '',
  sort: 'popular',
  page: 1,
  limit: 12,
};

/* Плоский список товаров после загрузки */
let allProducts = null;
let metaData = null;

/* ============================================================
   Загрузка данных (один раз за сессию)
   ============================================================ */
async function ensureData() {
  if (allProducts && metaData) return { allProducts, metaData };

  const [prodRes, metaRes] = await Promise.all([
    fetch('data/products.json', { cache: 'force-cache' }),
    fetch('data/meta.json', { cache: 'force-cache' }),
  ]);
  if (!prodRes.ok || !metaRes.ok) throw new Error('Не удалось загрузить данные');

  const packed = await prodRes.json();
  metaData = await metaRes.json();

  allProducts = packed.rows.map((row) => {
    const obj = {};
    packed.cols.forEach((col, i) => { obj[col] = row[i]; });
    // предвычислим lowercase для быстрого поиска
    obj._search = `${obj.name} ${obj.brand || ''} ${obj.sku}`.toLowerCase();
    return obj;
  });

  return { allProducts, metaData };
}

/* ============================================================
   URL <-> state
   ============================================================ */
function readStateFromUrl() {
  const p = new URLSearchParams(window.location.search);
  state.category = p.get('category') || 'all';
  state.q = (p.get('q') || '').trim();
  state.minPrice = p.get('minPrice') || '';
  state.maxPrice = p.get('maxPrice') || '';
  state.sort = p.get('sort') || 'popular';
  state.page = Math.max(1, Number(p.get('page')) || 1);
}

function writeStateToUrl() {
  const p = new URLSearchParams();
  if (state.category !== 'all') p.set('category', state.category);
  if (state.q) p.set('q', state.q);
  if (state.minPrice) p.set('minPrice', state.minPrice);
  if (state.maxPrice) p.set('maxPrice', state.maxPrice);
  if (state.sort !== 'popular') p.set('sort', state.sort);
  if (state.page > 1) p.set('page', String(state.page));
  const qs = p.toString();
  window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
}

/* ============================================================
   Фильтрация / сортировка / пагинация
   ============================================================ */
function filterProducts() {
  const minKop = state.minPrice ? Math.round(Number(state.minPrice) * 100) : 0;
  const maxKop = state.maxPrice ? Math.round(Number(state.maxPrice) * 100) : Infinity;
  const needle = state.q.trim().toLowerCase();

  return allProducts.filter((p) => {
    if (state.category !== 'all' && p.category !== state.category) return false;
    if (p.price < minKop || p.price > maxKop) return false;
    if (needle && !p._search.includes(needle)) return false;
    return true;
  });
}

function sortProducts(list) {
  const comparators = {
    popular:    (a, b) => (b.is_popular - a.is_popular) || (b.id - a.id),
    new:        (a, b) => b.id - a.id,
    price_asc:  (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    name:       (a, b) => a.name.localeCompare(b.name, 'ru'),
  };
  return [...list].sort(comparators[state.sort] || comparators.popular);
}

/* ============================================================
   Рендер
   ============================================================ */
function syncFormFromState() {
  const form = $('#filters-form');
  if (!form) return;
  form.elements.q.value = state.q;
  form.elements.minPrice.value = state.minPrice;
  form.elements.maxPrice.value = state.maxPrice;
  $('#sort-select').value = state.sort;
  const radio = form.querySelector(
    `input[name="category"][value="${CSS.escape(state.category)}"]`
  );
  if (radio) radio.checked = true;
}

function renderCategories(categories) {
  const list = $('#filter-categories');
  const items = [{ category: 'all', count: null }, ...categories];
  list.innerHTML = items.map(({ category, count }) => `
    <li class="filter-list__item">
      <label class="filter-radio">
        <input type="radio" name="category" value="${esc(category)}"
          ${state.category === category ? 'checked' : ''}>
        <span class="filter-radio__label">${esc(category === 'all' ? 'Все категории' : category)}</span>
        ${count != null ? `<span class="filter-radio__count">${count}</span>` : ''}
      </label>
    </li>`).join('');
}

function productCardTemplate(product) {
  const url = `product.html?id=${encodeURIComponent(product.id)}`;
  const letter = (product.name || '?').trim().charAt(0).toUpperCase();
  const media = `<span class="product-card__ph" aria-hidden="true">${esc(letter)}</span>`;

  const button = product.stock !== 0
    ? `<button class="btn btn--cta btn--sm" type="button"
               data-add-to-cart
               data-sku="${esc(product.sku)}"
               data-name="${esc(product.name)}"
               data-brand="${esc(product.brand || '')}"
               data-price="${Number(product.price) || 0}"
               data-unit="${esc(product.unit || 'шт')}"
               data-image="">В корзину</button>`
    : `<button class="btn btn--outline btn--sm" type="button" disabled>Нет в наличии</button>`;

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
          ${button}
        </div>
      </div>
    </article>`;
}

function renderEmpty() {
  $('#catalog-grid').innerHTML = `
    <div class="state">
      <h3 class="state__title">Ничего не найдено</h3>
      <p class="state__text">Попробуйте изменить фильтры или сбросить их.</p>
      <button type="button" class="btn btn--outline" id="empty-reset">Сбросить фильтры</button>
    </div>`;
}

function renderActiveFilters() {
  const wrap = $('#active-filters');
  const chips = [];
  if (state.category !== 'all') chips.push({ type: 'category', label: state.category });
  if (state.q) chips.push({ type: 'q', label: `Поиск: ${state.q}` });
  if (state.minPrice) chips.push({ type: 'minPrice', label: `от ${state.minPrice} ₽` });
  if (state.maxPrice) chips.push({ type: 'maxPrice', label: `до ${state.maxPrice} ₽` });

  if (!chips.length) { wrap.hidden = true; wrap.innerHTML = ''; return; }
  wrap.hidden = false;
  wrap.innerHTML =
    chips.map((c) => `
      <button type="button" class="filter-chip" data-remove-filter="${c.type}">
        <span>${esc(c.label)}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>`).join('') +
    `<button type="button" class="filter-chip filter-chip--clear" data-remove-filter="all">Сбросить всё</button>`;
}

function renderPagination(page, pages) {
  const el = $('#pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }
  const visible = new Set([1, pages]);
  for (let i = page - 1; i <= page + 1; i++) if (i >= 1 && i <= pages) visible.add(i);
  const list = [...visible].sort((a, b) => a - b);

  const parts = [];
  let prev = 0;
  for (const p of list) {
    if (p - prev > 1) parts.push('<span class="pagination__ellipsis">…</span>');
    parts.push(`<button type="button" class="pagination__btn ${p === page ? 'is-active' : ''}"
                       data-page="${p}" ${p === page ? 'aria-current="page"' : ''}>${p}</button>`);
    prev = p;
  }
  el.innerHTML = `
    <button type="button" class="pagination__btn pagination__btn--nav"
            data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Предыдущая">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    ${parts.join('')}
    <button type="button" class="pagination__btn pagination__btn--nav"
            data-page="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Следующая">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>`;
}

/* ============================================================
   Основной сценарий рендера
   ============================================================ */
function renderCatalog() {
  const filtered = filterProducts();
  const sorted = sortProducts(filtered);
  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / state.limit));
  const page = Math.min(state.page, pages);
  const start = (page - 1) * state.limit;
  const visible = sorted.slice(start, start + state.limit);

  $('#result-count').textContent = total === 0
    ? 'Ничего не найдено'
    : `Найдено ${total} ${plural(total, ['товар', 'товара', 'товаров'])}`;

  if (!visible.length) renderEmpty();
  else $('#catalog-grid').innerHTML = visible.map(productCardTemplate).join('');

  renderActiveFilters();
  renderPagination(page, pages);
  state.page = page;
}

function plural(n, forms) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

/* ============================================================
   События
   ============================================================ */
function applyAndRender() {
  writeStateToUrl();
  renderCatalog();
}

function resetAll() {
  Object.assign(state, { category: 'all', q: '', minPrice: '', maxPrice: '', page: 1 });
  syncFormFromState();
  applyAndRender();
}

function bindEvents() {
  const form = $('#filters-form');

  form.addEventListener('change', (event) => {
    if (event.target.name === 'category') {
      state.category = event.target.value;
      state.page = 1;
      applyAndRender();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    state.q = form.elements.q.value.trim();
    state.minPrice = form.elements.minPrice.value.trim();
    state.maxPrice = form.elements.maxPrice.value.trim();
    state.page = 1;
    applyAndRender();
    closeMobileFilters();
  });

  $('#filters-reset').addEventListener('click', (event) => {
    event.preventDefault();
    resetAll();
  });

  $('#sort-select').addEventListener('change', (event) => {
    state.sort = event.target.value;
    state.page = 1;
    applyAndRender();
  });

  $('#pagination').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    const page = Number(btn.dataset.page);
    if (!Number.isFinite(page) || page < 1) return;
    state.page = page;
    applyAndRender();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-remove-filter]');
    if (chip) {
      const type = chip.dataset.removeFilter;
      if (type === 'all') resetAll();
      else {
        if (type === 'category') state.category = 'all';
        if (type === 'q') state.q = '';
        if (type === 'minPrice') state.minPrice = '';
        if (type === 'maxPrice') state.maxPrice = '';
        state.page = 1;
        syncFormFromState();
        applyAndRender();
      }
      return;
    }
    if (event.target.closest('#empty-reset')) resetAll();
  });

  // Мобильная панель фильтров
  const toggle = $('#filters-toggle');
  const panel = $('#filters-panel');
  const backdrop = $('#filters-backdrop');
  if (toggle && panel && backdrop) {
    toggle.addEventListener('click', openMobileFilters);
    backdrop.addEventListener('click', closeMobileFilters);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileFilters(); });
  }

  function openMobileFilters() {
    panel.classList.add('is-open');
    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeMobileFilters() {
    panel.classList.remove('is-open');
    backdrop.hidden = true;
    document.body.style.overflow = '';
  }
  window.__closeMobileFilters = closeMobileFilters;
}

/* ============================================================
   Старт
   ============================================================ */
async function init() {
  readStateFromUrl();
  bindEvents();

  $('#catalog-grid').innerHTML = Array.from({ length: 8 })
    .map(() => '<div class="skeleton skeleton-card"></div>').join('');
  $('#result-count').textContent = 'Загрузка…';

  try {
    const { allProducts: products, metaData: meta } = await ensureData();
    renderCategories(meta.categories);

    const form = $('#filters-form');
    form.elements.minPrice.placeholder = `от ${Math.floor(meta.priceRange.min / 100)}`;
    form.elements.maxPrice.placeholder = `до ${Math.ceil(meta.priceRange.max / 100)}`;

    syncFormFromState();
    renderCatalog();
  } catch (error) {
    console.error('[catalog] error:', error);
    $('#result-count').textContent = 'Ошибка загрузки';
    $('#catalog-grid').innerHTML = `
      <div class="state">
        <h3 class="state__title">Не удалось загрузить каталог</h3>
        <p class="state__text">Обновите страницу через минуту.</p>
      </div>`;
  }
}

init();