import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, Home, Sparkles } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/ui/Button';
import { ROUTES } from '../constants';

export default function OrderSuccessPage() {
  const { openStudio } = useChat();
  const { state } = useLocation();
  const orderId = state?.orderId || 'LB-' + Date.now().toString().slice(-8);
  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-2">🎉🎊✨</div>
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckCircle size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-pink-900 mb-3">Đặt hàng thành công!</h1>
        <p className="text-pink-500 leading-relaxed mb-2">Cảm ơn bạn đã tin tưởng Love Box 💕<br />Chúng mình sẽ bắt đầu chế tác hộp quà ngay!</p>
        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5 my-8 text-left space-y-3">
          {[['Mã đơn hàng',`#${orderId}`],['Trạng thái','Đang chờ xác nhận thanh toán'],['Thời gian làm','1-2 ngày làm việc']].map(([k,v]) => (
            <div key={k} className="flex justify-between text-sm"><span className="text-pink-400">{k}</span><span className="font-semibold text-pink-800">{v}</span></div>
          ))}
        </div>
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100 rounded-2xl p-5 mb-8 text-sm text-pink-700">
          <p className="font-semibold mb-2">📬 Bước tiếp theo</p>
          <ol className="text-left space-y-1.5 text-pink-600">
            <li>1️⃣ Team Love Box xác nhận thanh toán của bạn</li>
            <li>2️⃣ Bắt đầu in ấn & đóng gói hộp quà thủ công</li>
            <li>3️⃣ Tạo mã QR thiệp lời chúc riêng cho bạn</li>
            <li>4️⃣ Giao hàng đến tận tay người nhận 🚀</li>
          </ol>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to={ROUTES.HOME} className="flex-1"><Button variant="outline" className="w-full"><Home size={16} /> Về trang chủ</Button></Link>
          <button onClick={openStudio} className="flex-1"><Button className="w-full"><Sparkles size={16} /> Tạo hộp quà mới</Button></button>
        </div>
      </div>
    </MainLayout>
  );
}
