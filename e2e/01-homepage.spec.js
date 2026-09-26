import { test, expect } from '@playwright/test';
import { api, chatWidget, data } from './helpers.js';

// Requirement brief — 1. MODULE TRANG CHỦ
test.describe('1. Trang chủ', () => {
  test('header: logo, menu, tìm kiếm, đăng nhập/đăng ký, giỏ hàng', async ({ page }) => {
    await page.goto('/products');
    const header = page.locator('header');
    await header.getByRole('link', { name: 'Lentique — Trang chủ' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(header.locator('img[src="/logo-mark.png"]')).toBeVisible();

    const nav = header.locator('nav').filter({ visible: true });
    for (const item of ['Trang chủ', 'Danh mục', 'Về chúng tôi']) await expect(nav.getByRole('link', { name: item })).toBeVisible();
    await expect(header.getByRole('textbox', { name: 'Tìm kiếm' }).filter({ visible: true })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Giỏ hàng' })).toBeVisible();

    await header.getByRole('button', { name: 'Đăng nhập / Đăng ký' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test.fixme('header có mục "Cách thức thuê"', async ({ page }) => {
    // Requirement 1: Menu điều hướng (Trang chủ, Danh mục, Cách thức thuê, Về chúng tôi) — app chưa có mục này
    await page.goto('/');
    await expect(page.locator('header nav').filter({ visible: true }).getByRole('link', { name: 'Cách thức thuê' })).toBeVisible();
  });

  test('banner chính + nút "Tìm đồ cùng AI ngay" mở trợ lý AI', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Thích là diện');
    await page.getByRole('button', { name: 'Tìm đồ cùng AI ngay' }).click();
    await expect(chatWidget(page)).toBeVisible();
  });

  test('mục "Đồ mới lên kệ" và "Đồ được thuê nhiều nhất" đúng thứ tự', async ({ page }) => {
    const guest = await api();
    const fresh = (await data(await guest.get('products', { params: { sort: 'new', pageSize: 8 } }))).items;
    const popular = (await data(await guest.get('products', { params: { sort: 'popular', pageSize: 8 } }))).items;
    await page.goto('/');

    const shelf = (title) => page.locator('section').filter({ has: page.getByRole('heading', { name: title }) });
    await expect(shelf('Đồ mới lên kệ').getByRole('link', { name: fresh[0].name, exact: true })).toBeVisible();
    const best = shelf('Đồ được thuê nhiều nhất');
    await expect(best.getByRole('link', { name: popular[0].name, exact: true })).toBeVisible();
    await expect(best.getByText('Top 1')).toBeVisible();
    for (let i = 1; i < popular.length; i++) expect(popular[i - 1].rentCount).toBeGreaterThanOrEqual(popular[i].rentCount);

    await shelf('Đồ mới lên kệ').getByRole('link', { name: 'Xem tất cả →' }).click();
    await expect(page).toHaveURL(/\/products\?sort=new/);
  });

  test('chân trang: liên kết + mạng xã hội', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    for (const s of ['Facebook', 'Instagram', 'TikTok', 'YouTube'])
      await expect(footer.getByRole('link', { name: s })).toHaveAttribute('target', '_blank');
    await footer.getByRole('link', { name: 'Điều khoản thuê & cọc' }).click();
    await expect(page).toHaveURL(/\/terms/);
  });
});
