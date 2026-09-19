import api from './axiosInstance';
export const loginWithGoogle = (idToken) => api.post('/auth/google', { idToken });
export const refreshToken    = (token)   => api.post('/auth/refresh', { refreshToken: token });
export const getCurrentUser  = ()        => api.get('/users/me');
