const variants = {
  primary: 'bg-pink-500 hover:bg-pink-600 text-white shadow-md',
  outline: 'border-2 border-pink-400 text-pink-500 hover:bg-pink-50',
  ghost: 'text-pink-500 hover:bg-pink-50',
  danger: 'bg-red-400 hover:bg-red-500 text-white',
};
const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base font-semibold' };

export default function Button({ children, variant='primary', size='md', className='', loading=false, ...props }) {
  return (
    <button {...props} disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}>
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
}
