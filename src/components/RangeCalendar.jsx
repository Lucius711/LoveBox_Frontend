import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { addDaysISO, fromISO, toISO, todayISO } from '../utils/format';

const WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/**
 * Chọn Ngày nhận (check-in) → Ngày trả (check-out). Ngày đã có người thuê (kèm 1 ngày đệm giặt ủi) bị làm mờ.
 * Khoảng hợp lệ: mọi ngày từ nhận → trả + 1 ngày đệm đều trống (giống ràng buộc EXCLUDE ở DB).
 */
export default function RangeCalendar({ blocked = [], start, end, onChange }) {
  const blockedSet = useMemo(() => new Set(blocked), [blocked]);
  const today = todayISO();
  const [cursor, setCursor] = useState(() => { const d = fromISO(start || today); d.setDate(1); return d; });

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) =>
      toISO(new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)))];
  }, [cursor]);

  const rangeFree = (s, e) => {
    for (let d = s; d <= addDaysISO(e, 1); d = addDaysISO(d, 1)) if (blockedSet.has(d)) return false;
    return true;
  };

  const pick = (d) => {
    if (!start || end || d < start) return onChange(d, null);
    if (!rangeFree(start, d)) {
      toast.error('Khoảng này vướng lịch người khác (kèm 1 ngày giặt ủi). Chọn ngày khác nhé!');
      return onChange(d, null);
    }
    onChange(start, d);
  };

  const move = (n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  const canPrev = cursor > fromISO(today.slice(0, 8) + '01');

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} disabled={!canPrev} aria-label="Tháng trước"
          className="rounded-full p-2 hover:bg-stone-100 disabled:opacity-30"><ChevronLeft size={18} /></button>
        <p className="text-sm font-semibold">Tháng {cursor.getMonth() + 1}/{cursor.getFullYear()}</p>
        <button type="button" onClick={() => move(1)} aria-label="Tháng sau"
          className="rounded-full p-2 hover:bg-stone-100"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-stone-400">
        {WEEK.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`x${i}`} />;
          const disabled = d < today || blockedSet.has(d);
          const edge = d === start || d === end;
          const inRange = start && end && d > start && d < end;
          return (
            <button key={d} type="button" disabled={disabled} onClick={() => pick(d)}
              title={blockedSet.has(d) ? 'Đã có người thuê' : undefined}
              className={`h-10 rounded-lg text-sm transition ${
                edge ? 'bg-ink font-semibold text-white'
                  : inRange ? 'bg-wine-100 text-wine-800'
                  : disabled ? `text-stone-300 ${blockedSet.has(d) ? 'line-through' : ''}`
                  : 'hover:bg-stone-100'}`}>
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-stone-500">
        {!start ? 'Chọn ngày nhận đồ' : !end ? 'Chọn ngày trả đồ' : 'Đã chọn — bấm ngày khác để chọn lại'}
        {' · '}Ngày gạch là đã có người thuê.
      </p>
    </div>
  );
}
