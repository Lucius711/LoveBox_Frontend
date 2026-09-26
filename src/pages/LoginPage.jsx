import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../layouts/MainLayout';

export default function LoginPage() {
  const { loginWithGoogle, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ? location.state.from.pathname + (location.state.from.search || '') : '/';

  useEffect(() => { if (isLoggedIn) navigate(from, { replace: true }); }, [isLoggedIn, from, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-3xl bg-cream p-8 text-center">
        <div className="flex flex-col items-center gap-1"><Logo className="text-3xl" /><p className="text-xs uppercase tracking-[0.2em] text-stone-500">Thích là diện, thuê là tiện</p></div>
        <p className="mt-2 text-sm text-stone-500">Đăng nhập hoặc tạo tài khoản mới bằng Google — chỉ một chạm.</p>
        <div className="mt-8 flex justify-center">
          <GoogleLogin
            onSuccess={async (r) => { try { await loginWithGoogle(r.credential); navigate(from, { replace: true }); } catch { /* toast ở context */ } }}
            onError={() => toast.error('Đăng nhập thất bại!')}
            shape="pill" text="continue_with" locale="vi" width="280"
          />
        </div>
        <p className="mt-6 text-xs leading-relaxed text-stone-500">
          Tiếp tục nghĩa là bạn đồng ý với <Link to="/terms" className="underline">Điều khoản thuê & cọc</Link> và <Link to="/privacy" className="underline">Chính sách bảo mật</Link>.
        </p>
      </div>
    </div>
  );
}
