import api from './axiosInstance';

const data = (p) => p.then((r) => r.data);

// Sản phẩm — meta ít đổi nên cache 1 lần/phiên
let metaPromise;
export const getMeta = () => (metaPromise ??= data(api.get('/products/meta')).catch((e) => { metaPromise = null; throw e; }));
/** Trả về { items, page, size, totalItems, totalPages } */
export const searchProducts = (params) => data(api.get('/products', { params }));
export const getProduct = (id) => data(api.get(`/products/${id}`));
export const getBlockedDates = (id) => data(api.get(`/products/${id}/blocked-dates`));

// Trợ lý AI (dùng hồ sơ phong cách của người dùng)
/** chatId trống → mở cuộc chat mới. Trả về { chatId, result } */
export const stylistSearch = (prompt, chatId) => data(api.post('/stylist/search', { prompt, chatId }));
/** Trả về { items: [{ id, title, archived, updatedAt }], page, size, totalItems, totalPages } */
export const listChats = (params) => data(api.get('/stylist/chats', { params }));
export const getChat = (id) => data(api.get(`/stylist/chats/${id}`));
export const archiveChat = (id, archived) => data(api.patch(`/stylist/chats/${id}`, { archived }));
export const forYou = () => data(api.get('/stylist/for-you'));

// Người dùng
export const updateProfile = (body) => data(api.patch('/users/me', body));
export const becomeOwner = () => data(api.post('/users/me/become-owner'));
export const saveStyleProfile = (body) => data(api.put('/users/me/style-profile', body));

// Thuê / thanh toán
export const checkout = (body) => data(api.post('/bookings/checkout', body));
export const getCheckout = (code) => data(api.get(`/bookings/checkout/${code}`));
export const myBookings = () => data(api.get('/bookings/mine'));
export const cancelBooking = (id) => data(api.post(`/bookings/${id}/cancel`));
export const reviewBooking = (id, body) => data(api.post(`/bookings/${id}/review`, body));

// Chủ đồ
export const ownerProducts = () => data(api.get('/owner/products'));
export const createProduct = (body) => data(api.post('/owner/products', body));
export const updateProduct = (id, body) => data(api.put(`/owner/products/${id}`, body));
export const hideProduct = (id) => data(api.delete(`/owner/products/${id}`));
export const ownerBookings = () => data(api.get('/owner/bookings'));
export const ownerSetStatus = (id, body) => data(api.patch(`/owner/bookings/${id}/status`, body));
export const ownerStats = () => data(api.get('/owner/stats'));

// Admin
export const adminProducts = (status) => data(api.get('/admin/products', { params: { status } }));
export const adminReviewProduct = (id, body) => data(api.post(`/admin/products/${id}/review`, body));
export const adminBookings = (status) => data(api.get('/admin/bookings', { params: { status } }));
export const adminSetStatus = (id, body) => data(api.patch(`/admin/bookings/${id}/status`, body));
export const adminStats = () => data(api.get('/admin/stats'));
/** Admin đã chuyển khoản hoàn tiền thủ công; ref = mã giao dịch ngân hàng (tuỳ chọn). */
export const adminConfirmRefund = (id, ref) => data(api.post(`/admin/bookings/${id}/refund/confirm`, { ref }));

// Upload ảnh: xin URL có chữ ký → PUT thẳng lên R2 (ảnh không đi qua backend). Trả về URL public.
export const uploadImage = async (file) => {
  const { uploadUrl, publicUrl } = await data(api.post('/files/presign', { contentType: file.type, size: file.size }));
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!res.ok) throw new Error(`Upload R2 lỗi ${res.status}`);
  return publicUrl;
};

export const errorMessage = (err, fallback = 'Có lỗi xảy ra, thử lại nhé') => {
  const d = err?.response?.data;
  if (d?.errors) return Object.values(d.errors)[0];
  return d?.message || fallback;
};
