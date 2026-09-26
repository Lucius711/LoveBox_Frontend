import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../layouts/MainLayout';
import { GOOGLE_LOGIN_URL } from '../services/authApi';

const FROM_KEY = 'lt_login_from'; // trang cần quay lại sau khi Google redirect về

export default function LoginPage() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const from = location.state?.from ? location.state.from.pathname + (location.state.from.search || '') : '/';

  useEffect(() => { if (isLoggedIn) navigate(from, { replace: true }); }, [isLoggedIn, from, navigate]);
  useEffect(() => { if (params.get('error')) toast.error('Đăng nhập Google thất bại, thử lại nhé'); }, [params]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-3xl bg-cream p-8 text-center">
        <div className="flex flex-col items-center gap-1"><Logo className="text-3xl" /><p className="text-xs uppercase tracking-[0.2em] text-stone-500">Thích là diện, thuê là tiện</p></div>
        <p className="mt-2 text-sm text-stone-500">Đăng nhập hoặc tạo tài khoản mới bằng Google — chỉ một chạm.</p>
        <a href={GOOGLE_LOGIN_URL} onClick={() => sessionStorage.setItem(FROM_KEY, from)}
          className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-ink hover:border-ink">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Tiếp tục với Google
        </a>
        <p className="mt-6 text-xs leading-relaxed text-stone-500">
          Tiếp tục nghĩa là bạn đồng ý với <Link to="/terms" className="underline">Điều khoản thuê & cọc</Link> và <Link to="/privacy" className="underline">Chính sách bảo mật</Link>.
        </p>
      </div>
    </div>
  );
}

/** /auth/callback#accessToken=…&refreshToken=… — backend redirect về sau khi đăng nhập Google thành công. */
export function AuthCallback() {
  const { loginWithTokens } = useAuth();
  const navigate = useNavigate();
  const done = useRef(false); // StrictMode chạy effect 2 lần

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    history.replaceState(null, '', window.location.pathname); // xoá token khỏi thanh địa chỉ
    const access = hash.get('accessToken');
    const refresh = hash.get('refreshToken');
    const from = sessionStorage.getItem(FROM_KEY) || '/';
    sessionStorage.removeItem(FROM_KEY);
    if (!access || !refresh) { navigate('/login?error=google', { replace: true }); return; }
    loginWithTokens(access, refresh)
      .then(() => navigate(from, { replace: true }))
      .catch(() => navigate('/login?error=google', { replace: true }));
  }, [loginWithTokens, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <span className="h-9 w-9 animate-spin rounded-full border-4 border-wine-500 border-t-transparent" aria-label="Đang đăng nhập" />
    </div>
  );
}
