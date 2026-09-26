export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  PRODUCTS: '/products',
  PRODUCT: (id) => `/products/${id}`,
  ABOUT: '/about',
  CART: '/cart',
  CHECKOUT: '/checkout',
  ACCOUNT: '/account',
  PROFILE: '/account?tab=profile',
  ONBOARDING: '/onboarding',
  NEW_PRODUCT: '/owner/products/new',
  EDIT_PRODUCT: (id) => `/owner/products/${id}/edit`,
  ADMIN: '/admin',
};

export const EXPRESS_FEE = 30000; // khớp RentalRules.EXPRESS_FEE ở backend

// Các bước hiển thị cho khách: Chờ xác nhận → Đang giao → Đang thuê → Đã trả đồ → Đã hoàn cọc
export const BOOKING_STATUS = {
  PENDING: { label: 'Chờ xác nhận', tone: 'bg-amber-100 text-amber-800' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'bg-sky-100 text-sky-800' },
  SHIPPING: { label: 'Đang giao', tone: 'bg-sky-100 text-sky-800' },
  RENTED: { label: 'Đang thuê', tone: 'bg-violet-100 text-violet-800' },
  RETURNED: { label: 'Đã trả đồ', tone: 'bg-teal-100 text-teal-800' },
  COMPLETED: { label: 'Đã hoàn cọc', tone: 'bg-emerald-100 text-emerald-800' },
  DISPUTED: { label: 'Tranh chấp', tone: 'bg-rose-100 text-rose-800' },
  CANCELLED: { label: 'Đã huỷ', tone: 'bg-stone-200 text-stone-600' },
};
export const TIMELINE = ['PENDING', 'SHIPPING', 'RENTED', 'RETURNED', 'COMPLETED'];

export const PRODUCT_STATUS = {
  PENDING: { label: 'Chờ duyệt', tone: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: 'Đang hiển thị', tone: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Bị từ chối', tone: 'bg-rose-100 text-rose-800' },
  HIDDEN: { label: 'Đã ẩn', tone: 'bg-stone-200 text-stone-600' },
};

export const DEPOSIT_STATUS = { PENDING: 'Chưa thu', HELD: 'Đang giữ cọc', REFUNDED: 'Đã hoàn cọc', FORFEITED: 'Mất cọc' };
export const PAYMENT_STATUS = { UNPAID: 'Chưa thanh toán', PAID: 'Đã thanh toán', REFUNDED: 'Đã hoàn tiền' };
