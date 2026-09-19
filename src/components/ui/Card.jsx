export default function Card({ children, className='', hover=false }) {
  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 ${hover ? 'hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  );
}
