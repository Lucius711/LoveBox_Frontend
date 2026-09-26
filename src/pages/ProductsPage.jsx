import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import ProductCard from '../components/ProductCard';
import { getMeta, searchProducts } from '../services/api';

const PRICES = [
  ['Dưới 100k', '', '100000'],
  ['100k – 200k', '100000', '200000'],
  ['200k – 300k', '200000', '300000'],
  ['Trên 300k', '300000', ''],
];
const SORTS = [['new', 'Mới nhất'], ['popular', 'Thuê nhiều nhất'], ['priceAsc', 'Giá tăng dần'], ['priceDesc', 'Giá giảm dần']];
const KEYS = ['q', 'category', 'style', 'color', 'size', 'minPrice', 'maxPrice', 'availability', 'sort', 'page'];
const PAGE_SIZE = 12;

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const [meta, setMeta] = useState(null);
  const [result, setResult] = useState(null);   // { items, page, totalPages, totalItems }
  const items = result?.items ?? null;
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { getMeta().then(setMeta).catch(() => {}); }, []);

  const query = Object.fromEntries(KEYS.map((k) => [k, params.get(k)]).filter(([, v]) => v));
  const queryKey = JSON.stringify(query);
  useEffect(() => {
    setResult(null);
    searchProducts({ ...JSON.parse(queryKey), pageSize: PAGE_SIZE })
      .then(setResult).catch(() => setResult({ items: [], page: 1, totalPages: 0, totalItems: 0 }));
  }, [queryKey]);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    if (!('page' in patch)) next.delete('page');   // đổi bộ lọc → về trang 1
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };
  const toggle = (k, v) => set({ [k]: params.get(k) === v ? '' : v });
  const NOT_FILTER = ['sort', 'q', 'page'];
  const activeCount = KEYS.filter((k) => !NOT_FILTER.includes(k) && params.get(k)).length;
  const goPage = (n) => { set({ page: n > 1 ? String(n) : '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const filters = meta && (
    <div className="space-y-6">
      <Group title="Loại trang phục">
        {meta.categories.map((c) => <Chip key={c} on={params.get('category') === c} onClick={() => toggle('category', c)}>{c}</Chip>)}
      </Group>
      <Group title="Phong cách">
        {meta.styles.map((s) => <Chip key={s} on={params.get('style') === s} onClick={() => toggle('style', s)}>{s}</Chip>)}
      </Group>
      <Group title="Khoảng giá thuê / ngày">
        {PRICES.map(([label, min, max]) => {
          const on = (params.get('minPrice') || '') === min && (params.get('maxPrice') || '') === max;
          return <Chip key={label} on={on} onClick={() => set(on ? { minPrice: '', maxPrice: '' } : { minPrice: min, maxPrice: max })}>{label}</Chip>;
        })}
      </Group>
      <Group title="Kích cỡ">
        {meta.sizes.map((s) => <Chip key={s} on={params.get('size') === s} onClick={() => toggle('size', s)}>{s}</Chip>)}
      </Group>
      <Group title="Màu sắc">
        {meta.colors.map((c) => <Chip key={c} on={params.get('color') === c} onClick={() => toggle('color', c)}>{c}</Chip>)}
      </Group>
      <Group title="Tình trạng">
        <Chip on={params.get('availability') === 'available'} onClick={() => toggle('availability', 'available')}>Có sẵn</Chip>
        <Chip on={params.get('availability') === 'rented'} onClick={() => toggle('availability', 'rented')}>Đang cho thuê</Chip>
      </Group>
      {activeCount > 0 && (
        <button onClick={() => set(Object.fromEntries(KEYS.filter((k) => !NOT_FILTER.includes(k)).map((k) => [k, ''])))}
          className="text-sm font-medium text-wine-600 underline">Xoá bộ lọc</button>
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl">{params.get('category') || 'Kho đồ cho thuê'}</h1>
            {params.get('q') && (
              <p className="mt-1 text-sm text-stone-500">
                Kết quả cho “{params.get('q')}” · <button onClick={() => set({ q: '' })} className="underline">bỏ tìm kiếm</button>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Điện thoại: nút lọc nổi góc dưới trái → cuộn tới đâu cũng mở được */}
            <button onClick={() => setDrawer(true)} className="btn-ghost fixed bottom-4 left-4 z-40 px-4 py-3 shadow-lg md:hidden">
              <SlidersHorizontal size={15} /> Bộ lọc{activeCount ? ` (${activeCount})` : ''}
            </button>
            <select value={params.get('sort') || 'new'} onChange={(e) => set({ sort: e.target.value })}
              aria-label="Sắp xếp" className="input w-auto py-2">
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-[230px_1fr]">
          <aside className="hidden md:sticky md:top-24 md:block md:max-h-[calc(100dvh-7rem)] md:self-start md:overflow-y-auto">{filters}</aside>
          <div>
            {items === null ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-stone-200" />)}
              </div>
            ) : items.length === 0 ? (
              <div className="card p-10 text-center text-stone-500">Không có món nào khớp bộ lọc. Thử bỏ bớt điều kiện nhé.</div>
            ) : (
              <>
                <p className="mb-4 text-sm text-stone-500">{result.totalItems} món</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3">
                  {items.map((p) => <ProductCard key={p.id} p={p} />)}
                </div>
                <Pagination page={result.page} total={result.totalPages} onGo={goPage} />
              </>
            )}
          </div>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Bộ lọc</h2>
              <button onClick={() => setDrawer(false)} aria-label="Đóng"><X size={20} /></button>
            </div>
            {filters}
            <button onClick={() => setDrawer(false)} className="btn-dark mt-6 w-full py-3">Xem {result?.totalItems ?? ''} kết quả</button>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

function Group({ title, children }) {
  return (
    <div>
      <p className="label">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ on, onClick, children }) {
  return <button type="button" onClick={onClick} aria-pressed={on} className={on ? 'chip-on' : 'chip-off'}>{children}</button>;
}

/** 1 … 4 5 [6] 7 8 … 20 */
function Pagination({ page, total, onGo }) {
  if (total <= 1) return null;
  const nums = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, total])].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  return (
    <nav aria-label="Phân trang" className="mt-10 flex items-center justify-center gap-1.5">
      <button disabled={page <= 1} onClick={() => onGo(page - 1)} className="btn-ghost px-3 py-2" aria-label="Trang trước">‹</button>
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - nums[i - 1] > 1 && <span className="text-stone-400">…</span>}
          <button onClick={() => onGo(n)} aria-current={n === page ? 'page' : undefined}
            className={`h-9 min-w-9 rounded-full px-3 text-sm font-medium ${n === page ? 'bg-ink text-white' : 'hover:bg-stone-200'}`}>{n}</button>
        </span>
      ))}
      <button disabled={page >= total} onClick={() => onGo(page + 1)} className="btn-ghost px-3 py-2" aria-label="Trang sau">›</button>
    </nav>
  );
}
