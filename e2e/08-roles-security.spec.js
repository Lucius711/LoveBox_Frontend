import { test, expect } from '@playwright/test';
import { API, USERS, api, login, token } from './helpers.js';

// System — 1. PHÂN QUYỀN: Renter / Owner / Admin
const DENIED = [401, 403];

test('khách vãng lai chỉ xem được sản phẩm', async () => {
  const guest = await api();
  expect((await guest.get('products')).status()).toBe(200);
  expect((await guest.get('products/meta')).status()).toBe(200);
  for (const [method, path] of [['get', 'users/me'], ['get', 'stylist/chats'], ['post', 'stylist/search'], ['get', 'stylist/for-you'],
    ['get', 'bookings/mine'], ['post', 'bookings/checkout'], ['post', 'files/presign'], ['get', 'owner/products'], ['get', 'admin/stats']]) {
    expect(DENIED, `${method} ${path}`).toContain((await guest[method](path, { data: {} })).status());
  }
});

test('Renter không vào được chức năng chủ đồ / admin', async () => {
  const renter = await api(USERS.renter);
  expect((await renter.get('bookings/mine')).status()).toBe(200);
  for (const path of ['owner/products', 'owner/bookings', 'owner/stats', 'admin/products', 'admin/bookings', 'admin/stats'])
    expect((await renter.get(path)).status(), path).toBe(403);
});

test('Owner quản lý đồ của mình nhưng không có quyền admin', async () => {
  const owner = await api(USERS.owner);
  for (const path of ['owner/products', 'owner/bookings', 'owner/stats']) expect((await owner.get(path)).status(), path).toBe(200);
  for (const path of ['admin/products', 'admin/bookings', 'admin/stats']) expect((await owner.get(path)).status(), path).toBe(403);
});

test('Admin có đủ quyền kiểm duyệt, đơn, dòng tiền', async () => {
  const admin = await api(USERS.admin);
  for (const path of ['admin/products?status=PENDING', 'admin/bookings', 'admin/stats']) expect((await admin.get(path)).status(), path).toBe(200);
});

test('token giả / hết hạn / sai định dạng bị từ chối', async ({ playwright }) => {
  const valid = token(USERS.admin);
  const tampered = valid.slice(0, -2) + (valid.endsWith('A') ? 'BB' : 'AA');
  for (const t of [tampered, token(USERS.admin, -60), 'not-a-jwt']) {
    const ctx = await playwright.request.newContext({ baseURL: `${API}/`, extraHTTPHeaders: { Authorization: `Bearer ${t}` } });
    expect(DENIED).toContain((await ctx.get('admin/stats')).status());
  }
});

test('trang giao diện chặn theo quyền', async ({ page }) => {
  for (const path of ['/account', '/admin', '/owner/products/new', '/checkout']) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/login/);
  }
  await login(page, USERS.renter);
  await page.goto('/admin');
  await expect(page).toHaveURL(/tab=owner/);
  await page.goto('/owner/products/new');
  await expect(page).toHaveURL(/tab=owner/);
  await expect(page.getByRole('button', { name: 'Trở thành Chủ đồ' })).toBeVisible();
});

test('menu tài khoản hiện "Quản trị" chỉ với admin', async ({ page }) => {
  await login(page, USERS.admin);
  await page.goto('/');
  await page.getByRole('button', { name: 'Tài khoản' }).click();
  await page.getByRole('link', { name: 'Quản trị' }).click();
  await expect(page.getByRole('heading', { name: 'Quản trị' })).toBeVisible();
});
