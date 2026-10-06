import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/*
 * Trang chủ kể chuyện theo cuộn, nhịp giống Inkwell:
 *   vòng thẻ chia bài (intro) → cung thẻ xoay + chữ đổi → chồng thẻ 3D → portal gradient WebGL (nhấn giữ đổi giọng văn)
 *   → bong bóng kính → chương sau.
 * Thẻ 3D dùng CSS 3D (nhẹ, sắc nét); WebGL chỉ vẽ nền gradient chuyển động trong portal.
 */

const clamp = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Tiến độ cuộn 0→1 của một section cao (phần sticky bên trong); ahead = section chưa chạm đầu màn hình. */
function useProgress(ref) {
  const [st, setSt] = useState([0, true]);
  useEffect(() => {
    const el = ref.current;
    let raf = 0;
    const up = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.round(clamp(-r.top / (r.height - innerHeight)) * 1000) / 1000, ahead = r.top > 0.5;
      setSt((o) => (o[0] === p && o[1] === ahead ? o : [p, ahead]));
    };
    const req = () => { if (!raf) raf = requestAnimationFrame(up); };
    up(); addEventListener('scroll', req, { passive: true }); addEventListener('resize', req);
    return () => { removeEventListener('scroll', req); removeEventListener('resize', req); cancelAnimationFrame(raf); };
  }, [ref]);
  return st;
}

/* ───────────── Chương 1–2: vòng thẻ → cung thẻ xoay ───────────── */
/** words: [{ label, to, card }] — các loại trang phục đang có; card = 1 món đại diện, được phóng to khi giới thiệu loại đó. */
export function RingIntro({ cards, words, handoff, onAi }) {
  const ref = useRef(null);
  const [p] = useProgress(ref);
  // Mở màn: logo móc treo → thanh treo, quần áo rơi xuống treo thành hàng → bay ra thành vòng (hero).
  // phase: 'logo' → 'rail' → 'ring'. Lăn chuột / chạm / bấm phím là bỏ qua, vào thẳng vòng thẻ.
  const [phase, setPhase] = useState(() => {
    // Mỗi lần vào trang chủ (tải lại hay chuyển trang) đều bắt đầu từ đầu câu chuyện, không khôi phục vị trí cuộn dở
    history.scrollRestoration = 'manual';
    scrollTo({ top: 0, behavior: 'instant' });
    const open = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (open) document.documentElement.dataset.opening = '1';   // ẩn nav + nút chat ngay từ lần vẽ đầu (index.css)
    return open ? 'logo' : 'pre';
  });
  const opened = useRef(phase === 'logo').current;
  const dealt = phase === 'ring';
  // quần áo bay ra thành vòng → nav và nút chat hiện lại; rời trang giữa chừng cũng gỡ cờ
  useEffect(() => {
    if (opened && phase !== 'ring') document.documentElement.dataset.opening = '1'; else delete document.documentElement.dataset.opening;
    return () => { delete document.documentElement.dataset.opening; };
  }, [phase, opened]);
  useEffect(() => {
    if (phase === 'pre') { const t = setTimeout(() => setPhase('ring'), 120); return () => clearTimeout(t); }
    if (phase !== 'logo') return undefined;
    const skip = () => setPhase('ring');
    const t1 = setTimeout(() => setPhase('rail'), 2400);
    const t2 = setTimeout(skip, 3800);
    const evs = ['wheel', 'touchstart', 'keydown'];
    evs.forEach((e) => addEventListener(e, skip, { passive: true }));
    return () => { clearTimeout(t1); clearTimeout(t2); evs.forEach((e) => removeEventListener(e, skip)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sau mở màn → tự chạy tiếp: dừng đọc slogan, rồi tự cuộn hết đoạn vòng → cung xoay → 1 thẻ về giữa.
  // Người xem lăn chuột / chạm / bấm phím là dừng ngay, trả quyền cuộn lại.
  useEffect(() => {
    if (scrollY > 10 || matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const HOLD = opened ? 7300 : 3500, DUR = 7500;
    let raf = 0;
    const stop = () => {
      clearTimeout(timer); cancelAnimationFrame(raf);
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((e) => removeEventListener(e, stop));
    };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((e) => addEventListener(e, stop, { passive: true }));
    const timer = setTimeout(() => {
      const el = ref.current;
      const end = el.offsetTop + el.offsetHeight - innerHeight;
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / DUR);
        scrollTo({ top: end * ease(k), behavior: 'instant' });   // 'instant': html đang để scroll-behavior: smooth
        if (k < 1) raf = requestAnimationFrame(step); else stop();
      };
      raf = requestAnimationFrame(step);
    }, HOLD);
    return stop;
  }, [opened]);

  const N = 24;
  const intro = 1 - clamp(p / 0.1);             // chữ giữa vòng mờ dần
  const zoom = ease(clamp((p - 0.08) / 0.27));  // vòng phóng to thành cung
  const spin = clamp((p - 0.32) / 0.56);         // rồi lần lượt từng loại trang phục
  const final = ease(clamp((p - 0.9) / 0.1));     // nối sang chương sau: vòng mờ, 1 thẻ về giữa màn hình
  const wi = Math.max(0, Math.min(words.length - 1, Math.floor(spin * words.length)));
  const focusOn = zoom > 0.6 && words.length > 0;

  // Thẻ đại diện của từng loại nằm ở các ô cách đều trên vòng; vòng xoay để ô của loại đang giới thiệu lên đỉnh.
  const slotOf = (k) => Math.round((k * N) / Math.max(1, words.length)) % N;
  const slots = Array.from({ length: N }, (_, i) => cards[i % Math.max(1, cards.length)] || {});
  words.forEach((w, k) => { if (w.card) slots[slotOf(k)] = w.card; });
  const activeSlot = words.length ? slotOf(wi) : -1;

  // Sau khi chia thẻ xong mới cho thẻ phản ứng nhanh (bỏ độ trễ so le lúc chia)
  const [settled, setSettled] = useState(false);
  useEffect(() => { if (!dealt) return undefined; const t = setTimeout(() => setSettled(true), 100 + N * 30 + 1700); return () => clearTimeout(t); }, [dealt]);
  const rowX = (i) => `calc(var(--R) * ${((i - N / 2 + 0.5) * 0.19).toFixed(2)})`;   // vị trí trên thanh treo

  return (
    <section ref={ref} className="relative h-[460vh]" style={{ '--R': 'min(40vw, 34vh)' }}>
      <div className="sticky top-0 h-screen overflow-hidden [perspective:1400px]">
        {/* lớp ngoài: phóng to + hạ vòng xuống để đỉnh cung nằm ở ~38% màn hình (không bị header che) */}
        <div className="absolute left-1/2 top-1/2 h-0 w-0"
          style={{ opacity: 1 - final, transformOrigin: '0 0', transform: `translateY(calc((var(--R) * 1.6 - 12vh) * ${zoom.toFixed(3)})) rotateX(${(1 - zoom) * 24}deg) scale(${1 + zoom * 0.6})` }}>
          {/* lớp trong: xoay để thẻ của loại đang giới thiệu lên đỉnh */}
          <div className="h-0 w-0 transition-transform duration-[900ms] ease-[cubic-bezier(.65,0,.35,1)]"
            style={{ transformOrigin: '0 0', transform: `rotate(${focusOn ? (-activeSlot * 360) / N : 0}deg)` }}>
            {slots.map((c, i) => {
              const a = (i / N) * 360;
              const on = focusOn && i === activeSlot;
              const img = <img src={c.src} alt={c.name || ''} loading={i < 8 ? 'eager' : 'lazy'} className="h-full w-full object-cover" />;
              return (
                <div key={i} className="absolute left-0 top-0"
                  style={{
                    transformOrigin: '0 0',   // xoay quanh tâm vòng, không phải tâm thẻ
                    // mở trang: thẻ nằm thành 1 hàng ngang → bay về vòng tròn; thẻ đang giới thiệu phóng to, đứng thẳng
                    transform: phase === 'logo' || phase === 'pre' ? `translateX(${rowX(i)}) translateY(-75vh) rotate(${(i * 53) % 30 - 15}deg) scale(.8)`
                      : phase === 'rail' ? `translateX(${rowX(i)}) rotate(${(i * 37) % 10 - 5}deg) scale(.8)`
                        : on ? `rotate(${a}deg) translateY(calc(var(--R) * -1.12)) scale(2)`
                          : `rotate(${a}deg) translateY(calc(var(--R) * -1)) rotateX(22deg)`,
                    opacity: phase === 'logo' || phase === 'pre' ? 0.0001 : focusOn && !on ? 0.45 : 1,
                    zIndex: on ? 10 : 1,
                    transition: settled ? 'transform .8s cubic-bezier(.65,0,.35,1), opacity .6s ease'
                      : phase === 'rail' ? 'transform .9s cubic-bezier(.34,1.56,.64,1), opacity .3s ease'   // rơi xuống, đung đưa nhẹ
                        : 'transform 1.6s cubic-bezier(.65,0,.35,1), opacity .5s ease',
                    transitionDelay: settled ? '0ms' : phase === 'rail' ? `${Math.abs(i - N / 2) * 35}ms` : `${100 + i * 30}ms`,
                  }}>
                  <div className={`aspect-[3/4] w-[calc(var(--R)*.23)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[10%] bg-stone-200 ${on ? 'shadow-[0_18px_40px_-12px_rgba(28,25,23,.55)] ring-1 ring-white' : 'shadow-[0_10px_30px_-10px_rgba(28,25,23,.45)]'}`}>
                    {c.id ? <Link to={c.to} aria-label={c.name} tabIndex={-1}>{img}</Link> : img}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* thẻ bàn giao: chính thẻ đang phóng to ở đỉnh cung bay về giữa màn hình; chồng thẻ ở chương sau
            bắt đầu bằng đúng món này (HomePage xếp nó lên đầu) → nối liền, không đổi ảnh */}
        {handoff && final > 0 && slots[activeSlot]?.src && (
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 aspect-[3/4] w-[min(250px,46vw)] overflow-hidden rounded-[18px] shadow-[0_30px_60px_-25px_rgba(28,25,23,.5)]"
            style={{ transform: `translate(-50%, calc(-50% + (-12vh - var(--R) * .19) * ${(1 - final).toFixed(3)})) scale(${(0.8 + final * 0.2).toFixed(3)})` }}>
            <img src={slots[activeSlot]?.src} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        {/* mở màn: móc treo + chữ Lentique, rồi thanh treo nơi quần áo rơi xuống */}
        {opened && (
          <>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(.65,0,.35,1)]"
              style={{ opacity: phase === 'logo' ? 1 : 0, transform: phase === 'logo' ? 'none' : 'translateY(-14vh) scale(.7)' }}>
              {/* logo Lentique (logo-mark.png): 2 vai móc vẽ trước, rồi chữ L viết liền 1 nét từ đầu móc */}
              <svg viewBox="0 0 300 234" className="w-32 text-ink md:w-44" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path pathLength="1" className="lk-draw" style={{ animationDuration: '.7s' }} d="M122 103 L22 168 C8 178 10 200 34 202" />
                <path pathLength="1" className="lk-draw" style={{ animationDuration: '.7s', animationDelay: '.2s' }} d="M166 99 L276 168 C290 178 288 199 266 201" />
                <path pathLength="1" className="lk-draw" style={{ animationDuration: '1.5s', animationDelay: '.6s' }}
                  d="M118 52 C108 18 140 2 166 7 C194 13 196 46 177 68 C156 92 137 121 129 151 C123 173 118 188 103 198 C86 210 58 217 53 205 C48 191 80 185 106 192 C140 201 180 209 214 204 C231 201 242 194 248 186" />
              </svg>
              <p className="mt-5 overflow-hidden"><span className="lk-rise block text-5xl font-light tracking-tight md:text-7xl">Lentique</span></p>
              <p className="lk-fade mt-3 font-mono text-[10px] uppercase tracking-[.35em] text-stone-400">Tủ đồ chung cho những dịp đặc biệt</p>
            </div>
            <span aria-hidden="true" className="pointer-events-none absolute left-[6%] right-[6%] h-px origin-center bg-stone-400 transition-all duration-700"
              style={{ top: 'calc(50% - var(--R) * .135)', opacity: phase === 'rail' ? 1 : 0, transform: `scaleX(${phase === 'logo' ? 0 : 1})` }} />
          </>
        )}

        {/* giữa vòng */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={{ opacity: intro, pointerEvents: intro > 0.5 ? 'auto' : 'none' }}>
          <h1 className="lk-late max-w-[18ch] text-3xl font-light leading-tight tracking-tight md:text-5xl" style={{ animationDelay: opened ? '5.3s' : '1.7s' }}>Thích là diện, <span className="text-wine-600">thuê là tiện.</span></h1>
          <div className="lk-late mt-6 flex gap-3" style={{ animationDelay: opened ? '5.7s' : '2.1s' }}>
            <button onClick={onAi} className="btn-dark px-5 py-2.5">Tìm đồ cùng AI</button>
            <Link to="/products" className="btn-ghost px-5 py-2.5">Xem kho đồ</Link>
          </div>
        </div>

        {/* ngay dưới thẻ đang phóng to: đường chỉ lên thẻ + tên loại trang phục (bấm để xem) */}
        <div className="absolute inset-x-0 flex flex-col items-center text-center"
          style={{ top: 'calc(38vh + var(--R) * .62)', opacity: focusOn ? 1 - final : 0, pointerEvents: focusOn ? 'auto' : 'none', transition: 'opacity .5s ease' }}>
          <span aria-hidden="true" className="mb-3 h-8 w-px bg-stone-400" />
          <p className="font-mono text-[10px] uppercase tracking-[.3em] text-stone-400">Các mẫu đang có · {String(wi + 1).padStart(2, '0')} / {String(words.length).padStart(2, '0')}</p>
          {words[wi] && (
            <Link key={wi} to={words[wi].to} className="lk-morph mt-1 inline-block text-2xl font-light hover:text-wine-600 md:text-4xl">
              {words[wi].label} <span className="text-stone-400">→</span>
            </Link>
          )}
          {words[wi]?.card?.name && <p key={`n${wi}`} className="lk-morph mt-1 text-sm text-stone-500">{words[wi].card.name}</p>}
        </div>

        <p className="absolute inset-x-0 bottom-6 text-center font-mono text-[10px] uppercase tracking-[.3em] text-stone-400" style={{ opacity: intro }}>
          Cuộn để khám phá
        </p>
      </div>
    </section>
  );
}

/* ───────────── Chương 3: chồng thẻ 3D — tách ra từ 1 thẻ, cuối chương gom lại thành 1 thẻ ───────────── */
/**
 * overlap: chồng lên 100vh cuối của chương trước (nối cảnh, chương trước kết thúc bằng 1 thẻ giữa màn hình).
 * from: ảnh thẻ cuối của kệ trước → thẻ đó lật đi để lộ kệ này đang xoè ra (bật overlap). ranked: hạng 01–03.
 */
export function CardStack({ kicker, title, items, overlap, from, ranked }) {
  const ref = useRef(null);
  const [p, ahead] = useProgress(ref);
  const n = items.length;
  const flip = ease(clamp(p / 0.08));   // thẻ của kệ trước lật đi
  const spread = ease(clamp(p / 0.12)) * (1 - ease(clamp((p - 0.86) / 0.14)));   // 0 = gom ở giữa, 1 = xếp chồng
  const off = clamp((p - 0.12) / 0.7) * (n - 1);
  const active = Math.min(n - 1, Math.round(off));
  const cur = items[active];
  const jump = (i) => {
    const el = ref.current;
    scrollTo({ top: el.offsetTop + (0.12 + (0.7 * i) / Math.max(1, n - 1)) * (el.offsetHeight - innerHeight), behavior: 'smooth' });
  };
  return (
    <section ref={ref} className={`relative ${overlap || from ? '-mt-[100vh]' : ''}`} style={{ height: `${160 + n * 55}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden bg-cream [perspective:1400px]" style={{ visibility: (overlap || from) && ahead ? 'hidden' : 'visible' }}>
        <div className="absolute left-4 top-28 md:left-[6vw]" style={{ opacity: spread }}>
          <p className="font-mono text-[10px] uppercase tracking-[.3em] text-wine-600">{kicker}</p>
          <h2 className="mt-1 font-serif text-3xl md:text-5xl">{title}</h2>
        </div>

        <div className="absolute [transform-style:preserve-3d]" style={{ left: `${50 - spread * 12}%`, top: `${50 + spread * 8}%` }}>
          {items.map((it, i) => {
            const k = i - off;
            if (k < -1.3 || k > 6) return null;
            return (
              <Link key={it.id} to={it.to} aria-label={it.name} tabIndex={k > 0.5 || k < -0.5 ? -1 : 0}
                className="absolute aspect-[3/4] w-[min(250px,46vw)] overflow-hidden rounded-[18px] bg-stone-200 shadow-[0_30px_60px_-25px_rgba(28,25,23,.5)]"
                style={{
                  transform: `translate(-50%, -50%) translate3d(${k * 9 * spread}vw, ${-k * 7 * spread}vh, ${-k * 200 * spread}px) rotateY(${-30 * spread}deg) rotateX(${6 * spread}deg)`,
                  opacity: k < 0 ? clamp(1 + k / 1.3) : clamp(1 - (k - 4) / 2),
                  zIndex: 100 - i,
                }}>
                <img src={it.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                {ranked && i < 3 && <span className="absolute left-3 top-2 font-mono text-4xl font-light text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.5)]">{String(i + 1).padStart(2, '0')}</span>}
              </Link>
            );
          })}
        </div>

        {from && flip < 1 && (
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[200] aspect-[3/4] w-[min(250px,46vw)] overflow-hidden rounded-[18px] shadow-[0_30px_60px_-25px_rgba(28,25,23,.5)]"
            style={{ transform: `translate(-50%, -50%) rotateY(${(flip * 90).toFixed(1)}deg) scale(${(1 - flip * 0.15).toFixed(3)})`, opacity: 1 - flip * 0.6 }}>
            <img src={from} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        {cur && (
          <div key={active} className="lk-morph absolute bottom-10 left-4 max-w-xs md:left-[6vw]" style={{ opacity: spread }}>
            <p className="font-mono text-[10px] uppercase tracking-[.25em] text-stone-500">{ranked && active < 3 ? `Top ${active + 1} · ` : ''}{cur.meta}</p>
            <p className="mt-1 font-serif text-2xl md:text-3xl">{cur.name}</p>
            <p className="mt-1 text-sm text-stone-600">{cur.price}</p>
            <Link to={cur.to} className="mt-3 inline-block border-b border-ink pb-0.5 text-sm font-medium">Xem chi tiết →</Link>
          </div>
        )}

        <ul className="absolute bottom-10 right-4 hidden flex-col items-end gap-2 md:right-[6vw] md:flex" style={{ opacity: spread }}>
          {items.map((it, i) => (
            <li key={it.id}>
              <button onClick={() => jump(i)}
                className={`max-w-[14rem] truncate rounded-full border px-4 py-1.5 text-xs transition-colors duration-500 ${i === active ? 'border-ink bg-ink text-white' : 'border-stone-300 text-stone-500 hover:border-ink'}`}>
                {it.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────── Nền gradient WebGL (chỉ chạy khi đang thấy) ───────────── */
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const GVERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const GFRAG = `
precision mediump float;
uniform vec2 uRes; uniform float uTime; uniform vec3 uC0, uC1, uC2;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float t = uTime * .08;
  float w = uv.y + .09 * sin(uv.x * 3. + t * 2.) + .06 * sin(uv.x * 7. - t * 3. + uv.y * 4.) + .05 * sin(uv.y * 9. + t * 1.7) * sin(uv.x * 5. - t);
  vec3 c = w > .5 ? mix(uC1, uC0, smoothstep(.5, 1., w)) : mix(uC2, uC1, smoothstep(0., .5, w));
  c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5) * .035;
  gl_FragColor = vec4(c, 1.);
}`;
export function GradientGL({ colors, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    const gl = cv.getContext('webgl', { antialias: false, powerPreference: 'low-power' });
    if (!gl) { cv.style.display = 'none'; return undefined; }   // còn nền CSS gradient phía sau
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, GVERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, GFRAG)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.style.display = 'none'; return undefined; }
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const u = (k) => gl.getUniformLocation(pr, k);
    colors.forEach((c, i) => gl.uniform3fv(u(`uC${i}`), hex(c)));
    const uRes = u('uRes'), uTime = u('uTime');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, visible = false;
    const frame = (now) => {
      raf = 0;
      const k = Math.min(1.5, devicePixelRatio || 1) * 0.5;
      const w = Math.round(cv.clientWidth * k), h = Math.round(cv.clientHeight * k);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
      gl.uniform2f(uRes, w, h); gl.uniform1f(uTime, still ? 0 : now / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (visible && !still) raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); });
    io.observe(cv);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [colors]);
  return (
    <div className={className} style={{ background: `linear-gradient(to bottom, ${colors.join(', ')})` }}>
      <canvas ref={ref} aria-hidden="true" className="h-full w-full" />
    </div>
  );
}

/* ───────────── Chương 4: portal nở ra từ khung thẻ ở giữa màn hình, kể 3 bước thuê ───────────── */
/** from: ảnh thẻ cuối của chồng thẻ ngay trước (có thì chồng lên 100vh cuối của nó để nối liền). */
export function Portal({ kicker, steps, colors, from, onAi }) {
  const ref = useRef(null);
  const [p, ahead] = useProgress(ref);
  const open = ease(clamp(p / 0.2));
  const step = Math.min(steps.length - 1, Math.floor(clamp((p - 0.2) / 0.72) * steps.length));
  const out = 1 - clamp((p - 0.93) / 0.07);
  const s = steps[step];
  const c = (1 - open).toFixed(3);
  return (
    <section ref={ref} className={`relative h-[380vh] ${from ? '-mt-[100vh]' : ''}`}>
      {/* --o = nửa chênh lệch padding trên/dưới, để khung nhỏ ban đầu nằm đúng tâm màn hình như thẻ trước đó */}
      <div className="sticky top-0 h-screen bg-cream p-3 pt-20 [--o:34px] md:p-4 md:pt-24 md:[--o:40px]" style={{ visibility: ahead ? 'hidden' : 'visible' }}>
        {/* lúc đầu khung = đúng cỡ thẻ (250×333) ở giữa màn hình, rồi nở ra kín khung */}
        <div className="relative h-full w-full overflow-hidden"
          style={{ clipPath: `inset(max(0px, calc((50% - min(167px, 31vw) - var(--o)) * ${c})) max(0px, calc((50% - min(125px, 23vw)) * ${c})) max(0px, calc((50% - min(167px, 31vw) + var(--o)) * ${c})) round ${(18 + open * 10).toFixed(1)}px)` }}>
          <GradientGL colors={colors} className="absolute inset-0" />
          {from && open < 1 && (
            <img src={from} alt="" aria-hidden="true" className="absolute left-1/2 aspect-[3/4] w-[min(250px,46vw)] object-cover"
              style={{ top: 'calc(50% - var(--o))', transform: `translate(-50%, -50%) scale(${(1 + open * 2).toFixed(3)})`, opacity: 1 - clamp(open / 0.5) }} />
          )}
          <div className="relative flex h-full flex-col items-center justify-between px-6 py-10 text-center text-white" style={{ opacity: Math.min(open, out) }}>
            <p className="font-mono text-[10px] uppercase tracking-[.3em] text-white/70">{kicker} · 0{step + 1} / 0{steps.length}</p>

            <div>
              <p key={`t${step}`} className="lk-morph font-mono text-[11px] uppercase tracking-[.3em] text-white/80">{s.title}</p>
              <p key={step} className="lk-morph mx-auto mt-4 max-w-3xl text-3xl font-light leading-tight tracking-tight md:text-5xl">{s.text}</p>
              {step === 0 && <button onClick={onAi} className="btn mt-8 bg-white px-5 py-2.5 text-ink hover:bg-wine-50">Thử trợ lý AI</button>}
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2" aria-hidden="true">
                {steps.map((x, i) => <span key={x.title} className={`h-1 rounded-full bg-white transition-all duration-500 ${i === step ? 'w-10' : 'w-3 opacity-40'}`} />)}
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[.3em] text-white/70">Cuộn tiếp</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Chương 5: bong bóng kính trôi quanh khối kính giữa (cùng khung với portal) ───────────── */
const BUBBLES = [[8, 14, 150], [78, 10, 120], [88, 46, 170], [70, 76, 130], [14, 70, 180], [40, 6, 90], [30, 84, 100], [58, 30, 80], [22, 40, 70]];
/** Tiếp nối portal "Cách thuê": cùng khung & cùng gradient, chồng lên 100vh cuối của nó;
 *  bong bóng ảnh lần lượt nở ra, rồi khối kính + nội dung hiện lên — 2 cảnh như 1 khung liền. */
export function Bubbles({ images, colors, children }) {
  const ref = useRef(null);
  const [q, ahead] = useProgress(ref);
  const pop = (i) => ease(clamp((q - 0.04 - i * 0.035) / 0.14));
  const show = ease(clamp((q - 0.2) / 0.16)) * (1 - ease(clamp((q - 0.78) / 0.1)));
  const shrink = ease(clamp((q - 0.8) / 0.2));   // cuối chương: khung thu lên, chừa chỗ cho chữ Lentique
  return (
    <section ref={ref} className="relative -mt-[100vh] h-[300vh]">
      <div className="sticky top-0 h-screen bg-cream p-3 pt-20 md:p-4 md:pt-24" style={{ visibility: ahead ? 'hidden' : 'visible' }}>
        <div className="relative h-full overflow-hidden rounded-[28px]" style={{ clipPath: `inset(0 0 ${(shrink * 62).toFixed(1)}% 0 round 28px)` }}>
          <GradientGL colors={colors} className="absolute inset-0" />
          {BUBBLES.map(([x, y, s], i) => images[i] && (
            <div key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%`, width: `min(${s * 1.3}px, ${s / 4}vw + 50px)`, aspectRatio: 1, transform: `scale(${pop(i).toFixed(3)})`, opacity: pop(i) }}>
              <div className="lk-bob h-full w-full"
                style={{ animationDuration: `${7 + (i % 4) * 2}s`, animationDelay: `${-i * 1.3}s`, filter: s < 100 ? 'blur(2px)' : undefined, opacity: s < 100 ? 0.75 : 1,
                  maskImage: 'radial-gradient(circle, #000 52%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle, #000 52%, transparent 70%)' }}>
                <img src={images[i]} alt="" loading="lazy" className="h-full w-full object-cover" />
              </div>
            </div>
          ))}
          <div className="relative flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-8 text-center text-white"
            style={{ opacity: show, transform: `translateY(${((1 - show) * 30).toFixed(1)}px)`, pointerEvents: show > 0.5 ? 'auto' : 'none' }}>
            <div className="lk-blob flex h-28 w-28 shrink-0 items-center justify-center border border-white/40 bg-white/15 shadow-2xl backdrop-blur-xl md:h-40 md:w-40"
              style={{ transform: `scale(${(0.6 + show * 0.4).toFixed(3)})` }}>
              <svg viewBox="0 0 300 234" className="w-16 text-white md:w-24" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M122 103 L22 168 C8 178 10 200 34 202" />
                <path d="M166 99 L276 168 C290 178 288 199 266 201" />
                <path d="M118 52 C108 18 140 2 166 7 C194 13 196 46 177 68 C156 92 137 121 129 151 C123 173 118 188 103 198 C86 210 58 217 53 205 C48 191 80 185 106 192 C140 201 180 209 214 204 C231 201 242 194 248 186" />
              </svg>
            </div>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Kết: logo vẽ nét theo cuộn, chữ Lentique trồi lên từng chữ (khung bong bóng cuộn đi phía trên) ───────────── */
export function Wordmark({ tagline }) {
  const ref = useRef(null);
  const [r, ahead] = useProgress(ref);
  const word = 'Lentique';
  const draw = clamp(r / 0.45);
  return (
    <section ref={ref} aria-label="Lentique" className="relative -mt-[100vh] h-[200vh]">
      <div className="pointer-events-none sticky top-0 flex h-screen flex-col items-center justify-end pb-[12vh]" style={{ visibility: ahead ? 'hidden' : 'visible' }}>
        <svg viewBox="0 0 300 234" className="mb-4 w-20 text-ink md:w-28" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path pathLength="1" strokeDasharray="1" strokeDashoffset={1 - clamp(draw / 0.4)} d="M122 103 L22 168 C8 178 10 200 34 202" />
          <path pathLength="1" strokeDasharray="1" strokeDashoffset={1 - clamp((draw - 0.1) / 0.4)} d="M166 99 L276 168 C290 178 288 199 266 201" />
          <path pathLength="1" strokeDasharray="1" strokeDashoffset={1 - clamp((draw - 0.3) / 0.7)}
            d="M118 52 C108 18 140 2 166 7 C194 13 196 46 177 68 C156 92 137 121 129 151 C123 173 118 188 103 198 C86 210 58 217 53 205 C48 191 80 185 106 192 C140 201 180 209 214 204 C231 201 242 194 248 186" />
        </svg>
        <p aria-hidden="true" className="flex text-[21vw] font-medium leading-[.9] tracking-[-.06em]">
          {[...word].map((ch, i) => {
            const k = ease(clamp((r - 0.08 - i * 0.045) / 0.3));
            return (
              <span key={i} className="inline-block overflow-hidden pb-[.08em]">
                <span className="inline-block" style={{ transform: `translateY(${((1 - k) * 110).toFixed(1)}%) rotate(${((1 - k) * 8).toFixed(1)}deg)`, transformOrigin: 'left bottom' }}>{ch}</span>
              </span>
            );
          })}
        </p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[.35em] text-stone-500" style={{ opacity: clamp((r - 0.55) / 0.2) }}>{tagline}</p>
      </div>
    </section>
  );
}
