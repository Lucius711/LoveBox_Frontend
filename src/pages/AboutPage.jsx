import { Link } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { ROUTES } from '../constants';
import { useChat } from '../components/Chat';

export default function AboutPage() {
  const { setOpen } = useChat();
  return (
    <MainLayout>
      <article className="mx-auto max-w-2xl px-4 py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-wine-600">Về chúng tôi</p>
        <h1 className="mt-1 font-serif text-4xl leading-tight">Tủ đồ chung cho những dịp đặc biệt</h1>
        <div className="mt-6 space-y-4 leading-relaxed text-stone-700">
          <p>Lentique ra đời từ một câu hỏi rất sinh viên: <em>“Mua một chiếc đầm prom mặc đúng một lần có đáng không?”</em> Chúng tôi nghĩ là không.</p>
          <p>Lentique kết nối người có đồ đẹp đang nằm im trong tủ với người cần mặc đẹp cho kỷ yếu, prom, đám cưới, buổi thuyết trình… Bạn thuê theo ngày, đặt cọc an toàn và nhận lại cọc sau khi trả đồ.</p>
          <p>Trợ lý AI của chúng tôi đọc yêu cầu của bạn — dịp gì, dáng người ra sao, thích màu nào, ngân sách bao nhiêu — rồi đối chiếu với nhãn chi tiết của từng món trong kho để gợi ý 3-5 bộ hợp nhất.</p>
          <p>Mỗi món đồ đều được admin duyệt trước khi lên kệ và được giặt ủi giữa các lượt thuê.</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={() => setOpen(true)} className="btn-wine">Tìm đồ cùng AI</button>
          <Link to={ROUTES.NEW_PRODUCT} className="btn-ghost">Đăng đồ cho thuê</Link>
        </div>
      </article>
    </MainLayout>
  );
}
