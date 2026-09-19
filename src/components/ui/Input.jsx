export default function Input({ label, error, className='', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-pink-900">{label}</label>}
      <input {...props} className={`w-full px-4 py-2.5 rounded-xl border border-pink-200 bg-white/70 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition text-pink-900 ${error ? 'border-red-400' : ''} ${className}`} />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
export function Textarea({ label, error, className='', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-pink-900">{label}</label>}
      <textarea {...props} rows={props.rows||3} className={`w-full px-4 py-2.5 rounded-xl border border-pink-200 bg-white/70 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition resize-none text-pink-900 ${error ? 'border-red-400' : ''} ${className}`} />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
