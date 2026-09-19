import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { loginWithGoogle, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isLoggedIn) navigate(from, { replace: true });
  }, [isLoggedIn]);

  const handleSuccess = async (credentialResponse) => {
    try {
      await loginWithGoogle(credentialResponse.credential);
      toast.success('Đăng nhập thành công! 🎉');
      navigate(from, { replace: true });
    } catch {
      toast.error('Đăng nhập thất bại, thử lại nhé!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 flex items-center justify-center px-4">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-pink-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-rose-200/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-100 p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🎁</div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-1">
          Love Box
        </h1>
        <p className="text-pink-400 text-sm mb-8">Đăng nhập để tạo hộp quà của bạn</p>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => toast.error('Đăng nhập thất bại!')}
            shape="pill"
            theme="outline"
            text="signin_with"
            locale="vi"
            width="280"
          />
        </div>

        <p className="text-pink-300 text-xs mt-6 leading-relaxed">
          Bằng cách đăng nhập, bạn đồng ý với<br />
          điều khoản sử dụng của Love Box 💕
        </p>
      </div>
    </div>
  );
}
