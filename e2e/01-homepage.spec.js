import { test, expect } from '@playwright/test';
import { USERS, accountButton, api, bellButton, chatWidget, data, login, scrollUntilVisible } from './helpers.js';

// Requirement brief — 1. MODULE TRANG CHỦ. Trang chủ kể chuyện theo cuộn (Narrative.jsx):
// mở màn logo → vòng thẻ (hero) → Đồ mới lên kệ → (Gợi ý cho bạn) → Đồ được thuê nhiều nhất → Cách thuê → Tủ đồ chung → chữ Lentique → vai trò → footer
const shelf = (page, title) => page.locator('section').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
const withImage = (items) => items.filter((p) => p.image);
/** Chờ 2 chồng thẻ dựng xong (dữ liệu về) trước khi cuộn — lúc đang tải trang chủ hiện kệ thường, cao khác hẳn. CSS thấy cả phần đang ẩn. */
async function ready(page) {
  for (const t of ['Đồ mới lên kệ', 'Đồ được thuê nhiều nhất'])
    await expect(page.locator('section', { has: page.locator('h2', { hasText: t }) }).locator('ul > li > button').first()).toBeAttached();
}

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

  test('đã đăng nhập: header thay nút Đăng nhập bằng chuông thông báo + tài khoản kèm vai trò', async ({ page }) => {
    for (const [who, label] of [['renter', 'Khách thuê'], ['owner', 'Chủ đồ'], ['admin', 'Quản trị']]) {
      await login(page, USERS[who]);
      await page.goto('/');
      await expect(page.locator('header').getByRole('button', { name: 'Đăng nhập / Đăng ký' })).toHaveCount(0);
      await expect(bellButton(page)).toBeVisible();
      await expect(accountButton(page)).toContainText(label);
    }
  });

  test.fixme('header có mục "Cách thức thuê"', async ({ page }) => {
    // Requirement 1: Menu điều hướng (Trang chủ, Danh mục, Cách thức thuê, Về chúng tôi) — app có cảnh "Cách thuê" trên trang chủ, chưa có mục menu
    await page.goto('/');
    await expect(page.locator('header nav').filter({ visible: true }).getByRole('link', { name: 'Cách thức thuê' })).toBeVisible();
  });

  test('hero: slogan + "Tìm đồ cùng AI" mở trợ lý, "Xem kho đồ" sang danh mục', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('section').filter({ has: page.getByRole('heading', { level: 1 }) });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thích là diện, thuê là tiện.');
    await hero.getByRole('button', { name: 'Tìm đồ cùng AI', exact: true }).click();
    await expect(chatWidget(page)).toBeVisible();
    await page.goto('/');
    await hero.getByRole('link', { name: 'Xem kho đồ' }).click();
    await expect(page).toHaveURL(/\/products$/);
  });

  test('vòng thẻ giới thiệu lần lượt các loại trang phục, bấm tên loại → danh mục đã lọc', async ({ page }) => {
    const { categories } = await data(await (await api()).get('products/meta'));
    await page.goto('/');
    const caption = page.getByText(/^Các mẫu đang có · 01 \/ \d+$/);
    // vòng thẻ phóng to thành cung ở ~30% đoạn cuộn của hero (section cao 460vh) → bắt đầu giới thiệu loại đầu tiên
    await page.evaluate(() => scrollTo({ top: innerHeight * 3.6 * 0.3, behavior: 'instant' }));
    await expect(caption).toHaveText(`Các mẫu đang có · 01 / ${String(categories.length).padStart(2, '0')}`);
    await page.getByRole('link', { name: `${categories[0]} →` }).click();
    await expect(page).toHaveURL(`/products?category=${encodeURIComponent(categories[0])}`);
  });

  test('"Đồ mới lên kệ": chồng thẻ theo đồ mới nhất, chọn thẻ → xem chi tiết', async ({ page }) => {
    const fresh = withImage((await data(await (await api()).get('products', { params: { sort: 'new', pageSize: 8 } }))).items);
    await page.goto('/');
    await ready(page);
    const s = shelf(page, 'Đồ mới lên kệ');
    await scrollUntilVisible(page, s.getByRole('heading', { name: 'Đồ mới lên kệ' }));
    const names = await s.getByRole('listitem').getByRole('button').allTextContents();
    for (const p of fresh) expect(names).toContain(p.name);   // thẻ đầu có thể là món đại diện của loại cuối trên vòng thẻ

    await s.getByRole('button', { name: fresh[1].name, exact: true }).click();
    await expect(s.locator('p.font-serif')).toHaveText(fresh[1].name);
    await s.getByRole('link', { name: 'Xem chi tiết →' }).click();
    await expect(page).toHaveURL(`/products/${fresh[1].id}`);
  });

  test('"Đồ được thuê nhiều nhất": đúng thứ tự, đánh hạng 01–03', async ({ page }) => {
    const popular = withImage((await data(await (await api()).get('products', { params: { sort: 'popular', pageSize: 8 } }))).items);
    for (let i = 1; i < popular.length; i++) expect(popular[i - 1].rentCount).toBeGreaterThanOrEqual(popular[i].rentCount);
    await page.goto('/');
    await ready(page);
    const s = shelf(page, 'Đồ được thuê nhiều nhất');
    await scrollUntilVisible(page, s.getByRole('heading', { name: 'Đồ được thuê nhiều nhất' }));
    await expect(s.getByRole('listitem').getByRole('button')).toHaveText(popular.map((p) => p.name));
    await expect(s.getByText(/^Top 1 · /)).toBeVisible();
    await expect(s.getByRole('link', { name: popular[0].name, exact: true }).getByText('01')).toBeAttached();

    await s.getByRole('button', { name: popular[2].name, exact: true }).click();
    await expect(s.locator('p.font-serif')).toHaveText(popular[2].name);
    await expect(s.getByText(/^Top 3 · /)).toBeVisible();
  });

  test('"Cách thuê" 3 bước → "Tủ đồ chung" → chữ Lentique → vai trò', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    for (const step of ['Kể cho AI', 'Chọn ngày thuê', 'Trả đồ, nhận lại cọc']) await scrollUntilVisible(page, page.getByText(step, { exact: true }));
    await scrollUntilVisible(page, page.getByText('Tủ đồ chung', { exact: true }));
    for (const promise of ['Duyệt từng món', 'Giặt ủi sạch sẽ', 'Cọc an toàn']) await expect(page.getByText(promise, { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Lentique' })).toBeAttached();

    // Accordion vai trò: mở mặc định "Người thuê"; bấm "Về Lentique" → Đọc thêm
    const row = (t) => page.locator('details').filter({ has: page.locator('summary', { hasText: t }) });
    await expect(row('Người thuê')).toHaveAttribute('open', '');
    await row('Chủ đồ').locator('summary').click();
    await expect(row('Chủ đồ').getByRole('link', { name: 'Đăng đồ cho thuê' })).toBeVisible();
    await row('Về Lentique').locator('summary').click();
    await row('Về Lentique').getByRole('link', { name: 'Đọc thêm' }).click();
    await expect(page).toHaveURL(/\/about/);
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

test.describe('Mở màn trang chủ (bật hiệu ứng)', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('mở màn che nav, nút chat, banner hồ sơ → xong thì mờ dần hiện lại', async ({ page }) => {
    await login(page, USERS.renter);   // hồ sơ thiếu ngân sách → có banner vàng
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-opening', '1');
    for (const id of ['#site-header', '#chat-widget', '#profile-banner']) await expect(page.locator(id)).toHaveCSS('opacity', '0');

    await expect(html).not.toHaveAttribute('data-opening', { timeout: 10_000 });   // logo → thanh treo → vòng thẻ (~3.8s)
    for (const id of ['#site-header', '#chat-widget', '#profile-banner']) await expect(page.locator(id)).toHaveCSS('opacity', '1');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('bấm phím là bỏ qua mở màn và dừng tự cuộn', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-opening', '1');
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).not.toHaveAttribute('data-opening');
    await page.waitForTimeout(9000);   // quá thời điểm tự cuộn (7.3s)
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test('không đụng gì: tự cuộn kể chuyện sau khi đọc slogan', async ({ page }) => {
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => scrollY), { timeout: 20_000 }).toBeGreaterThan(200);
  });

  test('tải lại giữa chừng → luôn về đầu trang', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Escape');
    await page.evaluate(() => scrollTo({ top: 3000, behavior: 'instant' }));
    await page.reload();
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(page.locator('html')).toHaveAttribute('data-opening', '1');
  });
});
