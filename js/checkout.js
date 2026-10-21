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
    const formData = new FormData(form);
    
    // Собираем данные из формы в объект для JSON
    const data = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      delivery: formData.get('delivery'),
      address: formData.get('address') || '—',
      comment: formData.get('comment') || '—',
    };

    // Добавляем состав корзины
    const cart = getCart();
    const cartText = cart.map(i => `${i.name} (Арт: ${i.sku}) — ${i.qty} шт.`).join('\n');
    data['Корзина'] = cartText;
    data['Сумма'] = formatPrice(cart.reduce((s, i) => s + i.price * i.qty, 0));

    btn.textContent = 'Отправка...';
    btn.disabled = true;

    try {
      // Ваш уникальный Endpoint с onsubmit.dev
      const ENDPOINT = 'https://onsubmit.dev/f/hoc6edux'; 
      
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await res.json();
      
      if (result.ok) {
        saveCart([]); // Очищаем корзину
        document.querySelector('.checkout-layout').innerHTML = `
          <div class="state" style="grid-column: 1 / -1; background: #fff;">
            <h3 class="state__title" style="color: var(--c-success); font-size: 24px;">Заказ успешно отправлен!</h3>
            <p class="state__text" style="max-width: 500px;">Мы получили ваш заказ и свяжемся с вами в ближайшее время для подтверждения деталей.</p>
            <a href="index.html" class="btn btn--primary btn--lg" style="margin-top: 16px;">На главную</a>
          </div>
        `;
      } else {
        throw new Error(result.error || 'Ошибка отправки');
      }
    } catch (error) {
      console.error('Order error:', error);
      alert('Ошибка при отправке заказа. Пожалуйста, позвоните нам: +7 959 163-50-00');
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