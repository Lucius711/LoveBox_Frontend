import { test, expect } from '@playwright/test';
import { PNG, USERS, api, data, login, ownerApplyBody, statusBadge, validBody } from './helpers.js';

// System 1 — Chủ đồ (Owner/Lender): khách thuê gửi đơn → admin duyệt mới được đăng đồ
// Requirement brief 5 — "Đăng đồ cho thuê" ; System 2.4 — CRUD sản phẩm, bắt buộc ≥ 3 ảnh + đủ Tags ; Admin kiểm duyệt
test.describe.configure({ mode: 'serial' });

const RUN = Date.now().toString(36);
const APPROVE = `E2E Đầm duyệt ${RUN}`;
const REJECT = `E2E Đầm từ chối ${RUN}`;
const productRow = (page, name) => page.locator('li').filter({ hasText: name });
const chipsOf = (page, label) => page.locator(`p.label:has-text("${label}") + div button`);
let approvedId;

test.describe('Đăng ký làm Chủ đồ', () => {
  test('khách thuê chưa được đăng đồ: nút "Đăng đồ cho thuê" dẫn tới form đăng ký', async ({ page }) => {
    expect((await (await api(USERS.fresh)).get('owner/products')).status()).toBe(403);
    await login(page, USERS.fresh);
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: /Đăng đồ cho thuê/ }).first().click();
    await expect(page).toHaveURL(/tab=owner/);
    await expect(page.getByRole('heading', { name: 'Đăng ký làm Chủ đồ' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đăng ký Chủ đồ' })).toBeVisible();   // tên tab của khách thuê
  });

  test('API chặn đơn thiếu / sai thông tin', async () => {
    const fresh = await api(USERS.fresh);
    const cases = { 'chưa cam kết': { agreed: false }, 'SĐT sai': { phone: '123' }, 'STK có chữ': { bankAccount: 'abc123' },
      'ngân hàng lạ': { bankName: 'Ngân hàng Mặt Trăng' }, 'giới thiệu quá ngắn': { intro: 'ngắn' }, 'thiếu địa chỉ': { address: '' } };
    for (const [name, patch] of Object.entries(cases))
      expect((await fresh.post('users/me/owner-application', { data: await ownerApplyBody(patch) })).status(), name).toBe(400);
    expect(await data(await fresh.get('users/me/owner-application'))).toBeFalsy();   // chưa có đơn nào
  });

  test('khách thuê gửi đơn trên web → chờ duyệt, không gửi trùng', async ({ page }) => {
    const { banks } = await data(await (await api()).get('products/meta'));
    await login(page, USERS.fresh);
    await page.goto('/account?tab=owner');
    await page.getByLabel('Số điện thoại').fill('0933333333');
    await page.getByLabel('Địa chỉ lấy / nhận lại đồ').fill('7 Đường Chủ Đồ, Q1');
    await page.getByLabel('STK nhận tiền thuê').fill('9704000033');
    await page.getByLabel('Ngân hàng').selectOption(banks[0]);
    await page.getByLabel('Bạn định cho thuê đồ gì?').fill('3 bộ áo dài lụa size M, mặc 1 lần (E2E).');
    await page.getByRole('button', { name: 'Gửi đơn đăng ký' }).click();
    await expect(page.getByRole('heading', { name: 'Đơn đăng ký Chủ đồ đang chờ duyệt' })).toHaveCount(0);   // chưa tick cam kết
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Gửi đơn đăng ký' }).click();
    await expect(page.getByRole('heading', { name: 'Đơn đăng ký Chủ đồ đang chờ duyệt' })).toBeVisible();

    const fresh = await api(USERS.fresh);
    expect((await fresh.post('users/me/owner-application', { data: await ownerApplyBody() })).status()).toBe(400);
    expect((await fresh.get('owner/products')).status()).toBe(403);   // đang chờ vẫn chưa được đăng đồ
  });

  test('admin duyệt trong tab "Đơn Chủ đồ" → khách thành Chủ đồ', async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto('/admin?tab=owners');
    const row = page.locator('li.card').filter({ hasText: USERS.fresh.email });
    await expect(row).toContainText('SĐT 0933333333');
    await expect(row).toContainText('STK 9704000033');
    await expect(row).toContainText('3 bộ áo dài lụa size M');
    await row.getByRole('button', { name: 'Duyệt' }).click();
    await expect(page.getByText('Đã duyệt Chủ đồ')).toBeVisible();
    await expect(row).toHaveCount(0);

    const fresh = await api(USERS.fresh);
    const me = await data(await fresh.get('users/me'));
    expect(me).toMatchObject({ role: 'OWNER', bankAccount: '9704000033' });   // STK trống được điền từ đơn
    expect((await fresh.get('owner/products')).status()).toBe(200);

    await login(page, USERS.fresh);
    await page.goto('/account?tab=owner');
    await expect(page.getByRole('main').getByRole('link', { name: 'Đăng đồ cho thuê' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cho thuê', exact: true })).toBeVisible();
  });

  test('từ chối phải có lý do; khách thấy lý do và gửi lại được', async ({ page }) => {
    const renter = await api(USERS.stylist);
    const app = await data(await renter.post('users/me/owner-application', { data: await ownerApplyBody() }));
    const admin = await api(USERS.admin);
    expect((await admin.post(`admin/owner-applications/${app.id}/review`, { data: { approve: false } })).status()).toBe(400);
    await data(await admin.post(`admin/owner-applications/${app.id}/review`, { data: { approve: false, reason: 'Thiếu ảnh đồ thật (E2E)' } }));
    expect((await admin.post(`admin/owner-applications/${app.id}/review`, { data: { approve: true } })).status()).toBe(400);   // đã xử lý
    expect((await data(await renter.get('users/me'))).role).toBe('RENTER');

    await login(page, USERS.stylist);
    await page.goto('/account?tab=owner');
    await expect(page.getByText('Thiếu ảnh đồ thật (E2E)')).toBeVisible();
    await expect(page.getByLabel('Số điện thoại')).toHaveValue('0944444444');   // điền sẵn từ đơn cũ
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Gửi đơn đăng ký' }).click();
    await expect(page.getByRole('heading', { name: 'Đơn đăng ký Chủ đồ đang chờ duyệt' })).toBeVisible();
    const again = await data(await renter.get('users/me/owner-application'));
    await data(await admin.post(`admin/owner-applications/${again.id}/review`, { data: { approve: false, reason: 'dọn test' } }));
  });

  test('Chủ đồ và Admin không gửi đơn đăng ký', async () => {
    for (const who of ['owner', 'admin'])
      expect((await (await api(USERS[who])).post('users/me/owner-application', { data: await ownerApplyBody() })).status(), who).toBe(400);
    expect((await (await api(USERS.renter)).get('admin/owner-applications')).status()).toBe(403);
  });
});

test.describe('Chủ đồ đăng / sửa / ẩn đồ, admin kiểm duyệt', () => {
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
});
