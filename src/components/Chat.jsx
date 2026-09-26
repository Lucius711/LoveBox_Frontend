import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Archive, ArchiveRestore, ChevronLeft, ChevronRight, Plus, Send, Sparkles, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ROUTES } from '../constants';
import { archiveChat, errorMessage, getChat, listChats, stylistSearch } from '../services/api';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  'Đầm đỏ đô trễ vai đi prom, che được bắp tay',
  'Áo dài trắng thanh lịch chụp kỷ yếu',
  'Veston kín đáo để thuyết trình',
  'Váy nàng thơ màu pastel đi sinh nhật',
];

/** Thông tin AI cần mà hồ sơ đang thiếu (khách bỏ qua onboarding). */
export function missingProfile(user) {
  const p = user?.styleProfile || {};
  const noSize = !p.clothingSize;   // đã khai size thì không cần chiều cao / cân nặng
  return [noSize && !p.heightCm && 'chiều cao', noSize && !p.weightKg && 'cân nặng', !p.budgetMax && 'ngân sách'].filter(Boolean);
}

const greeting = (user) => {
  const miss = missingProfile(user);
  return miss.length
    ? `Chào bạn! Kể mình nghe bạn cần đồ cho dịp gì nhé. Hồ sơ của bạn còn thiếu ${miss.join(', ')}, bạn nhắn kèm luôn (vd: 1m60, 50kg, dưới 300k) để mình chọn vừa người hơn.`
    : 'Chào bạn! Mình đã có số đo, ngân sách và gu của bạn trong hồ sơ. Kể mình nghe bạn cần đồ cho dịp gì, muốn bộ như thế nào nhé.';
};

// Một cuộc chat dùng chung cho widget nổi và trang AI Studio → chuyển trang không mất hội thoại.
// Backend lưu từng cuộc chat (chatId) và tự gộp các câu trước để khách tinh chỉnh dần.
const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [saved, setSaved] = useState(0);   // tăng sau mỗi lượt lưu → danh sách lịch sử tải lại
  const [open, setOpen] = useState(false);

  const reset = () => { setChatId(null); setMessages([]); };
  useEffect(reset, [user?.id]);

  const send = async (raw) => {
    const msg = raw.trim();
    if (!msg || loading) return;
    setMessages((m) => [...m, { from: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await stylistSearch(msg, chatId);
      setChatId(res.chatId);
      setMessages((m) => [...m, { from: 'bot', result: res.result }]);
      setSaved((n) => n + 1);
    } catch (err) {
      setMessages((m) => [...m, { from: 'bot', text: errorMessage(err, 'Trợ lý đang bận, bạn thử lại sau ít phút nhé.') }]);
    } finally { setLoading(false); }
  };

  /** Mở lại một cuộc chat cũ để xem / nói tiếp. */
  const load = async (id) => {
    if (loading) return;
    setLoading(true);
    try {
      const c = await getChat(id);
      setChatId(c.id);
      setMessages(c.messages);
    } catch (err) {
      toast.error(errorMessage(err, 'Không mở được cuộc chat này'));
    } finally { setLoading(false); }
  };

  return <ChatContext.Provider value={{ messages, loading, chatId, saved, send, load, reset, open, setOpen }}>{children}</ChatContext.Provider>;
}

/** Mở widget chat từ bất kỳ nút "Tìm đồ cùng AI" nào. */
export const useChat = () => useContext(ChatContext);

export function ChatPanel({ compact = false }) {
  const { user, isLoggedIn } = useAuth();
  const { messages, loading, chatId, send, reset } = useContext(ChatContext);
  const [text, setText] = useState('');
  const endRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, loading]);

  if (!isLoggedIn) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-stone-600">Đăng nhập để dùng trợ lý AI chọn đồ theo số đo, ngân sách và gu của bạn.</p>
        <Link to={ROUTES.LOGIN} state={{ from: { pathname } }} className="btn-wine mt-4">Đăng nhập để bắt đầu</Link>
      </div>
    );
  }

  const p = user?.styleProfile;
  const profileChips = p ? [p.heightCm && `${p.heightCm}cm`, p.weightKg && `${p.weightKg}kg`,
    p.clothingSize && `Size ${p.clothingSize}`,
    (p.bust || p.waist || p.hip) && `${p.bust ?? '–'}-${p.waist ?? '–'}-${p.hip ?? '–'}`,
    p.budgetMax && `≤ ${formatCurrency(p.budgetMax)}/ngày`, ...(p.favStyles || [])].filter(Boolean) : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-200 px-4 py-2.5 text-[11px]">
        <span className="text-stone-500">Hồ sơ của bạn:</span>
        {profileChips.length ? profileChips.map((c) => <span key={c} className="rounded-full bg-stone-100 px-2 py-0.5">{c}</span>)
          : <span className="text-stone-400">chưa có số đo</span>}
        <Link to={ROUTES.PROFILE} className="ml-auto font-medium text-wine-600 underline">Sửa</Link>
      </div>
      <div className={`flex-1 space-y-4 overflow-y-auto bg-stone-50 p-4 ${compact ? '' : 'max-h-[65vh] min-h-[45vh]'}`}>
        <Bubble m={{ from: 'bot', text: greeting(user) }} compact={compact} />
        {messages.map((m, i) => <Bubble key={i} m={m} compact={compact} />)}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="chip-off text-left">{s}</button>)}
          </div>
        )}
        {loading && <div className="w-fit rounded-2xl bg-white px-4 py-3 text-sm text-stone-500 ring-1 ring-stone-200">Đang chọn đồ cho bạn…</div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); setText(''); }} className="flex items-center gap-2 border-t border-stone-200 p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} aria-label="Tin nhắn"
          placeholder={chatId ? 'Muốn đổi gì? VD: màu đen thôi, kín đáo hơn…' : 'VD: Đầm đỏ đô trễ vai đi prom, dưới 300k'} className="input rounded-full" />
        <button disabled={loading || !text.trim()} className="btn-dark h-10 w-10 shrink-0 p-0" aria-label="Gửi"><Send size={16} /></button>
        {chatId && <button type="button" onClick={reset} className="shrink-0 text-xs text-stone-500 underline">Chat mới</button>}
      </form>
    </div>
  );
}

const HIDE_ON = [ROUTES.LOGIN, ROUTES.ONBOARDING, ROUTES.CHECKOUT];

/** Nút chat nổi góc dưới màn hình, có ở mọi trang (trừ các bước không nên xen ngang). */
export function ChatWidget() {
  const { open, setOpen } = useChat();
  const { isLoggedIn } = useAuth();
  const [tab, setTab] = useState('chat');
  const { pathname } = useLocation();
  if (HIDE_ON.includes(pathname)) return null;
  // Trang chi tiết có thanh "Thuê ngay" dính đáy trên điện thoại → nâng nút chat lên để không che
  return (
    <div className={`fixed right-4 z-50 flex flex-col items-end gap-3 ${pathname.startsWith('/products/') ? 'bottom-20 md:bottom-4' : 'bottom-4'}`}>
      {open && (
        <div className="card flex h-[min(600px,calc(100dvh-10rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between bg-ink px-4 py-3 text-white">
            <span className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} /> AI Studio</span>
            <button onClick={() => setOpen(false)} aria-label="Đóng"><X size={18} /></button>
          </div>
          {isLoggedIn && (
            <div className="flex border-b border-stone-200 text-sm font-medium">
              {[['chat', 'Chat'], ['history', 'Lịch sử']].map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`flex-1 py-2.5 ${tab === k ? 'border-b-2 border-ink text-ink' : 'text-stone-500 hover:text-ink'}`}>{label}</button>
              ))}
            </div>
          )}
          <div className="min-h-0 flex-1">
            {isLoggedIn && tab === 'history' ? <ChatHistory onPick={() => setTab('chat')} /> : <ChatPanel compact />}
          </div>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} aria-label="Mở trợ lý AI"
        className="flex items-center gap-2 rounded-full bg-wine-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-wine-700">
        {open ? <X size={18} /> : <Sparkles size={18} />} {!open && <span className="hidden sm:inline">Tìm đồ cùng AI</span>}
      </button>
    </div>
  );
}

const PAGE_SIZE = 10;

/** Tab lịch sử: xem lại, lưu trữ, phân trang. Chọn một cuộc → quay về tab Chat. */
function ChatHistory({ onPick }) {
  const { chatId, saved, load, reset } = useChat();
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stale = false;
    listChats({ archived, page, size: PAGE_SIZE })
      .then((d) => {
        if (stale) return;
        if (!d.items.length && page > 1) setPage(page - 1);   // vừa lưu trữ món cuối của trang
        else setData(d);
      })
      .catch((err) => !stale && toast.error(errorMessage(err, 'Không tải được lịch sử chat')));
    return () => { stale = true; };
  }, [archived, page, saved, tick]);

  const toggle = async (c) => {
    try {
      await archiveChat(c.id, !c.archived);
      toast.success(c.archived ? 'Đã khôi phục cuộc chat' : 'Đã lưu trữ cuộc chat');
      setTick((t) => t + 1);
    } catch (err) { toast.error(errorMessage(err)); }
  };
  const tab = (v) => { setArchived(v); setPage(1); };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 pt-3">
        <button onClick={() => tab(false)} className={archived ? 'chip-off' : 'chip-on'}>Gần đây</button>
        <button onClick={() => tab(true)} className={archived ? 'chip-on' : 'chip-off'}>Đã lưu trữ</button>
        <button onClick={() => { reset(); onPick(); }} className="ml-auto flex items-center gap-1 text-xs font-medium text-wine-600"><Plus size={14} /> Chat mới</button>
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {data?.items.length === 0 && <li className="p-4 text-center text-xs text-stone-400">{archived ? 'Chưa lưu trữ cuộc chat nào' : 'Chưa có cuộc chat nào'}</li>}
        {data?.items.map((c) => (
          <li key={c.id} className={`group flex items-center gap-2 rounded-xl px-3 py-2 ${c.id === chatId ? 'bg-wine-50' : 'hover:bg-stone-50'}`}>
            <button onClick={() => { load(c.id); onPick(); }} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm">{c.title}</p>
              <p className="text-[11px] text-stone-400">{new Date(c.updatedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p>
            </button>
            <button onClick={() => toggle(c)} aria-label={c.archived ? 'Khôi phục' : 'Lưu trữ'} title={c.archived ? 'Khôi phục' : 'Lưu trữ'}
              className="shrink-0 rounded-full p-1.5 text-stone-400 hover:bg-white hover:text-ink">
              {c.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
            </button>
          </li>
        ))}
      </ul>
      {data?.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-stone-200 px-4 py-2 text-xs">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full p-1.5 hover:bg-stone-100 disabled:opacity-30" aria-label="Trang trước"><ChevronLeft size={16} /></button>
          <span className="text-stone-500">Trang {data.page}/{data.totalPages}</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} className="rounded-full p-1.5 hover:bg-stone-100 disabled:opacity-30" aria-label="Trang sau"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}

function Bubble({ m, compact }) {
  if (m.from === 'user') {
    return <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-white">{m.text}</div>;
  }
  if (!m.result) {
    return <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm ring-1 ring-stone-200">{m.text}</div>;
  }
  const { result: r } = m;
  const c = r.criteria;
  const chips = [r.size && `Size gợi ý: ${r.size}`, ...c.categories, ...c.colors.map((x) => `Màu: ${x}`), ...c.styles,
    ...c.occasions, ...c.features, c.maxPrice && `≤ ${formatCurrency(c.maxPrice)}/ngày`].filter(Boolean);
  return (
    <div className="max-w-full space-y-3">
      <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm ring-1 ring-stone-200">
        {r.message}
        {r.missing?.length > 0 && <Link to={ROUTES.PROFILE} className="mt-1 block text-xs font-medium text-wine-600 underline">Cập nhật hồ sơ</Link>}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] text-stone-400">{r.usedAi ? 'AI hiểu là:' : 'Từ khoá:'}</span>
          {chips.map((t) => <span key={t} className="rounded-full bg-wine-50 px-2 py-0.5 text-[11px] text-wine-700">{t}</span>)}
        </div>
      )}
      <div className={`grid grid-cols-2 gap-3 ${compact ? '' : 'sm:grid-cols-3'}`}>
        {r.results.map((x) => <ResultCard key={x.product.id} x={x} />)}
      </div>
    </div>
  );
}

function ResultCard({ x }) {
  const { addItem } = useCart();
  const p = x.product;
  return (
    <div className="card overflow-hidden">
      <Link to={ROUTES.PRODUCT(p.id)} className="relative block aspect-[3/4] bg-stone-200">
        {p.image && <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover" />}
        <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${x.alternative ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {x.alternative ? 'Gợi ý thay thế' : `Khớp ${x.matchRate}%`}
        </span>
      </Link>
      <div className="p-2.5">
        <p className="line-clamp-2 text-xs font-medium">{p.name}</p>
        <p className="mt-0.5 text-xs text-stone-500">Size {p.size} · {formatCurrency(p.rentPricePerDay)}/ngày</p>
        <div className="mt-2 grid gap-1.5">
          <Link to={ROUTES.PRODUCT(p.id)} className="btn-ghost px-2 py-1.5 text-xs">Xem chi tiết</Link>
          <button onClick={() => addItem(p)} className="btn-dark px-2 py-1.5 text-xs">Thêm vào giỏ</button>
        </div>
      </div>
    </div>
  );
}
