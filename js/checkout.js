import { getCart, saveCart } from './cart.js';
import { formatPrice } from './api.js';

/* ============================================================
   Отрисовка корзины в блоке "Ваш заказ"
   ============================================================ */
function renderSummary() {
  const cart = getCart();
  const container = document.getElementById('order-summary');
  const form = document.getElementById('checkout-form');
  
  if (!container || !form) return;

  if (!cart.length) {
    container.innerHTML = `
      <div class="state" style="padding: 0;">
        <p style="margin-bottom: 16px;">Корзина пуста.</p>
        <a href="catalog.html" class="btn btn--primary">Вернуться в каталог</a>
      </div>`;
    form.style.display = 'none';
    return;
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  container.innerHTML = `
    <div class="order-summary__title">Ваш заказ</div>
    ${cart.map(item => `
      <div class="order-summary__item">
        <span>${item.name} <strong>× ${item.qty}</strong></span>
        <span>${formatPrice(item.price * item.qty)}</span>
      </div>
    `).join('')}
    <div class="order-summary__total">
      <span>Итого:</span>
      <span>${formatPrice(total)}</span>
    </div>
  `;
}

/* ============================================================
   Отправка формы
   ============================================================ */
const form = document.getElementById('checkout-form');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    
    // Собираем данные формы через FormData
    const formData = new FormData(form);
    
    // Добавляем состав корзины и сумму
    const cart = getCart();
    const cartText = cart.map(i => `${i.name} (Арт: ${i.sku}) — ${i.qty} шт.`).join('\n');
    formData.append('Корзина', cartText);
    formData.append('Сумма', formatPrice(cart.reduce((s, i) => s + i.price * i.qty, 0)));

    btn.textContent = 'Отправка...';
    btn.disabled = true;

    try {
      const ENDPOINT = 'https://onsubmit.dev/f/hoc6edux'; 
      
      // Отправляем как FormData (без заголовка Content-Type)
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        body: formData
      });
      
      // Проверяем только HTTP-статус (200-299 = успех)
      if (res.ok) {
        saveCart([]); // Очищаем корзину
        document.querySelector('.checkout-layout').innerHTML = `
          <div class="state" style="grid-column: 1 / -1; background: #fff;">
            <h3 class="state__title" style="color: var(--c-success); font-size: 24px;">Заказ успешно отправлен!</h3>
            <p class="state__text" style="max-width: 500px;">Мы получили ваш заказ и свяжемся с вами в ближайшее время для подтверждения деталей.</p>
            <a href="index.html" class="btn btn--primary btn--lg" style="margin-top: 16px;">На главную</a>
          </div>
        `;
      } else {
        // Если сервер вернул ошибку, показываем её
        const errorText = await res.text();
        throw new Error(`Ошибка сервера: ${res.status}. ${errorText}`);
      }
    } catch (error) {
      console.error('Order error:', error);
      alert(`Ошибка при отправке: ${error.message}. Пожалуйста, позвоните нам: +7 959 163-50-00`);
      btn.textContent = 'Отправить заказ';
      btn.disabled = false;
    }
  });
}

/* ============================================================
   Логика переключения поля "Адрес доставки"
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const deliveryRadios = document.querySelectorAll('input[name="delivery"]');
  const addressGroup = document.getElementById('address-group');
  const addressInput = document.getElementById('address');

  if (!deliveryRadios.length || !addressGroup || !addressInput) return;

  deliveryRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'Доставка') {
        addressGroup.hidden = false;
        addressInput.required = true;
      } else {
        addressGroup.hidden = true;
        addressInput.required = false;
        addressInput.value = '';
      }
    });
  });
});

// Первый рендер корзины
renderSummary();