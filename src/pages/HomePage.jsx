import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ShieldCheck, Shirt, WashingMachine } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import ProductCard from '../components/ProductCard';
import { ROUTES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { forYou, getMeta, searchProducts } from '../services/api';
import { formatCurrency } from '../utils/format';
import { missingProfile, useChat } from '../components/Chat';
import { Bubbles, CardStack, Portal, RingIntro, Wordmark } from '../components/Narrative';

// Ảnh minh hoạ (Unsplash License) — chỉ bù khi kho chưa đủ ảnh sản phẩm, không bấm mua được.
const unsplash = (id) => `https://images.unsplash.com/photo-${id}?w=500&q=70&auto=format&fit=crop`;
const SAMPLES = ['1568252542512-9fe8fe9c87bb', '1610048616025-11a3dcc9fd0b', '1604531826248-f0eca8eeb896', '1623580674393-edf6eb7090f8',
  '1722111008436-d2901ba1237d', '1617258856138-402b60da4e2a', '1583039949165-96ee24b0d8de', '1600091166971-7f9faad6c1e2',
  '1594938328870-9623159c8c99', '1603400521630-9f2de124b33b', '1568251188392-ae32f898cb3b', '1490481651871-ab68de25d43d'].map(unsplash);

// Ba bước thuê
const STEPS = [
  { title: 'Kể cho AI', text: 'Kể cho AI nghe bạn sắp đi đâu, dáng người thế nào, thích phong cách gì — nhận ngay 3–5 bộ hợp nhất.' },
  { title: 'Chọn ngày thuê', text: 'Chọn ngày bạn cần trên lịch, món đồ sẽ được giữ riêng cho bạn. Thuê bao nhiêu ngày, trả bấy nhiêu, kèm một khoản cọc.' },
  { title: 'Trả đồ, nhận lại cọc', text: 'Mặc xong thì gửi trả. Đồ được kiểm tra xong, tiền cọc về lại tài khoản của bạn.' },
];
const PORTAL_COLORS = ['#762533', '#c66677', '#f2d3c4'];   // hằng số: GradientGL chỉ tạo context 1 lần

const toCard = (p) => ({
  id: p.id, src: p.image, name: p.name, to: ROUTES.PRODUCT(p.id),
  meta: [p.category, p.size && `Size ${p.size}`].filter(Boolean).join(' · '),
  price: `${formatCurrency(p.rentPricePerDay)}/ngày`,
});

export default function HomePage() {
  const [fresh, setFresh] = useState(null);
  const [popular, setPopular] = useState(null);
  const [categories, setCategories] = useState([]);
  const [mine, setMine] = useState(null);
  const [reps, setReps] = useState({});   // loại trang phục → 1 món đại diện (cho vòng thẻ mở đầu)
  const { user } = useAuth();
  const { setOpen } = useChat();

  useEffect(() => {
    searchProducts({ sort: 'new', pageSize: 8 }).then((r) => setFresh(r.items)).catch(() => setFresh([]));
    searchProducts({ sort: 'popular', pageSize: 8 }).then((r) => setPopular(r.items)).catch(() => setPopular([]));
    getMeta().then((m) => setCategories(m.categories)).catch(() => {});
  }, []);
  useEffect(() => {
    categories.forEach((c) => searchProducts({ category: c, pageSize: 1 })
      .then((r) => { const p = r.items?.find((x) => x.image); if (p) setReps((m) => ({ ...m, [c]: toCard(p) })); }).catch(() => {}));
  }, [categories]);
  useEffect(() => {
    if (user?.onboarded) forYou().then((r) => setMine(r.map((m) => m.product))).catch(() => setMine([]));
  }, [user?.onboarded]);

  const products = [...(fresh || []), ...(popular || [])].filter((p, i, a) => p.image && a.findIndex((q) => q.id === p.id) === i);
  const ringCards = [...products.map(toCard), ...SAMPLES.map((src) => ({ src }))];
  // Món đại diện của loại giới thiệu cuối cùng trên vòng thẻ bay về giữa màn hình → đặt nó làm thẻ đầu của chồng thẻ
  const lastRep = reps[categories[categories.length - 1]];
  const freshCards = (fresh || []).filter((p) => p.image).map(toCard);
  const stack = lastRep ? [lastRep, ...freshCards.filter((c) => c.id !== lastRep.id)] : freshCards;
  const popCards = (popular || []).filter((p) => p.image).map(toCard);
  const mineCards = (mine || []).filter((p) => p.image).map(toCard);
  const missing = user ? missingProfile(user) : [];
  const ai = () => setOpen(true);

  return (
    <MainLayout>
      {missing.length > 0 && (
        <div id="profile-banner" className="border-b border-amber-200 bg-amber-50 text-amber-800">
          <p className="mx-auto max-w-6xl px-4 py-2.5 text-sm">
            Hồ sơ của bạn còn thiếu {missing.join(', ')}. <Link to={ROUTES.PROFILE} className="font-semibold underline">Cập nhật hồ sơ</Link> để
            trợ lý AI chọn đồ vừa người hơn và không phải hỏi lại mỗi lần.
          </p>
        </div>
      )}

      {/* chuỗi cảnh nối liền: vòng thẻ → 1 thẻ giữa màn hình → chồng thẻ "Đồ mới lên kệ" */}
      <RingIntro cards={ringCards} handoff={stack.length > 1 && !!lastRep}
        words={categories.map((c) => ({ label: c, to: `${ROUTES.PRODUCTS}?category=${encodeURIComponent(c)}`, card: reps[c] }))} onAi={ai} />
      {stack.length > 1
        ? <CardStack kicker="New arrivals" title="Đồ mới lên kệ" items={stack} overlap />
        : <Shelf title="Đồ mới lên kệ" subtitle="New arrivals" items={fresh} more={`${ROUTES.PRODUCTS}?sort=new`} />}

      {/* các kệ chồng thẻ nối liền: kệ trước gom về 1 thẻ → thẻ lật đi → kệ sau xoè ra; ít hơn 3 món có ảnh thì giữ kệ thường */}
      {mineCards.length >= 3
        ? <CardStack kicker="Theo hồ sơ của bạn" title="Gợi ý cho bạn" items={mineCards} from={stack.length > 1 ? stack[stack.length - 1].src : null} />
        : mine?.length > 0 && <Shelf title="Gợi ý cho bạn" subtitle="Theo hồ sơ của bạn" items={mine} more={ROUTES.PRODUCTS} />}
      {popCards.length >= 3
        ? <CardStack kicker="Best sellers" title="Đồ được thuê nhiều nhất" items={popCards} ranked
            from={mineCards.length >= 3 ? mineCards[mineCards.length - 1].src : !mine?.length && stack.length > 1 ? stack[stack.length - 1].src : null} />
        : <Shelf title="Đồ được thuê nhiều nhất" subtitle="Best sellers" items={popular} more={`${ROUTES.PRODUCTS}?sort=popular`} badge />}

      {/* kệ bán chạy gom về 1 thẻ → portal "Cách thuê" nở ra từ thẻ đó → cùng khung đó thành "Tủ đồ chung" */}
      <Portal kicker="Cách thuê" steps={STEPS} colors={PORTAL_COLORS} from={popCards.length >= 3 ? popCards[popCards.length - 1].src : null} onAi={ai} />
      <Bubbles images={[...products.map((p) => p.image), ...SAMPLES]} colors={PORTAL_COLORS}>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[.3em] text-white/70">Tủ đồ chung</p>
        <p className="mt-2 max-w-3xl text-2xl font-light leading-tight tracking-tight md:text-4xl">
          Lentique kết nối người có đồ đẹp đang nằm im trong tủ với người cần mặc đẹp cho những dịp đặc biệt.
        </p>
        <Promises />
        <Link to={ROUTES.NEW_PRODUCT} className="btn mt-4 shrink-0 bg-white px-6 py-3 text-ink hover:bg-wine-50">Đăng đồ cho thuê <ArrowRight size={16} /></Link>
      </Bubbles>

      {/* khung bong bóng thu lên & cuộn đi → logo vẽ nét, chữ Lentique trồi lên từng chữ */}
      <Wordmark tagline="Thích là diện · thuê là tiện" />

      <div>
        <Roles onAi={ai} />
      </div>

    </MainLayout>
  );
}

/* ───────────── Kệ sản phẩm ───────────── */
function Shelf({ title, subtitle, items, more, badge }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-20">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="reveal-up text-xs font-semibold uppercase tracking-widest text-wine-600">{subtitle}</p>
          <h2 className="reveal-line mt-1 font-serif text-3xl md:text-5xl"><span style={{ '--d': '80ms' }}>{title}</span></h2>
        </div>
        <Link to={more} className="group/a reveal-up inline-flex shrink-0 items-center gap-1.5 border-b border-ink pb-0.5 text-sm font-medium">
          Xem tất cả <ArrowRight size={14} className="transition-transform duration-700 group-hover/a:translate-x-1" />
        </Link>
      </div>
      {items === null ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-stone-200" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-500">Chưa có sản phẩm.</p>
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
          {items.map((p, i) => (
            <div key={p.id} className="reveal-up w-[46%] shrink-0 snap-start md:w-auto" style={{ '--d': `${(i % 4) * 90}ms` }}>
              <ProductCard p={p} badge={badge && i < 3 ? `Top ${i + 1}` : null} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ───────────── Dải cam kết (nền tối, kiểu dải giải thưởng) ───────────── */
function Promises() {
  const LIST = [
    [Shirt, 'Duyệt từng món', 'Admin kiểm tra trước khi lên kệ'],
    [WashingMachine, 'Giặt ủi sạch sẽ', 'Giữa mọi lượt thuê'],
    [ShieldCheck, 'Cọc an toàn', 'Hoàn lại sau khi trả đồ'],
  ];
  return (
    <section className="mt-4 w-full text-left text-white">
      <div className="mx-auto grid max-w-4xl gap-4 px-4 py-4 md:grid-cols-3 md:gap-8">
        {LIST.map(([Icon, t, d]) => (
          <div key={t} className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/25"><Icon size={20} /></span>
            <div><p className="text-lg">{t}</p><p className="text-sm text-white/75">{d}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Hàng accordion chữ lớn (kiểu bảng gói Unfold) ───────────── */
function Roles({ onAi }) {
  const ROWS = [
    ['Người thuê', 'Kể cho AI dịp bạn cần, nhận 3-5 bộ vừa dáng, chọn ngày và đặt cọc an toàn.', <button key="a" onClick={onAi} className="btn-dark">Tìm đồ cùng AI</button>],
    ['Chủ đồ', 'Tủ đồ đang nằm im? Đăng đồ cho thuê, admin duyệt trong 24h, nhận tiền mỗi lượt thuê.', <Link key="b" to={ROUTES.NEW_PRODUCT} className="btn-wine">Đăng đồ cho thuê <ArrowRight size={16} /></Link>],
    ['Về Lentique', 'Tủ đồ chung cho những dịp đặc biệt — mặc đẹp mà không cần mua.', <Link key="c" to={ROUTES.ABOUT} className="btn-ghost">Đọc thêm</Link>],
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 pt-20">
      {ROWS.map(([t, d, cta], i) => (
        <details key={t} className="reveal-up group border-b border-stone-200" style={{ '--d': `${i * 100}ms` }} open={i === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between py-7 [&::-webkit-details-marker]:hidden">
            <span className="font-serif text-4xl md:text-6xl">{t}</span>
            <ChevronDown className="transition-transform duration-500 group-open:rotate-180" />
          </summary>
          <div className="flex flex-col items-start gap-5 pb-8 md:flex-row md:items-center md:justify-between">
            <p className="max-w-xl text-stone-600">{d}</p>
            {cta}
          </div>
        </details>
      ))}
    </section>
  );
}
