export function getStockMeta(stock = 0) {
  if (stock <= 0) {
    return { label: 'نفد', className: 'border-red-100 bg-red-50 text-red-700' };
  }
  if (stock < 10) {
    return { label: `منخفض ${stock}`, className: 'border-amber-100 bg-amber-50 text-amber-700' };
  }
  return { label: `متوفر ${stock}`, className: 'border-emerald-100 bg-emerald-50 text-emerald-700' };
}
