/** Копейки -> «3 100 ₽» */
export function formatPrice(kopecks) {
  const rub = (Number(kopecks) || 0) / 100;
  const isInt = Math.abs(rub - Math.round(rub)) < 0.005;
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: isInt ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rub) + ' ₽';
}