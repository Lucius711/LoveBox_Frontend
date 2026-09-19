import { createContext, useContext, useState, useEffect } from 'react';
import { loginWithGoogle as apiLoginWithGoogle, getCurrentUser } from '../services/authApi';
import toast from 'react-hot-toast';

const AUTH_USER_KEY = 'lb_user';
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
        const u = res.data?.data ?? res.data;
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

  const loginWithGoogle = async (credential) => {
    try {
      const res = await apiLoginWithGoogle(credential);
      const { accessToken, refreshToken, user: userData } = res.data.data;
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      saveUser(userData);
      setUser(userData);
      toast.success(`Chào mừng ${userData?.name || 'bạn'}! 💖`);
      return userData;
    } catch {
      toast.error('Đăng nhập thất bại. Vui lòng thử lại.');
      throw new Error('Login failed');
    }
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    toast.success('Đã đăng xuất');
  };

  return (
    <AuthContext.Provider value={{ user, loading, isLoggedIn: !!user, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
