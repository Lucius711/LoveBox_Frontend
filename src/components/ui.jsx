import { useSearchParams } from 'react-router-dom';

export const Field = ({ label, children }) => <label className="block"><span className="label">{label}</span>{children}</label>;

export const Row = ({ k, v }) => <div className="flex justify-between gap-4"><span className="text-stone-600">{k}</span><span>{v}</span></div>;

/** Thanh tab lưu tab hiện tại ở ?tab= (giữ khi reload / chia sẻ link). items: [[key, label], ...] */
export function Tabs({ items, active }) {
  const [, setParams] = useSearchParams();
  return (
    <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto border-b border-stone-200">
      {items.map(([k, l]) => (
        <button key={k} onClick={() => setParams({ tab: k })}
          className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium ${active === k ? 'border-ink' : 'border-transparent text-stone-500'}`}>{l}</button>
      ))}
    </div>
  );
}
