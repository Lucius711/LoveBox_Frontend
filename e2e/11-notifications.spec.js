import { test, expect } from '@playwright/test';
import { E2E_PRODUCT, USERS, api, bellButton, bookCOD, data, futureDate, login, validBody } from './helpers.js';

// System 1 — Chủ đồ "nhận thông báo có người thuê" ; thông báo trong tài khoản khi đồ / đơn Chủ đồ được duyệt.
// Email (Resend) gửi song song nhưng không test tự động.
test.describe.configure({ mode: 'serial' });

const inbox = async (user) => data(await (await api(user)).get('notifications'));
let booking;

test('có người đặt thuê → chủ đồ nhận thông báo trong tài khoản', async () => {
  booking = await bookCOD(USERS.renter, E2E_PRODUCT.id, futureDate(5, 4), futureDate(6, 4));
  const box = await inbox(USERS.owner);
  const n = box.items.find((i) => i.title.includes(booking.code));
  expect(n, JSON.stringify(box.items)).toBeTruthy();
  expect(n).toMatchObject({ read: false, link: '/account?tab=owner' });
  expect(n.title).toContain(`Có người thuê ${E2E_PRODUCT.name}`);
  expect(box.unread).toBeGreaterThan(0);
});

test('thông báo là riêng tư: người khác không thấy', async () => {
  for (const who of ['renter', 'admin']) {
    const box = await inbox(USERS[who]);
    expect(box.items.some((i) => i.title.includes(booking.code)), who).toBe(false);
  }
});

test('chuông trên header: số chưa đọc → mở ra xem, đánh dấu đã đọc, bấm tới tab Cho thuê', async ({ page }) => {
  const before = await inbox(USERS.owner);
  await login(page, USERS.owner);
  await page.goto('/');
  const bell = bellButton(page);
  await expect(bell).toContainText(String(before.unread));
  await bell.click();
  const item = page.locator('header').getByRole('link', { name: new RegExp(booking.code) });
  await expect(item).toBeVisible();
  await expect(bell).not.toContainText(/\d/);
  expect((await inbox(USERS.owner)).unread).toBe(0);
  await item.click();
  await expect(page).toHaveURL(/tab=owner/);
  await expect(page.locator('li.card').filter({ hasText: booking.code })).toBeVisible();
  await data(await (await api(USERS.renter)).post(`bookings/${booking.id}/cancel`));   // trả lịch
});

test('admin duyệt / từ chối món đồ → chủ đồ nhận thông báo', async () => {
  const owner = await api(USERS.owner);
  const admin = await api(USERS.admin);
  const run = Date.now().toString(36);
  const ok = await data(await owner.post('owner/products', { data: await validBody(owner, `E2E thông báo duyệt ${run}`) }));
  const no = await data(await owner.post('owner/products', { data: await validBody(owner, `E2E thông báo từ chối ${run}`) }));
  await data(await admin.post(`admin/products/${ok.id}/review`, { data: { approve: true } }));
  await data(await admin.post(`admin/products/${no.id}/review`, { data: { approve: false, reason: 'Ảnh mờ (E2E)' } }));
  const titles = (await inbox(USERS.owner)).items.map((i) => i.title);
  expect(titles).toContain(`Món E2E thông báo duyệt ${run} đã được duyệt và lên kệ`);
  expect(titles).toContain(`Món E2E thông báo từ chối ${run} chưa được duyệt: Ảnh mờ (E2E)`);
});

test('đơn đăng ký Chủ đồ được duyệt / từ chối → người gửi nhận thông báo', async () => {
  // fresh được duyệt, stylist bị từ chối ở spec 07
  expect((await inbox(USERS.fresh)).items.map((i) => i.title)).toContain('Đơn đăng ký Chủ đồ đã được duyệt, bạn có thể đăng đồ cho thuê');
  expect((await inbox(USERS.stylist)).items.map((i) => i.title)).toContain('Đơn đăng ký Chủ đồ chưa được duyệt: Thiếu ảnh đồ thật (E2E)');
});

test('chưa có thông báo → hiện trạng thái trống', async ({ page }) => {
  expect((await inbox(USERS.admin)).items).toHaveLength(0);   // admin không nhận thông báo nghiệp vụ nào
  await login(page, USERS.admin);
  await page.goto('/');
  await bellButton(page).click();
  await expect(page.getByText('Chưa có thông báo nào.')).toBeVisible();
});
