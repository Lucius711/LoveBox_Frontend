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
  fresh: u(3, 'fresh', 'RENTER'),          // dùng để "Trở thành Chủ đồ"
  owner: u(4, 'owner', 'OWNER'),
  admin: u(5, 'admin', 'ADMIN'),
  stylist: u(6, 'stylist', 'RENTER'),  // riêng cho test AI (hồ sơ bị đổi liên tục)
};
/** Đồ APPROVED của e2e owner (seed trong global-setup) để test luồng thuê. */
export const E2E_PRODUCT = { id: '00000000-0000-0000-0000-0000000e2ea1', name: 'E2E Đầm thử nghiệm đỏ đô' };
/** Đồ demo có sẵn trong V2 (chủ là Lentique Studio — V2 + V9). */
export const SEED_PRODUCT = { id: '00000000-0000-0000-0000-000000000014', name: 'Set công sở be tối giản' };

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
