import api from './axiosInstance';
/** Đăng nhập Google làm hết ở backend: trình duyệt đi tới đây → Google → backend callback → /auth/callback#token */
export const GOOGLE_LOGIN_URL = `${api.defaults.baseURL}/auth/google/login`;
export const getCurrentUser  = () => api.get('/users/me');
