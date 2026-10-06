import { test, expect } from '@playwright/test';
import { E2E_PRODUCT, SEED_PRODUCT, USERS, bellButton, login } from './helpers.js';

// System — 4. UI/UX: Responsive cho điện thoại (80% sinh viên dùng mobile). Chạy ở project "mobile" (Pixel 7) — xem playwright.config.js

const PAGES = {
  guest: ['/', '/products', `/products/${SEED_PRODUCT.id}`, '/cart', '/about', '/shipping', '/terms', '/privacy', '/login'],
  renter: ['/account', '/account?tab=profile', '/account?tab=owner', '/checkout'],
  owner: ['/account?tab=owner', '/owner/products/new'],
  admin: ['/admin', '/admin?tab=owners', '/admin?tab=bookings', '/admin?tab=money', '/account'],
};

for (const [who, paths] of Object.entries(PAGES)) {
  test(`không bị tràn ngang (${who})`, async ({ page }) => {
    if (USERS[who]) await login(page, USERS[who]);
    for (const path of paths) {
      await page.goto(path);
      // ponytail: networkidle có thể không bao giờ tới (HMR / ảnh ngoài) → chờ tối đa 5s rồi đo
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
        { message: `${path} bị tràn ngang` }).toBeLessThanOrEqual(0);
    }
  });
}

test('menu hamburger toàn màn hình mở và điều hướng được', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header nav').filter({ visible: true })).toHaveCount(0); // menu desktop bị ẩn
  const menu = page.locator('#mobile-menu');
  await expect(menu).toHaveAttribute('aria-hidden', 'true');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(menu).toHaveAttribute('aria-hidden', 'false');
  await expect(menu).toBeInViewport({ ratio: 1 });
  await menu.getByRole('link', { name: 'Danh mục' }).first().click();
  await expect(page).toHaveURL(/\/products/);
  await expect(menu).toHaveAttribute('aria-hidden', 'true'); // tự đóng sau khi chọn
});

test('nút Bộ lọc nổi theo khi cuộn, lọc trong drawer', async ({ page }) => {
  await page.goto('/products');
  await expect(page.getByText(/^\d+ món$/)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const open = page.getByRole('button', { name: /Bộ lọc/ });
  await expect(open).toBeInViewport();

  await open.click();
  const drawer = page.locator('div.fixed.inset-0').filter({ has: page.getByRole('heading', { name: 'Bộ lọc' }) });
  await drawer.getByRole('button', { name: 'XL', exact: true }).click();
  await expect(page).toHaveURL(/size=XL/);
  await drawer.getByRole('button', { name: /^Xem/ }).click();
  await expect(drawer).toBeHidden();
  await expect(open).toHaveText(/Bộ lọc \(1\)/);
});

test('thanh Thuê ngay dính đáy màn hình, nút chat không che', async ({ page }) => {
  await page.goto(`/products/${E2E_PRODUCT.id}`);
  const rent = page.getByRole('button', { name: 'Thuê ngay' });
  const chat = page.getByRole('button', { name: 'Mở trợ lý AI' });
  await expect(rent).toBeInViewport();
  const a = await rent.boundingBox();
  const b = await chat.boundingBox();
  const apart = a.y + a.height <= b.y || b.y + b.height <= a.y || a.x + a.width <= b.x || b.x + b.width <= a.x;
  await page.mouse.wheel(0, 600);   // cuộn vẫn thấy
  await expect(rent).toBeInViewport();
  expect(apart, `Thuê ngay ${JSON.stringify(a)} vs chat ${JSON.stringify(b)}`).toBe(true);
});

test('ô nhập ≥16px để iPhone không tự phóng to', async ({ page }) => {
  await page.goto('/products');
  const size = await page.getByRole('textbox', { name: 'Tìm kiếm' }).filter({ visible: true })
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(16);
});

test('khung chat AI nằm gọn trong màn hình, có 2 tab', async ({ page }) => {
  await login(page, USERS.renter);
  await page.goto('/');
  await page.getByRole('button', { name: 'Mở trợ lý AI' }).click();
  const w = page.locator('div.card.shadow-2xl');
  await expect(w).toBeInViewport({ ratio: 1 });
  await expect(w.getByLabel('Tin nhắn')).toBeVisible();
  await w.getByRole('button', { name: 'Lịch sử', exact: true }).click();
  await expect(w.getByRole('button', { name: 'Gần đây' })).toBeVisible();
  await w.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(w.getByLabel('Tin nhắn')).toBeVisible();
});

test('đặt thuê COD trọn luồng trên điện thoại', async ({ page }) => {
  await login(page, USERS.renter);
  await page.goto(`/products/${E2E_PRODUCT.id}`);
  const cal = page.locator('div.select-none').first();
  for (let i = 0; i < 3; i++) await cal.getByRole('button', { name: 'Tháng sau' }).click(); // tháng +3: không đụng lịch của spec desktop
  await cal.getByRole('button', { name: '20', exact: true }).click();
  await cal.getByRole('button', { name: '21', exact: true }).click();
  await page.getByRole('button', { name: 'Thuê ngay' }).click();
  await page.getByRole('button', { name: 'Tiến hành đặt hàng' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByText('Tự đến lấy', { exact: true }).click();
  await page.getByText('Thanh toán khi nhận (COD)').click();
  await page.getByRole('button', { name: 'Đặt thuê', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Đặt thuê thành công!' })).toBeVisible();
});

test('chuông thông báo mở gọn trong màn hình điện thoại', async ({ page }) => {
  await login(page, USERS.owner);
  await page.goto('/');
  await bellButton(page).click();
  const panel = page.locator('header').getByText('Thông báo', { exact: true }).locator('..');
  await expect(panel).toBeInViewport({ ratio: 1 });
});
