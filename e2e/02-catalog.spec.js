import { test, expect } from '@playwright/test';
import { E2E_PRODUCT, SEED_PRODUCT, USERS, api, bookCOD, data, futureDate } from './helpers.js';

// Requirement brief — 2. MODULE DANH MỤC SẢN PHẨM (phân loại + bộ lọc) ; UI/UX: lazy load ảnh
test.describe.configure({ mode: 'serial' });

const guest = () => api();
const search = async (params) => data(await (await guest()).get('products', { params: { pageSize: 100, ...params } }));
const count = (page) => page.getByText(/^\d+ món$/);
const filterChip = (page, name) => page.locator('aside').getByRole('button', { name, exact: true });

/** Bấm 1 chip lọc → URL đổi, số món trên web = số món API trả về, và mọi món đều thoả điều kiện. */
async function checkFilter(page, { chip, param, value, params, ok }) {
  await page.goto('/products');
  await filterChip(page, chip).click();
  await expect(page).toHaveURL(new RegExp(`[?&]${param}=`));
  const res = await search(params ?? { [param]: value });
  await expect(count(page).or(page.getByText('Không có món nào khớp bộ lọc'))).toBeVisible();
  if (res.totalItems) await expect(count(page)).toHaveText(`${res.totalItems} món`);
  for (const p of res.items) expect(ok(p), p.name).toBeTruthy();
  return res;
}

test('phân loại theo loại trang phục', async ({ page }) => {
  const { categories } = await data(await (await guest()).get('products/meta'));
  for (const c of ['Áo dài', 'Đầm dạ hội', 'Veston', 'Đồ Cosplay/Sự kiện']) expect(categories).toContain(c);
  const res = await checkFilter(page, { chip: 'Áo dài', param: 'category', value: 'Áo dài', ok: (p) => p.category === 'Áo dài' });
  expect(res.totalItems).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Áo dài');
});

test('phân loại theo phong cách', async ({ page }) => {
  const { styles } = await data(await (await guest()).get('products/meta'));
  for (const s of ['Dễ thương', 'Thanh lịch', 'Cá tính', 'Vintage']) expect(styles).toContain(s);
  await checkFilter(page, { chip: 'Thanh lịch', param: 'style', value: 'Thanh lịch', ok: (p) => p.styles.includes('Thanh lịch') });
});

test('lọc theo khoảng giá thuê', async ({ page }) => {
  await checkFilter(page, {
    chip: '100k – 200k', param: 'minPrice', value: '100000', params: { minPrice: 100000, maxPrice: 200000 },
    ok: (p) => p.rentPricePerDay >= 100000 && p.rentPricePerDay <= 200000,
  });
});

test('lọc theo kích cỡ S / M / L / XL', async ({ page }) => {
  for (const size of ['S', 'M', 'L', 'XL']) {
    await checkFilter(page, { chip: size, param: 'size', value: size, ok: (p) => p.size === size });
    await expect.poll(async () => [...new Set(await page.getByText(/^Size (S|M|L|XL)$/).allTextContents())]).toEqual([`Size ${size}`]);
  }
});

test('lọc theo màu sắc', async ({ page }) => {
  await checkFilter(page, { chip: 'Đen', param: 'color', value: 'Đen', ok: (p) => p.colors.includes('Đen') });
});

test('lọc theo tình trạng: Có sẵn / Đang cho thuê', async ({ page }) => {
  const today = futureDate(new Date().getDate(), 0);
  await bookCOD(USERS.renter, E2E_PRODUCT.id, today, today); // đồ e2e đang được thuê hôm nay
  await checkFilter(page, { chip: 'Đang cho thuê', param: 'availability', value: 'rented', ok: () => true });
  await expect(page.getByRole('link', { name: E2E_PRODUCT.name, exact: true })).toBeVisible();
  const available = await checkFilter(page, { chip: 'Có sẵn', param: 'availability', value: 'available', ok: (p) => p.id !== E2E_PRODUCT.id });
  expect(available.totalItems).toBeGreaterThan(0);
});

test('kết hợp nhiều bộ lọc rồi "Xoá bộ lọc"', async ({ page }) => {
  await page.goto('/products');
  await filterChip(page, 'M').click();
  await filterChip(page, 'Thanh lịch').click();
  await expect(page).toHaveURL(/size=M/);
  await expect(page).toHaveURL(/style=/);
  const res = await search({ size: 'M', style: 'Thanh lịch' });
  if (res.totalItems) await expect(count(page)).toHaveText(`${res.totalItems} món`);
  await page.getByRole('button', { name: 'Xoá bộ lọc' }).click();
  await expect(page).toHaveURL(/\/products\??$/);
});

test('sắp xếp theo giá và phân trang 12 món/trang', async ({ page }) => {
  await page.goto('/products');
  await page.getByLabel('Sắp xếp').selectOption('priceAsc');
  await expect(page).toHaveURL(/sort=priceAsc/);
  const all = await search({ sort: 'priceAsc' });
  const prices = all.items.map((p) => p.rentPricePerDay);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));

  expect(all.totalItems).toBeGreaterThan(12);
  const pager = page.getByRole('navigation', { name: 'Phân trang' });
  await pager.getByRole('button', { name: 'Trang sau' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(pager.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('tìm kiếm theo tên / loại đồ', async ({ page }) => {
  await page.goto('/');
  const box = page.getByRole('textbox', { name: 'Tìm kiếm' }).filter({ visible: true });
  await box.fill('Áo dài');
  await box.press('Enter');
  await expect(page).toHaveURL((u) => u.searchParams.get('q') === 'Áo dài');
  await expect(page.getByText('Kết quả cho “Áo dài”')).toBeVisible();
  const res = await search({ q: 'Áo dài' });
  await expect(count(page)).toHaveText(`${res.totalItems} món`);
});

test('thanh lọc dính theo khi cuộn xuống cuối trang', async ({ page }) => {
  await page.goto('/products');
  await expect(count(page)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator('aside').getByText('Kích cỡ')).toBeInViewport();
});

test('ảnh sản phẩm dùng lazy load', async ({ page }) => {
  await page.goto('/products');
  await expect(count(page)).toBeVisible();
  const loading = await page.locator('main img[alt]').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('loading')));
  expect(loading.length).toBeGreaterThan(0);
  expect(new Set(loading)).toEqual(new Set(['lazy']));
});

test('trang chi tiết: thông tin, nhãn, số đo, cọc', async ({ page }) => {
  const p = await data(await (await guest()).get(`products/${SEED_PRODUCT.id}`));
  await page.goto(`/products/${SEED_PRODUCT.id}`);
  await expect(page.getByRole('heading', { name: SEED_PRODUCT.name })).toBeVisible();
  await expect(page.getByText(`${p.bustMax}-${p.waistMax}-${p.hipMax}`)).toBeVisible();
  await expect(page.getByText(`(${p.depositPercent}% giá niêm yết)`)).toBeVisible();
  for (const tag of [...p.colors, ...p.styles]) await expect(page.getByText(tag, { exact: true }).first()).toBeVisible();

  await page.goto('/products/00000000-0000-0000-0000-000000000999');
  await expect(page.getByText('Không tìm thấy sản phẩm.')).toBeVisible();
});
