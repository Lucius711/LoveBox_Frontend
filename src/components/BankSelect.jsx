/** Chọn ngân hàng nhận hoàn cọc — danh sách từ backend (admin chuyển khoản hoàn cọc thủ công về STK này). */
export default function BankSelect({ banks, value, onChange, required }) {
  return (
    <select className="input" value={value} onChange={onChange} required={required}>
      <option value="">— Chọn ngân hàng —</option>
      {value && !banks.includes(value) && <option value={value} disabled>{value} (không còn trong danh sách)</option>}
      {banks.map((b) => <option key={b}>{b}</option>)}
    </select>
  );
}
