import api from './axiosInstance';
export const loginWithGoogle = (idToken) => api.post('/auth/google', { idToken });
export const getCurrentUser  = ()        => api.get('/users/me');
