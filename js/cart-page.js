import { getCart, saveCart } from './cart.js';
import { formatPrice } from './api.js';

function renderCart() {
  const cart = getCart();
  const container = document.getElementById('cart-content');

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="state">
        <h3 class="state__title">Ваша корзина пуста</h3>
        <p class="state__text">Самое время это исправить!</p>
        <a href="catalog.html" class="btn btn--primary btn--lg">Перейти в каталог</a>
      </div>`;
    return;
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  container.innerHTML = `
    <table class="cart-table">
      <thead>
        <tr>
          <th>Товар</th>
          <th>Цена</th>
          <th>Кол-во</th>
          <th>Сумма</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${cart.map(item => `
          <tr>
            <td>
              ${item.brand ? `<div class="cart-item__brand">${item.brand}</div>` : ''}
              <div class="cart-item__title">${item.name}</div>
            </td>
            <td>${formatPrice(item.price)}</td>
            <td>
              <div class="cart-qty">
                <button type="button" data-minus="${item.sku}">−</button>
                <span>${item.qty}</span>
                <button type="button" data-plus="${item.sku}">+</button>
              </div>
            </td>
            <td><strong>${formatPrice(item.price * item.qty)}</strong></td>
            <td><button class="cart-remove" data-remove="${item.sku}">Удалить</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="cart-summary">
      <div style="font-size: 16px; color: var(--c-text-soft);">Итого:</div>
      <div class="cart-total">${formatPrice(total)}</div>
      <a href="checkout.html" class="btn btn--cta btn--lg">Оформить заказ</a>
    </div>
  `;
}

document.addEventListener('click', (e) => {
  const cart = getCart();
  
  if (e.target.matches('[data-plus]')) {
    const sku = e.target.dataset.plus;
    const item = cart.find(i => i.sku === sku);
    if (item) { item.qty += 1; saveCart(cart); }
  }
  
  if (e.target.matches('[data-minus]')) {
    const sku = e.target.dataset.minus;
    const item = cart.find(i => i.sku === sku);
    if (item && item.qty > 1) { item.qty -= 1; saveCart(cart); }
  }
  
  if (e.target.matches('[data-remove]')) {
    const sku = e.target.dataset.remove;
    saveCart(cart.filter(i => i.sku !== sku));
  }
});

// Перерисовываем при любом изменении
document.addEventListener('cart:change', renderCart);

// Первый рендер
renderCart();