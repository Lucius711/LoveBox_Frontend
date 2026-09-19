import api from './axiosInstance';
export const getCart        = ()                      => api.get('/cart');
export const addCartItem    = (payload)               => api.post('/cart/items', payload);
export const updateCartItem = (cartItemId, quantity)  => api.patch(`/cart/items/${cartItemId}`, { quantity });
export const removeCartItem = (cartItemId)            => api.delete(`/cart/items/${cartItemId}`);
