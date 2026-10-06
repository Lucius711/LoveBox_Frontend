import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../layouts/MainLayout';
import { Field } from '../components/ui';
import { ROUTES } from '../constants';
import { createProduct, errorMessage, getMeta, getProduct, updateProduct, uploadImage } from '../services/api';
import { compressImage, formatCurrency } from '../utils/format';

const EMPTY = {
  name: '', description: '', category: '', size: '', bustMax: '', waistMax: '', hipMax: '', itemCondition: '',
  listingType: 'RENT', salePrice: '', retailPrice: '', rentPricePerDay: '', depositPercent: 100, colors: [], styles: [], occasions: [], features: [], images: [],
};
const PHOTO_HINTS = ['Mặt trước', 'Mặt sau', 'Cận chất vải'];

/** Form đăng đồ cho thuê / thanh lý — ép nhập đủ nhãn để AI gợi ý chính xác; gửi xong chờ admin duyệt. */
export default function ProductFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState(() => ({ ...EMPTY, listingType: params.get('type') === 'SALE' ? 'SALE' : 'RENT' }));
  const sale = form.listingType === 'SALE';
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getMeta().then(setMeta); }, []);
  useEffect(() => {
    if (id) getProduct(id).then((p) => setForm({ ...EMPTY, ...p })).catch(() => toast.error('Không tải được sản phẩm'));
  }, [id]);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const f = (k) => ({ value: form[k], onChange: (e) => set(k, e.target.value) });
  const toggle = (k, v) => set(k, form[k].includes(v) ? form[k].filter((x) => x !== v) : [...form[k], v]);

  const addPhotos = async (files) => {
    const list = [...files].slice(0, 10 - form.images.length);
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const url = await uploadImage(await compressImage(file));
        setForm((s) => ({ ...s, images: [...s.images, url] }));
      } catch (e) { toast.error(errorMessage(e, 'Tải ảnh thất bại')); }
      setUploading((n) => n - 1);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const missing = [['colors', 'màu sắc'], ['styles', 'phong cách'], ['occasions', 'dịp phù hợp']].find(([k]) => !form[k].length);
    if (missing) return toast.error(`Chọn ít nhất 1 ${missing[1]}`);
    if (form.images.length < 3) return toast.error('Cần ít nhất 3 ảnh: mặt trước, mặt sau, cận chất vải');
    setSaving(true);
    const body = {
      ...form, bustMax: +form.bustMax, waistMax: +form.waistMax, hipMax: +form.hipMax,
      retailPrice: +form.retailPrice, rentPricePerDay: sale ? 0 : +form.rentPricePerDay, depositPercent: +form.depositPercent,
      salePrice: sale ? +form.salePrice : 0,
    };
    try {
      await (id ? updateProduct(id, body) : createProduct(body));
      toast.success('Đã gửi! Admin sẽ duyệt trước khi đồ hiển thị.');
      navigate(`${ROUTES.ACCOUNT}?tab=owner${sale ? '&kind=SALE' : ''}`);
    } catch (err) { toast.error(errorMessage(err)); } finally { setSaving(false); }
  };

  if (!meta) return <MainLayout><p className="py-20 text-center text-stone-500">Đang tải…</p></MainLayout>;
  const deposit = Math.floor((+form.retailPrice || 0) * form.depositPercent / 100);

  return (
    <MainLayout>
      <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="font-serif text-3xl">{id ? 'Sửa món đồ' : sale ? 'Đăng đồ thanh lý' : 'Đăng đồ cho thuê'}</h1>
          <p className="mt-1 text-sm text-stone-500">Điền đủ các nhãn để khách tìm thấy đồ của bạn. Admin duyệt trước khi hiển thị.</p>
        </div>

        {/* Loại cố định sau khi đăng: đồ thuê có lịch + cọc, đồ thanh lý chỉ có giá bán */}
        {!id && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1.5">
            {[['RENT', 'Cho thuê', 'Khách thuê theo ngày, đặt cọc, trả lại đồ'], ['SALE', 'Thanh lý', 'Bán đứt đồ cũ, không cọc, không trả lại']].map(([k, l, d]) => (
              <button type="button" key={k} onClick={() => set('listingType', k)} aria-pressed={form.listingType === k}
                className={`rounded-xl px-4 py-3 text-left transition ${form.listingType === k ? 'bg-white shadow-sm' : 'text-stone-500 hover:text-ink'}`}>
                <span className="block text-sm font-semibold">{l}</span>
                <span className="block text-xs text-stone-500">{d}</span>
              </button>
            ))}
          </div>
        )}

        <Section title="Ảnh (ít nhất 3)">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {form.images.map((src, i) => (
              <div key={src} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-stone-200">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white">{PHOTO_HINTS[i] || `Ảnh ${i + 1}`}</span>
                <button type="button" onClick={() => set('images', form.images.filter((x) => x !== src))} aria-label="Xoá ảnh"
                  className="absolute right-1 top-1 rounded-full bg-white/90 p-1"><X size={12} /></button>
              </div>
            ))}
            {form.images.length < 10 && (
              <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 text-center text-xs text-stone-500 hover:border-ink">
                <ImagePlus size={20} />
                {uploading ? `Đang tải ${uploading}…` : PHOTO_HINTS[form.images.length] || 'Thêm ảnh'}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
              </label>
            )}
          </div>
        </Section>

        <Section title="Thông tin">
          <Field label="Tên món đồ"><input required maxLength={255} className="input" {...f('name')} /></Field>
          <Field label="Mô tả (chất liệu, tình trạng, lưu ý…)"><textarea required minLength={20} maxLength={3000} rows={4} className="input" {...f('description')} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Loại đồ"><select required className="input" {...f('category')}><option value="">— Chọn —</option>{meta.categories.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Độ mới"><select required className="input" {...f('itemCondition')}><option value="">— Chọn —</option>{meta.conditions.map((c) => <option key={c}>{c}</option>)}</select></Field>
          </div>
        </Section>

        <Section title="Size & số đo tối đa mặc vừa (cm)">
          <div className="grid grid-cols-4 gap-3">
            <Field label="Size"><select required className="input" {...f('size')}><option value="">—</option>{meta.sizes.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Ngực"><input required type="number" min={50} max={200} inputMode="numeric" className="input" {...f('bustMax')} /></Field>
            <Field label="Eo"><input required type="number" min={40} max={200} inputMode="numeric" className="input" {...f('waistMax')} /></Field>
            <Field label="Mông"><input required type="number" min={50} max={200} inputMode="numeric" className="input" {...f('hipMax')} /></Field>
          </div>
        </Section>

        <Section title="Nhãn cho AI">
          <Chips label="Màu sắc *" all={meta.colors} value={form.colors} onToggle={(v) => toggle('colors', v)} />
          <Chips label="Phong cách *" all={meta.styles} value={form.styles} onToggle={(v) => toggle('styles', v)} />
          <Chips label="Dịp phù hợp *" all={meta.occasions} value={form.occasions} onToggle={(v) => toggle('occasions', v)} />
          <Chips label="Kiểu dáng / tính năng" all={meta.features} value={form.features} onToggle={(v) => toggle('features', v)} />
        </Section>

        {sale ? (
        <Section title="Giá">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Giá gốc (lúc mua mới)"><input required type="number" min={10000} step={1000} inputMode="numeric" className="input" {...f('retailPrice')} /></Field>
            <Field label="Giá bán thanh lý"><input required type="number" min={10000} step={1000} inputMode="numeric" className="input" {...f('salePrice')} /></Field>
          </div>
          {+form.retailPrice > 0 && +form.salePrice > 0 && (
            <p className="text-xs text-stone-500">Rẻ hơn giá gốc {Math.max(0, Math.round(100 - (form.salePrice / form.retailPrice) * 100))}%</p>
          )}
        </Section>
        ) : (
        <Section title="Giá">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Giá niêm yết (giá mua gốc)"><input required type="number" min={10000} step={1000} inputMode="numeric" className="input" {...f('retailPrice')} /></Field>
            <Field label="Giá thuê / ngày"><input required type="number" min={10000} step={1000} inputMode="numeric" className="input" {...f('rentPricePerDay')} /></Field>
          </div>
          <Field label={`Tiền cọc: ${form.depositPercent}% giá niêm yết = ${formatCurrency(deposit)}`}>
            <input type="range" min={50} max={100} step={5} className="w-full accent-wine-600" {...f('depositPercent')} />
          </Field>
        </Section>
        )}

        <button disabled={saving || uploading > 0} className="btn-wine w-full py-3">{saving ? 'Đang gửi…' : 'Gửi duyệt'}</button>
      </form>
    </MainLayout>
  );
}

const Section = ({ title, children }) => (
  <fieldset className="card space-y-4 p-5"><legend className="px-1 text-sm font-semibold">{title}</legend>{children}</fieldset>
);
function Chips({ label, all, value, onToggle }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex flex-wrap gap-2">
        {all.map((v) => <button type="button" key={v} onClick={() => onToggle(v)} aria-pressed={value.includes(v)} className={value.includes(v) ? 'chip-on' : 'chip-off'}>{v}</button>)}
      </div>
    </div>
  );
}
