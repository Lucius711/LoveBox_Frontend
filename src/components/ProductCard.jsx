import { Link } from 'react-router-dom';
import { ROUTES } from '../constants';
import { formatCurrency, isSale } from '../utils/format';

export default function ProductCard({ p, badge }) {
  return (
    <div className="group flex flex-col">
      <Link to={ROUTES.PRODUCT(p.id)} className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-stone-200">
        {p.image && (
          <img src={p.image} alt={p.name} loading="lazy" decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold">Size {p.size}</span>
        {isSale(p) && !badge && <span className="absolute right-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Thanh lý</span>}
        {badge && <span className="absolute right-2 top-2 rounded-full bg-wine-600 px-2 py-0.5 text-[11px] font-semibold text-white">{badge}</span>}
      </Link>
      <div className="mt-2.5 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-stone-500">{p.category}</p>
        <Link to={ROUTES.PRODUCT(p.id)} className="line-clamp-2 text-sm font-medium leading-snug hover:text-wine-600">{p.name}</Link>
        <p className="mt-1 text-sm font-semibold">
          {isSale(p) ? formatCurrency(p.salePrice) : <>{formatCurrency(p.rentPricePerDay)}<span className="font-normal text-stone-500">/ngày</span></>}
        </p>
      </div>
    </div>
  );
}
