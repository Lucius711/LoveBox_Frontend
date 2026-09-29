import { test, expect } from '@playwright/test';
import { API, USERS, accountButton, api, login, token } from './helpers.js';

// System — 1. PHÂN QUYỀN: 3 loại tài khoản
//  Khách thuê: tìm đồ, chat AI, đặt lịch, thanh toán, đánh giá (+ gửi đơn làm Chủ đồ)
//  Chủ đồ: đăng đồ, nhận thông báo có người thuê, xác nhận đơn, theo dõi doanh thu
//  Admin: kiểm duyệt đồ + đơn Chủ đồ, tranh chấp, dòng tiền — KHÔNG thuê / đăng đồ
const DENIED = [401, 403];
const OWNER_API = ['owner/products', 'owner/bookings', 'owner/stats'];
const ADMIN_API = ['admin/products?status=PENDING', 'admin/owner-applications', 'admin/bookings', 'admin/stats'];

test.describe('API', () => {
  test('khách vãng lai chỉ xem được sản phẩm', async () => {
    const guest = await api();
    expect((await guest.get('products')).status()).toBe(200);
    expect((await guest.get('products/meta')).status()).toBe(200);
    for (const [method, path] of [['get', 'users/me'], ['get', 'stylist/chats'], ['post', 'stylist/search'], ['get', 'stylist/for-you'],
      ['get', 'bookings/mine'], ['post', 'bookings/checkout'], ['post', 'files/presign'], ['get', 'notifications'],
      ['post', 'users/me/owner-application'], ...OWNER_API.map((p) => ['get', p]), ...ADMIN_API.map((p) => ['get', p])]) {
      expect(DENIED, `${method} ${path}`).toContain((await guest[method](path, { data: {} })).status());
    }
  });

  test('Khách thuê: thuê được, chưa đăng đồ, không vào admin', async () => {
    const renter = await api(USERS.renter);
    for (const path of ['bookings/mine', 'stylist/chats', 'notifications', 'users/me/owner-application'])
      expect((await renter.get(path)).status(), path).toBe(200);
    for (const path of [...OWNER_API, ...ADMIN_API]) expect((await renter.get(path)).status(), path).toBe(403);
  });

  test('Chủ đồ: quản lý đồ & đơn của mình, không có quyền admin', async () => {
    const owner = await api(USERS.owner);
    for (const path of [...OWNER_API, 'bookings/mine']) expect((await owner.get(path)).status(), path).toBe(200);
    for (const path of ADMIN_API) expect((await owner.get(path)).status(), path).toBe(403);
  });

  test('Admin: kiểm duyệt, đơn, dòng tiền — nhưng không đăng đồ', async () => {
    const admin = await api(USERS.admin);
    for (const path of ADMIN_API) expect((await admin.get(path)).status(), path).toBe(200);
    for (const path of OWNER_API) expect((await admin.get(path)).status(), path).toBe(403);
  });

  test('token giả / hết hạn / sai định dạng bị từ chối', async ({ playwright }) => {
    const valid = token(USERS.admin);
    const tampered = valid.slice(0, -2) + (valid.endsWith('A') ? 'BB' : 'AA');
    for (const t of [tampered, token(USERS.admin, -60), 'not-a-jwt']) {
      const ctx = await playwright.request.newContext({ baseURL: `${API}/`, extraHTTPHeaders: { Authorization: `Bearer ${t}` } });
      expect(DENIED).toContain((await ctx.get('admin/stats')).status());
    }
  });
});

test.describe('Giao diện theo vai trò', () => {
  test('chưa đăng nhập → trang cần đăng nhập chuyển sang /login', async ({ page }) => {
    for (const path of ['/account', '/admin', '/owner/products/new', '/checkout']) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/login/);
    }
  });

  test('Khách thuê: menu "Đơn thuê của tôi" + "Đăng ký làm Chủ đồ"; trang admin / đăng đồ đưa về form đăng ký', async ({ page }) => {
    await login(page, USERS.renter);
    await page.goto('/');
    await accountButton(page).click();
    await expect(page.getByRole('link', { name: 'Đơn thuê của tôi' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Quản trị' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Đăng ký làm Chủ đồ' }).click();
    await expect(page.getByRole('heading', { name: 'Đăng ký làm Chủ đồ' })).toBeVisible();

    for (const path of ['/admin', '/owner/products/new']) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/tab=owner/);
    }
    await expect(page.locator('footer').getByRole('link', { name: 'Đăng đồ cho thuê' })).toBeVisible();
  });

  test('Chủ đồ: menu "Đơn thuê & cho thuê", có tab Cho thuê + nút đăng đồ, không vào admin', async ({ page }) => {
    await login(page, USERS.owner);
    await page.goto('/');
    await accountButton(page).click();
    await expect(page.getByRole('link', { name: 'Đơn thuê & cho thuê' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Đăng ký làm Chủ đồ' })).toHaveCount(0);
    await page.goto('/account?tab=owner');
    await expect(page.getByText('Doanh thu thuê')).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Đăng đồ cho thuê' })).toBeVisible();
    await page.goto('/admin');
    await expect(page).toHaveURL(/tab=owner/);
  });

  test('Admin: menu chỉ có Hồ sơ + Quản trị; không có đơn thuê / cho thuê / đăng đồ', async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto('/');
    await accountButton(page).click();
    await expect(page.getByRole('link', { name: /Đơn thuê/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Đăng ký làm Chủ đồ' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Quản trị' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Quản trị' })).toBeVisible();
    for (const t of ['Duyệt đồ', 'Đơn Chủ đồ', 'Đơn & tranh chấp', 'Dòng tiền']) await expect(page.getByRole('button', { name: t, exact: true })).toBeVisible();

    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'Duyệt đồ & đơn thuê' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Đăng đồ cho thuê' })).toHaveCount(0);

    for (const path of ['/owner/products/new', '/account?tab=owner']) {
      await page.goto(path);
      await expect(page, path).toHaveURL(path === '/owner/products/new' ? /\/admin/ : /\/account/);
    }
    await expect(page.getByRole('button', { name: 'Cho thuê', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Đơn thuê', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Thông tin liên hệ' })).toBeVisible();
  });
});
