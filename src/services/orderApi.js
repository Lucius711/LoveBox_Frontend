import api from './axiosInstance';
export const createOrder   = (payload)                  => api.post('/orders', payload);
export const getOrder      = (orderId)                  => api.get(`/orders/${orderId}`);
export const getOrders     = ()                         => api.get('/orders');
export const initPayment   = (orderId)                  => api.post(`/orders/${orderId}/payment/init`);
export const uploadReceipt = (orderId, receiptImageUrl) =>
  api.post(`/orders/${orderId}/payment/receipt`, { receiptImageUrl });
