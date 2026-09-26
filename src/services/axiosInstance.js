import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const api = axios.create({ baseURL: API_BASE_URL, timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && token !== 'null' && token !== 'undefined') config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let isRedirecting = false; // ponytail: flag chống multi-redirect khi nhiều request fail cùng lúc
let failedQueue = [];
const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

const redirectToLogin = () => {
  if (isRedirecting) return;
  isRedirecting = true;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('lt_user'); // clear cached user to break auth loop
  window.location.href = '/login';
};

api.interceptors.response.use(
  (res) => {
    // Unwrap ApiResponse envelope {success,code,message,data,...} → res.data = payload
    const b = res.data;
    if (b && typeof b === 'object' && 'success' in b && 'data' in b) res.data = b.data;
    return res;
  },
  async (error) => {
    const orig = error.config;
    if (error.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => { orig.headers.Authorization = `Bearer ${token}`; return api(orig); })
          .catch((e) => Promise.reject(e));
      }
      orig._retry = true;
      isRefreshing = true;
      const rt = localStorage.getItem('refresh_token');
      if (!rt) {
        isRefreshing = false;
        redirectToLogin();
        return Promise.reject(error);
      }
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: rt });
        const { accessToken, refreshToken: newRt } = res.data.data;
        localStorage.setItem('access_token', accessToken);
        if (newRt) localStorage.setItem('refresh_token', newRt);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        orig.headers.Authorization = `Bearer ${accessToken}`;
        return api(orig);
      } catch (e) {
        processQueue(e, null);
        redirectToLogin();
        return Promise.reject(e);
      } finally { isRefreshing = false; }
    }
    return Promise.reject(error);
  }
);

export default api;
