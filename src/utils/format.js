export const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

// 'YYYY-MM-DD' <-> Date theo giờ địa phương (tránh lệch múi giờ của new Date('YYYY-MM-DD'))
export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayISO = () => toISO(new Date());
export const addDaysISO = (s, n) => { const d = fromISO(s); d.setDate(d.getDate() + n); return toISO(d); };

export const formatDate = (s) => (s ? fromISO(String(s).slice(0, 10)).toLocaleDateString('vi-VN') : '');

/** Thuê 10/10 → 12/10 = 3 ngày (tính cả 2 đầu) — giống RentalRules.days ở backend */
export const rentalDays = (start, end) =>
  start && end ? Math.round((fromISO(end) - fromISO(start)) / 86400000) + 1 : 0;

/** Món thanh lý (bán đứt) — sản phẩm có listingType, đơn có kind. */
export const isSale = (x) => x?.listingType === 'SALE' || x?.kind === 'SALE';

/** Tiền 1 món trong giỏ: đồ thanh lý = giá bán; đồ thuê = giá/ngày × số ngày. */
export const itemAmount = (i) => (i.sale ? i.salePrice : i.rentPricePerDay * rentalDays(i.startDate, i.endDate));

/** Tiền đồ = Σ itemAmount; cọc = Σ cọc đồ thuê (phí ship cộng ở checkout). */
export const cartTotals = (items) => ({
  rent: items.reduce((s, i) => s + itemAmount(i), 0),
  deposit: items.reduce((s, i) => s + (i.sale ? 0 : i.deposit), 0),
});

/** Nén ảnh trước khi upload: thu về ≤1200px, WebP 80% (ảnh 5MB → ~150KB). */
export function compressImage(file, maxSide = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      canvas.toBlob((b) => (b ? resolve(new File([b], 'photo.webp', { type: 'image/webp' })) : reject(new Error('compress'))),
        'image/webp', quality);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
