import { formatCurrency } from '../utils/format';

const BUDGETS = [100000, 200000, 300000, 500000];

/**
 * Các câu hỏi hồ sơ phong cách — dùng chung cho onboarding (từng bước) và trang Hồ sơ (hiện hết).
 * value: { heightCm, weightKg, bust, waist, hip, clothingSize, budgetMax, favOccasions[], favStyles[], favColors[], fitNote }
 */
export const STEPS = [
  { key: 'occasions', title: 'Bạn thường cần đồ cho dịp nào?', hint: 'Chọn bao nhiêu cũng được' },
  { key: 'body', title: 'Chiều cao & cân nặng của bạn', hint: 'Để gợi ý đúng size — chỉ dùng cho việc chọn đồ' },
  { key: 'measure', title: 'Số đo 3 vòng hoặc size bạn hay mặc', hint: 'Không bắt buộc. Không nhớ số đo thì chọn size quần áo bạn thường mua' },
  { key: 'styles', title: 'Phong cách bạn thích?', hint: 'Chọn vài phong cách hợp gu' },
  { key: 'colors', title: 'Tông màu yêu thích?', hint: 'Mình sẽ ưu tiên những màu này' },
  { key: 'budget', title: 'Ngân sách thuê mỗi ngày?', hint: 'Mức tối đa cho 1 ngày thuê' },
  { key: 'note', title: 'Điều gì về vóc dáng bạn muốn lưu ý?', hint: 'VD: bắp tay hơi to muốn che, thích kín đáo, không mặc hở lưng…' },
];

export const emptyProfile = (p = {}) => ({
  heightCm: p.heightCm ?? '', weightKg: p.weightKg ?? '', bust: p.bust ?? '', waist: p.waist ?? '', hip: p.hip ?? '', clothingSize: p.clothingSize ?? '',
  budgetMax: p.budgetMax ?? '', favOccasions: p.favOccasions ?? [], favStyles: p.favStyles ?? [],
  favColors: p.favColors ?? [], fitNote: p.fitNote ?? '',
});

const num = (v) => (v === '' || v == null ? null : Number(v));
export const toRequest = (v) => ({
  ...v, heightCm: num(v.heightCm), weightKg: num(v.weightKg), bust: num(v.bust), waist: num(v.waist),
  hip: num(v.hip), clothingSize: v.clothingSize || null, budgetMax: num(v.budgetMax),
});

export default function StyleProfileForm({ meta, value, onChange, only }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  const toggle = (k, v) => set(k, value[k].includes(v) ? value[k].filter((x) => x !== v) : [...value[k], v]);
  const show = (k) => !only || only === k;
  const input = (k, label, min, max) => (
    <label className="block">
      <span className="label">{label}</span>
      <input type="number" inputMode="numeric" min={min} max={max} className="input" value={value[k]} onChange={(e) => set(k, e.target.value)} />
    </label>
  );

  return (
    <div className="space-y-6">
      {STEPS.filter((s) => show(s.key)).map((s) => (
        <section key={s.key}>
          {!only && <h3 className="mb-1 font-semibold">{s.title}</h3>}
          {!only && <p className="mb-3 text-xs text-stone-500">{s.hint}</p>}
          {s.key === 'occasions' && <Chips all={meta.occasions} on={value.favOccasions} toggle={(v) => toggle('favOccasions', v)} />}
          {s.key === 'styles' && <Chips all={meta.styles} on={value.favStyles} toggle={(v) => toggle('favStyles', v)} />}
          {s.key === 'colors' && <Chips all={meta.colors} on={value.favColors} toggle={(v) => toggle('favColors', v)} />}
          {s.key === 'body' && <div className="grid grid-cols-2 gap-3">{input('heightCm', 'Chiều cao (cm)', 120, 210)}{input('weightKg', 'Cân nặng (kg)', 30, 150)}</div>}
          {s.key === 'measure' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">{input('bust', 'Ngực', 50, 200)}{input('waist', 'Eo', 40, 200)}{input('hip', 'Mông', 50, 200)}</div>
              <div>
                <span className="label">Hoặc size bạn hay mặc</span>
                <div className="flex flex-wrap gap-2">
                  {meta.sizes.map((z) => (
                    <button key={z} type="button" aria-pressed={value.clothingSize === z} onClick={() => set('clothingSize', value.clothingSize === z ? '' : z)}
                      className={value.clothingSize === z ? 'chip-on' : 'chip-off'}>{z}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {s.key === 'budget' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {BUDGETS.map((b) => (
                  <button key={b} type="button" onClick={() => set('budgetMax', String(b))}
                    className={String(value.budgetMax) === String(b) ? 'chip-on' : 'chip-off'}>≤ {formatCurrency(b)}</button>
                ))}
              </div>
              {input('budgetMax', 'Hoặc nhập số khác (VND/ngày)', 0)}
            </div>
          )}
          {s.key === 'note' && (
            <textarea rows={3} maxLength={500} className="input" value={value.fitNote} onChange={(e) => set('fitNote', e.target.value)}
              placeholder="VD: Mình hơi thấp, bắp tay to nên muốn che tay, thích dáng xoè…" aria-label={s.title} />
          )}
        </section>
      ))}
    </div>
  );
}

function Chips({ all, on, toggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {all.map((v) => (
        <button key={v} type="button" onClick={() => toggle(v)} aria-pressed={on.includes(v)} className={on.includes(v) ? 'chip-on' : 'chip-off'}>{v}</button>
      ))}
    </div>
  );
}
