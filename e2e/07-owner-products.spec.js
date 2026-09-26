import { test, expect } from '@playwright/test';
import { PNG, USERS, api, data, login, statusBadge } from './helpers.js';

// Requirement brief — 5. "Đăng đồ cho thuê" ; System — 2.4 Chủ đồ đăng sản phẩm (CRUD, bắt buộc tags) ; Admin kiểm duyệt
test.describe.configure({ mode: 'serial' });

const RUN = Date.now().toString(36);
const APPROVE = `E2E Đầm duyệt ${RUN}`;
const REJECT = `E2E Đầm từ chối ${RUN}`;
const productRow = (page, name) => page.locator('li').filter({ hasText: name });
const chipsOf = (page, label) => page.locator(`p.label:has-text("${label}") + div button`);
let approvedId;

/** Body hợp lệ cho API tạo đồ; ảnh là URL presign R2 (backend chỉ nhận ảnh trên R2 của mình). */
async function validBody(owner, name, patch = {}) {
  const images = [];
  for (let i = 0; i < 3; i++)
    images.push((await data(await owner.post('files/presign', { data: { contentType: 'image/png', size: PNG.length } }))).publicUrl);
  return {
    name, description: 'Đồ đăng thử bằng kiểm thử tự động (E2E).', category: 'Váy dự tiệc', size: 'S',
    bustMax: 84, waistMax: 64, hipMax: 90, itemCondition: 'Mới 99%', retailPrice: 900000, rentPricePerDay: 90000,
    depositPercent: 60, colors: ['Đỏ đô'], styles: ['Thanh lịch'], occasions: ['Kỷ yếu'], features: [], images, ...patch,
  };
}

test('form đăng đồ: 3 ảnh + đủ nhãn → gửi duyệt', async ({ page }) => {
  // Chỉ giả lập bước PUT ảnh lên Cloudflare R2; presign vẫn gọi backend thật
  await page.route((url) => url.hostname.endsWith('r2.cloudflarestorage.com'), (route) => route.fulfill({
    status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'PUT', 'access-control-allow-headers': '*' },
  }));
  await login(page, USERS.owner);
  await page.goto('/account?tab=owner');
  await page.getByRole('link', { name: 'Đăng đồ cho thuê' }).first().click();
  await expect(page).toHaveURL(/\/owner\/products\/new/);

  await page.locator('input[type=file]').setInputFiles(['truoc', 'sau', 'vai'].map((n) => ({ name: `${n}.png`, mimeType: 'image/png', buffer: PNG })));
  await expect(page.getByRole('button', { name: 'Xoá ảnh' })).toHaveCount(3);
  for (const hint of ['Mặt trước', 'Mặt sau', 'Cận chất vải']) await expect(page.getByText(hint, { exact: true })).toBeVisible();

  await page.getByLabel('Tên món đồ').fill(APPROVE);
  await page.getByLabel(/^Mô tả/).fill('Đầm dạ hội đỏ, chất lụa, mặc 1 lần (E2E).');
  await page.getByLabel('Loại đồ').selectOption('Váy dự tiệc');
  await page.getByLabel('Độ mới').selectOption('Mới 99%');
  await page.getByRole('combobox', { name: 'Size', exact: true }).selectOption('M');
  for (const [k, v] of [['Ngực', '88'], ['Eo', '70'], ['Mông', '94']]) await page.getByLabel(k, { exact: true }).fill(v);
  for (const group of ['Màu sắc', 'Phong cách', 'Dịp phù hợp']) await chipsOf(page, group).first().click();
  await page.getByLabel('Giá niêm yết (giá mua gốc)').fill('1500000');
  await page.getByLabel('Giá thuê / ngày').fill('150000');
  await page.getByLabel(/^Tiền cọc:/).fill('80');
  await expect(page.getByText('Tiền cọc: 80% giá niêm yết')).toBeVisible();
  await page.getByRole('button', { name: 'Gửi duyệt' }).click();

  await expect(page).toHaveURL(/tab=owner/);
  await expect(statusBadge(productRow(page, APPROVE))).toHaveText('Chờ duyệt');
  approvedId = (await data(await (await api(USERS.owner)).get('owner/products'))).find((p) => p.name === APPROVE).id;
});

test('form bắt buộc đủ nhãn và ít nhất 3 ảnh', async ({ page }) => {
  await login(page, USERS.owner);
  await page.goto('/owner/products/new');
  await page.getByLabel('Tên món đồ').fill('Thiếu nhãn');
  await page.getByLabel(/^Mô tả/).fill('Mô tả đủ hai mươi ký tự cho form.');
  await page.getByLabel('Loại đồ').selectOption('Váy dự tiệc');
  await page.getByLabel('Độ mới').selectOption('Mới 99%');
  await page.getByRole('combobox', { name: 'Size', exact: true }).selectOption('M');
  for (const [k, v] of [['Ngực', '88'], ['Eo', '70'], ['Mông', '94'], ['Giá niêm yết (giá mua gốc)', '1000000'], ['Giá thuê / ngày', '100000']])
    await page.getByLabel(k, { exact: true }).fill(v);
  await page.getByRole('button', { name: 'Gửi duyệt' }).click();
  await expect(page.getByText('Chọn ít nhất 1 màu sắc')).toBeVisible();
  for (const group of ['Màu sắc', 'Phong cách', 'Dịp phù hợp']) await chipsOf(page, group).first().click();
  await page.getByRole('button', { name: 'Gửi duyệt' }).click();
  await expect(page.getByText('Cần ít nhất 3 ảnh')).toBeVisible();
});

test('API chặn dữ liệu thiếu / sai (nhãn, ảnh, cọc 50-100%, size, ảnh ngoài)', async () => {
  const owner = await api(USERS.owner);
  const cases = {
    'thiếu màu': { colors: [] },
    'thiếu phong cách': { styles: [] },
    'thiếu dịp': { occasions: [] },
    'chỉ 2 ảnh': 'images2',
    'cọc 40%': { depositPercent: 40 },
    'size XXL': { size: 'XXL' },
    'mô tả quá ngắn': { description: 'ngắn' },
    'ảnh ngoài R2': 'external',
  };
  for (const [name, patch] of Object.entries(cases)) {
    const body = await validBody(owner, `E2E sai ${name}`);
    if (patch === 'images2') body.images = body.images.slice(0, 2);
    else if (patch === 'external') body.images[0] = 'https://example.com/fake.jpg';
    else Object.assign(body, patch);
    expect((await owner.post('owner/products', { data: body })).ok(), name).toBeFalsy();
  }
});

test('đồ chờ duyệt chưa hiện với khách; admin duyệt → lên kệ', async ({ page }) => {
  expect((await data(await (await api()).get('products', { params: { q: APPROVE } }))).items).toHaveLength(0);
  await login(page, USERS.admin);
  await page.goto('/admin');
  const row = productRow(page, APPROVE);
  await expect(row).toContainText('Cọc 80%');
  await row.getByRole('button', { name: 'Duyệt' }).click();
  await expect(page.getByText('Đã duyệt')).toBeVisible();

  await page.goto(`/products?q=${encodeURIComponent(APPROVE)}`);
  await expect(page.getByRole('link', { name: APPROVE, exact: true })).toBeVisible();
});

test('admin từ chối kèm lý do → chủ đồ thấy lý do', async ({ page }) => {
  const owner = await api(USERS.owner);
  await data(await owner.post('owner/products', { data: await validBody(owner, REJECT) }));
  await login(page, USERS.admin);
  page.on('dialog', (d) => d.accept('Ảnh mờ (E2E)'));
  await page.goto('/admin');
  await productRow(page, REJECT).getByRole('button', { name: 'Từ chối' }).click();
  await expect(page.getByText('Đã từ chối')).toBeVisible();

  await login(page, USERS.owner);
  await page.goto('/account?tab=owner');
  const row = productRow(page, REJECT);
  await expect(statusBadge(row)).toHaveText('Bị từ chối');
  await expect(row).toContainText('Lý do: Ảnh mờ (E2E)');
});

test('chủ đồ sửa đồ đã duyệt → phải duyệt lại', async ({ page }) => {
  await login(page, USERS.owner);
  await page.goto(`/owner/products/${approvedId}/edit`);
  await expect(page.getByRole('heading', { name: 'Sửa món đồ' })).toBeVisible();
  await expect(page.getByLabel('Tên món đồ')).toHaveValue(APPROVE);
  await page.getByLabel('Giá thuê / ngày').fill('170000');
  await page.getByRole('button', { name: 'Gửi duyệt' }).click();
  await expect(page).toHaveURL(/tab=owner/);
  await expect(statusBadge(productRow(page, APPROVE))).toHaveText('Chờ duyệt');
  const p = (await data(await (await api(USERS.owner)).get('owner/products'))).find((x) => x.id === approvedId);
  expect(p.rentPricePerDay).toBe(170000);
  expect((await data(await (await api()).get('products', { params: { q: APPROVE } }))).items).toHaveLength(0);
});

test('chủ đồ ẩn đồ; người khác không sửa / ẩn được đồ của mình', async ({ page }) => {
  const stranger = await api(USERS.fresh);
  expect((await stranger.delete(`owner/products/${approvedId}`)).ok()).toBeFalsy();

  await login(page, USERS.owner);
  page.on('dialog', (d) => d.accept());
  await page.goto('/account?tab=owner');
  const row = productRow(page, APPROVE);
  await row.getByRole('button', { name: 'Ẩn' }).click();
  await expect(statusBadge(row)).toHaveText('Đã ẩn');
});

test('khách thường bấm "Trở thành Chủ đồ" → được đăng đồ', async ({ page }) => {
  await login(page, USERS.fresh);
  await page.goto('/account?tab=owner');
  await page.getByRole('button', { name: 'Trở thành Chủ đồ' }).click();
  await expect(page.getByText('Bạn đã là Chủ đồ!')).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Đăng đồ cho thuê' })).toBeVisible();
});
