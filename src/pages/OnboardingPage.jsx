import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../layouts/MainLayout';
import StyleProfileForm, { emptyProfile, STEPS, toRequest } from '../components/StyleProfileForm';
import { errorMessage, getMeta, saveStyleProfile } from '../services/api';

/** Thiết lập hồ sơ lần đầu: mỗi câu hỏi 1 màn, có thể bỏ qua. Xong → lưu vào tài khoản. */
export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [value, setValue] = useState(() => emptyProfile(user?.styleProfile));
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getMeta().then(setMeta).catch(() => toast.error('Không tải được dữ liệu')); }, []);

  const finish = async (body) => {
    setSaving(true);
    try {
      await saveStyleProfile(body);
      await refreshUser();
      toast.success('Đã lưu hồ sơ — gợi ý sẽ hợp với bạn hơn!');
      navigate('/', { replace: true });
    } catch (e) { toast.error(errorMessage(e)); setSaving(false); }
  };

  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="flex h-16 items-center justify-between px-4">
        <Logo />
        <button disabled={saving} onClick={() => finish({})} className="text-sm text-stone-500 underline">Bỏ qua</button>
      </header>
      <div className="h-1 bg-stone-200"><div className="h-1 bg-wine-600 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-wine-600">Câu {step + 1}/{STEPS.length}</p>
        <h1 className="mt-1 font-serif text-3xl leading-tight">{s.title}</h1>
        <p className="mt-2 text-sm text-stone-500">{s.hint}</p>
        <div className="mt-6">{meta && <StyleProfileForm meta={meta} value={value} onChange={setValue} only={s.key} />}</div>

        <div className="mt-auto flex gap-3 pt-10">
          {step > 0 && <button onClick={() => setStep(step - 1)} className="btn-ghost flex-1 py-3">Quay lại</button>}
          <button disabled={saving} onClick={() => (last ? finish(toRequest(value)) : setStep(step + 1))} className="btn-wine flex-1 py-3">
            {last ? (saving ? 'Đang lưu…' : 'Hoàn tất') : 'Tiếp tục'}
          </button>
        </div>
      </main>
    </div>
  );
}
