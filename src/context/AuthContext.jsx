import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../services/authApi';
import toast from 'react-hot-toast';

const AUTH_USER_KEY = 'lt_user';
const AuthContext = createContext(null);

const readUser = () => {
  try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY)); } catch { return null; }
};
const saveUser = (u) => {
  try { localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u)); } catch {}
};
const clearAuth = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem(AUTH_USER_KEY);
};

export function AuthProvider({ children }) {
  // Restore user from cache immediately — no loading flash
  const [user, setUser] = useState(readUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }

    getCurrentUser()
      .then((res) => {
        const u = res.data;
        setUser(u);
        saveUser(u);
      })
      .catch((err) => {
        // Only force logout on explicit 401 (token truly invalid/expired + refresh failed)
        // Network errors, 5xx → keep cached session
        const status = err?.response?.status;
        if (status === 401) {
          clearAuth();
          setUser(null);
        }
        // else: silent — user stays logged in from cache
      })
      .finally(() => setLoading(false));
  }, []);

  /** Nhận token từ backend (sau Google callback) → lưu lại và tải thông tin người dùng. */
  const loginWithTokens = async (accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    const res = await getCurrentUser();
    saveUser(res.data);
    setUser(res.data);
    toast.success(`Chào mừng ${res.data?.name || 'bạn'}!`);
    return res.data;
  };

  const refreshUser = async () => {
    const res = await getCurrentUser();
    setUser(res.data);
    saveUser(res.data);
    return res.data;
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    toast.success('Đã đăng xuất');
  };

  return (
    <AuthContext.Provider value={{ user, loading, isLoggedIn: !!user, loginWithTokens, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
