export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  AI_STUDIO: '/ai-studio',
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDER_SUCCESS: '/order-success',
  PRODUCTS: '/products',
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  AWAITING_RECEIPT: 'AWAITING_RECEIPT',
  RECEIPT_SUBMITTED: 'RECEIPT_SUBMITTED',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
};

export const GIFT_DESIGN_SOURCE = {
  AI_GENERATED: 'AI_GENERATED',
  SHOWCASE: 'SHOWCASE',
};
