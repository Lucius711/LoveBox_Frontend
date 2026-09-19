import MainLayout from '../layouts/MainLayout';
import HeroSection from '../modules/home/HeroSection';
import ShowcaseSection from '../modules/home/ShowcaseSection';

const FEATURES = [
  {
    icon: '🤖',
    bg: 'from-violet-400 to-purple-500',
    title: 'AI Thiết kế',
    desc: 'Tạo hình ảnh độc bản từ prompt của bạn',
  },
  {
    icon: '📦',
    bg: 'from-amber-400 to-orange-400',
    title: 'Chế tác thủ công',
    desc: 'Đội ngũ in ấn và đóng gói chuyên nghiệp',
  },
  {
    icon: '💌',
    bg: 'from-pink-400 to-rose-500',
    title: 'Thiệp QR lời chúc',
    desc: 'Lời chúc bí mật qua mã QR độc đáo',
  },
  {
    icon: '🚀',
    bg: 'from-sky-400 to-blue-500',
    title: 'Giao nhanh 2h',
    desc: 'Nội thành TP.HCM và Hà Nội',
  },
];

const STEPS = [
  { step: '01', icon: '💬', title: 'Nhập mô tả hộp quà cho AI' },
  { step: '02', icon: '🎨', title: 'AI render hình ảnh thiết kế' },
  { step: '03', icon: '💝', title: 'Điền lời chúc & chọn size' },
  { step: '04', icon: '📦', title: 'Thanh toán & nhận hàng' },
];

export default function HomePage() {
  return (
    <MainLayout>
      <HeroSection />

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-5">
          {FEATURES.map(({ icon, bg, title, desc }) => (
            <div
              key={title}
              className="group relative bg-white rounded-3xl p-6 shadow-sm border border-pink-50
                         hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              {/* Soft blurred blob */}
              <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${bg} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />

              {/* Icon pill */}
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${bg} flex items-center justify-center text-2xl shadow-md mb-4`}>
                {icon}
              </div>

              <p className="font-bold text-gray-800 text-sm mb-1">{title}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Showcase ─────────────────────────────────────────── */}
      <ShowcaseSection />

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="py-20 px-4">
        {/* Heading */}
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest text-pink-400 uppercase mb-2">Quy trình</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Cách hoạt động</h2>
          <p className="text-gray-400 mt-2 text-sm">Chỉ 4 bước để có hộp quà trong mơ ✨</p>
        </div>

        <div className="max-w-4xl mx-auto relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-10 left-[calc(12.5%+1px)] right-[calc(12.5%+1px)] h-px bg-gradient-to-r from-pink-200 via-rose-300 to-pink-200" />

          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map(({ step, icon, title }, i) => (
              <div key={step} className="flex flex-col items-center text-center gap-4 relative">
                {/* Circle */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-3xl shadow-sm border-4 border-white ring-1 ring-pink-200 z-10 relative">
                    {icon}
                  </div>
                  {/* Step badge */}
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md z-20">
                    {i + 1}
                  </span>
                </div>

                <p className="text-xs font-semibold tracking-widest text-pink-300 uppercase">Bước {step}</p>
                <p className="text-sm font-semibold text-gray-700 leading-snug">{title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust band ───────────────────────────────────────── */}
      <section className="py-12 px-4 mb-4">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-pink-500 via-rose-500 to-pink-400 rounded-3xl p-10 text-white text-center relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
          <div className="absolute bottom-0 right-0 w-56 h-56 bg-rose-300/20 rounded-full translate-x-1/4 translate-y-1/4 blur-2xl" />

          <div className="relative z-10">
            <p className="text-3xl mb-1">✨</p>
            <h3 className="text-2xl md:text-3xl font-bold mb-2">Không tìm được mẫu ưng ý?</h3>
            <p className="text-white/80 mb-6 text-sm md:text-base max-w-sm mx-auto">
              Hãy để AI thiết kế riêng một hộp quà chỉ dành cho bạn trong vài giây!
            </p>

            <div className="flex justify-center gap-8 mb-8">
              {[['500+', 'Hộp quà đã tạo'], ['98%', 'Khách hài lòng'], ['2h', 'Giao siêu tốc']].map(([v, l]) => (
                <div key={l}>
                  <p className="text-2xl font-bold">{v}</p>
                  <p className="text-white/70 text-xs mt-0.5">{l}</p>
                </div>
              ))}
            </div>

            <a
              href="/"
              onClick={(e) => { e.preventDefault(); document.querySelector('[data-chat-trigger]')?.click(); }}
              className="inline-flex items-center gap-2 bg-white text-pink-500 font-bold px-8 py-3 rounded-full hover:shadow-xl hover:scale-105 transition-all text-sm"
            >
              🎨 Tạo với AI ngay
            </a>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
