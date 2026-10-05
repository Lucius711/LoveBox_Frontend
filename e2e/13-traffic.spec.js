import { test, expect } from '@playwright/test';
import { API, E2E_PRODUCT, USERS, api, bookCOD, data, futureDate, login, sql } from './helpers.js';

// Admin — màn "Truy cập & đặt thuê": người truy cập (1 lần/trình duyệt/ngày) và người đặt thuê (chỉ đơn đã thanh toán)
const VID = `e2e-${Date.now()}`;
const visitorRows = (vid) => sql('SELECT 1 FROM dtb_daily_visitors WHERE visitor_id = $1', [vid]);
const track = async (body) => (await api()).post('track', { data: body });
const today = async (admin) => (await data(await admin.get('admin/traffic?days=1'))).total;

test.afterAll(() => sql(`DELETE FROM dtb_daily_visitors WHERE visitor_id LIKE 'e2e-%'`));

test('POST /track: không cần đăng nhập, cùng visitor trong ngày chỉ đếm 1 lần', async () => {
  for (let i = 0; i < 3; i++) expect((await track({ vid: VID })).status()).toBe(200);
  expect(await visitorRows(VID)).toHaveLength(1);
  await track({ vid: `${VID}-b` });
  expect(await visitorRows(`${VID}-b`)).toHaveLength(1);
});

test('POST /track: vid rỗng / quá dài bị bỏ qua, không lỗi', async () => {
  const long = `e2e-${'x'.repeat(70)}`;
  for (const body of [{}, { vid: '' }, { vid: long }]) expect((await track(body)).status()).toBe(200);
  expect(await visitorRows(long)).toHaveLength(0);
});

test('mở web → tự gửi /track với id lưu trong localStorage; F5 gửi lại cùng id, không đếm thêm', async ({ page }) => {
  const trackReq = () => page.waitForRequest((r) => r.url().endsWith('/track') && r.method() === 'POST');
  let req = trackReq();
  await page.goto('/');
  const vid = (await req).postDataJSON().vid;
  try {
    expect(vid).toBeTruthy();
    expect(await page.evaluate(() => localStorage.getItem('lt_vid'))).toBe(vid);
    req = trackReq();
    await page.reload();
    expect((await req).postDataJSON().vid).toBe(vid);   // F5 dùng lại id cũ
    await expect.poll(() => visitorRows(vid)).toHaveLength(1);
  } finally {
    await sql('DELETE FROM dtb_daily_visitors WHERE visitor_id = $1', [vid]);
  }
});

test('chỉ đếm đơn đã thanh toán, không tính đơn huỷ; 1 người nhiều đơn = 1 người', async () => {
  const admin = await api(USERS.admin);
  const base = await today(admin);
  const delta = async () => { const t = await today(admin); return [t.renters - base.renters, t.bookings - base.bookings]; };

  const b1 = await bookCOD(USERS.renter, E2E_PRODUCT.id, futureDate(3, 5), futureDate(4, 5));
  expect(await delta(), 'COD chưa trả tiền').toEqual([0, 0]);

  await sql(`UPDATE dtb_bookings SET payment_status = 'PAID' WHERE id = $1`, [b1.id]); // = PayOS webhook báo đã trả
  expect(await delta(), 'đơn 1 đã trả').toEqual([1, 1]);

  const b2 = await bookCOD(USERS.renter, E2E_PRODUCT.id, futureDate(10, 5), futureDate(11, 5));
  await sql(`UPDATE dtb_bookings SET payment_status = 'PAID' WHERE id = $1`, [b2.id]);
  expect(await delta(), 'cùng người đặt đơn 2').toEqual([1, 2]);

  await sql(`UPDATE dtb_bookings SET status = 'CANCELLED' WHERE id = $1`, [b2.id]);
  expect(await delta(), 'đơn 2 bị huỷ').toEqual([1, 1]);
});

test('số liệu khớp với truy vấn thẳng DB; tổng = cộng theo ngày với số đơn', async () => {
  const r = await data(await (await api(USERS.admin)).get('admin/traffic?days=30'));
  expect(r.daily).toHaveLength(30);
  const [db] = await sql(`SELECT count(*)::int AS bookings FROM dtb_bookings
    WHERE payment_status = 'PAID' AND status <> 'CANCELLED'
      AND (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 29`);
  expect(r.total.bookings).toBe(db.bookings);
  expect(r.daily.reduce((s, d) => s + d.bookings, 0)).toBe(r.total.bookings);
});

test('phân quyền + giới hạn days', async ({ playwright }) => {
  const guest = await playwright.request.newContext({ baseURL: `${API}/` });
  expect([401, 403]).toContain((await guest.get('admin/traffic')).status());
  for (const u of [USERS.renter, USERS.owner]) expect((await (await api(u)).get('admin/traffic')).status()).toBe(403);
  const admin = await api(USERS.admin);
  expect((await data(await admin.get('admin/traffic?days=0'))).daily).toHaveLength(1);
  expect((await data(await admin.get('admin/traffic?days=99999'))).daily).toHaveLength(365);
});

test('màn admin mở mặc định tab Truy cập & đặt thuê, số hiển thị = API', async ({ page }) => {
  const total = (await data(await (await api(USERS.admin)).get('admin/traffic?days=7'))).total;
  await login(page, USERS.admin);
  // Chặn /track của chính trình duyệt test, để số liệu không đổi giữa lúc gọi API và lúc màn hình tải (đã test riêng ở trên)
  await page.route('**/track', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.goto('/admin');
  const card = (label) => page.locator('div.card').filter({ hasText: label }).locator('p.text-2xl');
  await expect(card('Người truy cập')).toHaveText(String(total.visitors));
  await expect(card('Người đặt thuê')).toHaveText(String(total.renters));
  await expect(card('Số đơn đã thanh toán')).toHaveText(String(total.bookings));
  await page.getByRole('button', { name: '30 ngày' }).click();
  await expect(page.locator('table tbody tr')).toHaveCount(30);
});
