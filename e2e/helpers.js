import crypto from 'node:crypto';
import pg from 'pg';
import { expect, request } from '@playwright/test';

// ── Cấu hình môi trường test: sửa trực tiếp ở đây (local / staging / prod), biến môi trường cùng tên sẽ ghi đè ──
const CONFIG = {
  API_URL: 'http://localhost:7070/api',   // backend, có /api (= VITE_API_BASE_URL)
  JWT_SECRET: 'ZQaePhzgQQwEuM7uVnng7wlqKxwR2MsQAchllg26UFtl7ObUvUoWsZ/Xz993/1gkUOkIDdSz3q5QgapD1XlRTg==', // = JWT_SECRET của backend
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_NAME: 'lovebox_data',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
};
const env = (k) => process.env[`E2E_${k}`] ?? CONFIG[k];

export const API = String(env('API_URL')).replace(/\/+$/, '');
const JWT_SECRET = env('JWT_SECRET');

// Tài khoản test cố định — global-setup reset lại mỗi lần chạy
const u = (n, key, role, onboarded = true) => ({
  id: `00000000-0000-0000-0000-000000e2e00${n}`, sub: `e2e-${key}`, email: `e2e-${key}@lentique.test`,
  name: `E2E ${key}`, role, onboarded,
});
export const USERS = {
  renter: u(1, 'renter', 'RENTER'),
  newbie: u(2, 'newbie', 'RENTER', false), // chưa onboarding
  fresh: u(3, 'fresh', 'RENTER'),          // gửi đơn làm Chủ đồ → được duyệt
  owner: u(4, 'owner', 'OWNER'),
  admin: u(5, 'admin', 'ADMIN'),
  stylist: u(6, 'stylist', 'RENTER'),  // riêng cho test AI (hồ sơ bị đổi liên tục); đơn Chủ đồ bị từ chối
};
/** Đồ APPROVED của e2e owner (seed trong global-setup) để test luồng thuê. */
export const E2E_PRODUCT = { id: '00000000-0000-0000-0000-0000000e2ea1', name: 'E2E Đầm thử nghiệm đỏ đô' };
/** Đồ THANH LÝ (bán đứt) APPROVED của e2e owner: SALE mua → giao → hoàn tất; SALE2 dùng cho huỷ / giỏ trộn. */
export const E2E_SALE = { id: '00000000-0000-0000-0000-0000000e2eb1', name: 'E2E Đầm thanh lý xanh navy', price: 350000 };
export const E2E_SALE2 = { id: '00000000-0000-0000-0000-0000000e2eb2', name: 'E2E Áo dài thanh lý trắng', price: 420000 };
/** Đồ demo có sẵn (V10 thay bộ đồ demo; chủ là Lentique Studio). */
export const SEED_PRODUCT = { id: '00000000-0000-0000-0000-000000000014', name: 'Set sơ mi lụa kem & chân váy đen đuôi cá' };

/** Ký access token giống JwtTokenProvider (HS256) → bỏ qua Google login. */
export function token(user, ttlSec = 3600) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: 'HS256' })}.${b64({ sub: user.id, email: user.email, type: 'access', iat: now, exp: now + ttlSec })}`;
  return `${body}.${crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url')}`;
}

/** Đăng nhập trên trình duyệt: đặt token trước khi app chạy. */
export async function login(page, user) {
  await page.addInitScript((t) => localStorage.setItem('access_token', t), token(user));
}

/** Playwright request context gọi thẳng API (có/không đăng nhập). */
export function api(user) {
  return request.newContext({
    baseURL: `${API}/`,
    extraHTTPHeaders: user ? { Authorization: `Bearer ${token(user)}` } : {},
  });
}

/** Trả về payload `data` của ApiResponse, fail kèm body nếu lỗi. */
export async function data(res) {
  expect(res.ok(), `${res.url()} → ${res.status()} ${await res.text()}`).toBeTruthy();
  return (await res.json()).data;
}

export async function sql(query, params = []) {
  const c = new pg.Client({
    host: env('DB_HOST'), port: +env('DB_PORT'), database: env('DB_NAME'),
    user: env('DB_USERNAME'), password: env('DB_PASSWORD'),
  });
  await c.connect();
  try { return (await c.query(query, params)).rows; } finally { await c.end(); }
}

/** 'YYYY-MM-DD' của ngày `day` trong tháng hiện tại + `plus` tháng (luôn ở tương lai). */
export function futureDate(day, plus = 1) {
  const d = new Date();
  const t = new Date(d.getFullYear(), d.getMonth() + plus, day);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** Chọn ngày nhận → trả trên RangeCalendar ở tháng sau. */
export async function pickDates(page, from, to) {
  const cal = page.locator('div.select-none').first();
  await cal.getByRole('button', { name: 'Tháng sau' }).click();
  await cal.getByRole('button', { name: String(from), exact: true }).click();
  await cal.getByRole('button', { name: String(to), exact: true }).click();
}

export const checkoutBody = (productId, startDate, endDate, paymentMethod = 'COD') => ({
  recipientName: 'E2E Người nhận', phone: '0911111111', address: '1 Đường Test, Q1',
  deliveryMethod: 'PICKUP', paymentMethod, note: 'e2e', items: [{ productId, startDate, endDate }],
});

/** Ảnh PNG 1x1 để upload thử. */
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/** Badge trạng thái của 1 dòng đơn (Timeline cũng chứa các nhãn nên phải nhắm đúng badge). */
export const statusBadge = (row) => row.locator('span.whitespace-nowrap').first();

// ── Helper dùng chung cho các spec ─────────────────────────────────────

/** Số tiền dạng hiển thị trên web: 200000 → "200.000" (khỏi phụ thuộc ký tự ₫ / khoảng trắng). */
export const money = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Đặt thuê COD qua API, trả về booking đầu tiên của đơn ({ id, code, ... }). */
export async function bookCOD(user, productId, startDate, endDate) {
  const res = await data(await (await api(user)).post('bookings/checkout', { data: checkoutBody(productId, startDate, endDate) }));
  return res.bookings[0];
}

/** Ghi đè toàn bộ hồ sơ phong cách của user. Trả về API context của user đó. */
export async function setProfile(user, p = {}) {
  const ctx = await api(user);
  await data(await ctx.put('users/me/style-profile', { data: { favOccasions: [], favStyles: [], favColors: [], ...p } }));
  return ctx;
}

/** Dòng đơn thuê (BookingRow) theo mã đơn hoặc tên đồ. */
export const bookingRow = (page, text) => page.locator('li.card').filter({ hasText: text });

/** Khung chat AI nổi. */
export const chatWidget = (page) => page.locator('div.card.shadow-2xl');
export async function openChat(page) {
  await page.getByRole('button', { name: 'Mở trợ lý AI' }).click();
  return chatWidget(page);
}

/** Body hợp lệ cho API tạo đồ; ảnh là URL presign R2 (backend chỉ nhận ảnh trên R2 của mình). */
export async function validBody(owner, name, patch = {}) {
  const images = [];
  for (let i = 0; i < 3; i++)
    images.push((await data(await owner.post('files/presign', { data: { contentType: 'image/png', size: PNG.length } }))).publicUrl);
  return {
    name, description: 'Đồ đăng thử bằng kiểm thử tự động (E2E).', category: 'Váy dự tiệc', size: 'S',
    bustMax: 84, waistMax: 64, hipMax: 90, itemCondition: 'Mới 99%', retailPrice: 900000, rentPricePerDay: 90000,
    depositPercent: 60, colors: ['Đỏ đô'], styles: ['Thanh lịch'], occasions: ['Kỷ yếu'], features: [], images, ...patch,
  };
}

/** Body hợp lệ cho đơn đăng ký làm Chủ đồ. */
export async function ownerApplyBody(patch = {}) {
  const { banks } = await data(await (await api()).get('products/meta'));
  return { phone: '0944444444', address: '1 Đường Test, Q1', bankAccount: '12345678', bankName: banks[0],
    intro: 'Cho thuê vài bộ đầm dự tiệc size S-M, mặc 1 lần (E2E).', agreed: true, ...patch };
}

/**
 * Trang chủ kể chuyện theo cuộn: mỗi cảnh là section cao có phần sticky, bị ẩn (visibility: hidden) tới khi cuộn tới.
 * Cuộn dần xuống tới khi `locator` hiện ra (hoặc hết trang).
 */
export async function scrollUntilVisible(page, locator, maxSteps = 120) {
  for (let i = 0; i < maxSteps && !(await locator.isVisible()); i++) {
    await page.evaluate(() => scrollBy({ top: innerHeight * 0.35, behavior: 'instant' }));
    await page.waitForTimeout(40);
  }
  await expect(locator).toBeVisible();
}

/** Header: nút tài khoản (kèm nhãn vai trò) và chuông thông báo. */
export const accountButton = (page) => page.locator('header').getByRole('button', { name: 'Tài khoản' });
export const bellButton = (page) => page.locator('header').getByRole('button', { name: 'Thông báo' });
