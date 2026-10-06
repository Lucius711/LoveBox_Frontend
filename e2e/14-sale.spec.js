import { test, expect } from '@playwright/test';
import {
  E2E_PRODUCT, E2E_SALE, E2E_SALE2, PNG, USERS, api, bookingRow, data, futureDate, login, money, sql, statusBadge, validBody,
} from './helpers.js';

// Luồng THANH LÝ đồ cũ: mỗi món là RENT hoặc SALE. Món SALE chỉ có giá bán (không lịch, không cọc), admin vẫn duyệt,
// mua bằng COD / QR như đồ thuê, đơn đi PENDING → CONFIRMED → SHIPPING → COMPLETED. Đặt mua → món thành SOLD; huỷ → lên kệ lại.
test.describe.configure({ mode: 'serial' });

const RUN = Date.now().toString(36);
const RENT = 100000;
const DEPOSIT = 500000;
const SALE_TIMELINE = ['Chờ xác nhận', 'Đang giao', 'Đã nhận hàng'];
const row = (page, label) => page.locator('div.flex.justify-between').filter({ hasText: label }).last();
const chipsOf = (page, label) => page.locator(`p.label:has-text("${label}") + div button`);
const saleIds = async (params = {}) =>
  (await data(await (await api()).get('products', { params: { pageSize: 48, ...params } }))).items.map((p) => p.id);
const body = (items, paymentMethod = 'COD') => ({
  recipientName: 'E2E Người mua', phone: '0911111111', address: '1 Đường Test, Q1',
  deliveryMethod: 'PICKUP', paymentMethod, note: 'e2e sale', items,
});
let order; // đơn mua E2E_SALE đi hết vòng đời

test.describe('Database & API', () => {
  test('DB: cột listing_type / sale_price / kind, CHECK giá theo loại', async () => {
    const cols = async (t) => (await sql('SELECT column_name FROM information_schema.columns WHERE table_name = $1', [t])).map((r) => r.column_name);
    expect(await cols('dtb_products')).toEqual(expect.arrayContaining(['listing_type', 'sale_price']));
    expect(await cols('dtb_bookings')).toContain('kind');
    await expect(sql(`UPDATE dtb_products SET sale_price = 0 WHERE id = $1`, [E2E_SALE.id])).rejects.toThrow();   // SALE phải có giá bán
    await expect(sql(`UPDATE dtb_products SET listing_type = 'GIFT' WHERE id = $1`, [E2E_SALE.id])).rejects.toThrow();
  });

  test('tìm kiếm: mặc định chỉ đồ thuê, type=SALE chỉ đồ thanh lý; chi tiết có giá bán', async () => {
    const rent = await saleIds();
    const sale = await saleIds({ type: 'SALE' });
    expect(rent).toContain(E2E_PRODUCT.id);
    expect(rent).not.toContain(E2E_SALE.id);
    expect(sale).toEqual(expect.arrayContaining([E2E_SALE.id, E2E_SALE2.id]));
    expect(sale).not.toContain(E2E_PRODUCT.id);

    const asc = (await data(await (await api()).get('products', { params: { type: 'SALE', sort: 'priceAsc', minPrice: 300000, maxPrice: 500000 } }))).items;
    expect(asc.map((p) => p.salePrice)).toEqual([...asc.map((p) => p.salePrice)].sort((a, b) => a - b));   // lọc + sắp theo giá bán
    expect(asc.map((p) => p.id)).toEqual(expect.arrayContaining([E2E_SALE.id, E2E_SALE2.id]));

    const d = await data(await (await api()).get(`products/${E2E_SALE.id}`));
    expect(d).toMatchObject({ listingType: 'SALE', salePrice: E2E_SALE.price, rentPricePerDay: 0, status: 'APPROVED' });
  });

  test('đặt đơn: đồ thuê vẫn bắt buộc ngày; không mua đồ của chính mình', async () => {
    const renter = await api(USERS.renter);
    expect((await renter.post('bookings/checkout', { data: body([{ productId: E2E_PRODUCT.id }]) })).status()).toBe(400);
    const own = await (await api(USERS.owner)).post('bookings/checkout', { data: body([{ productId: E2E_SALE.id }]) });
    expect(own.ok()).toBeFalsy();
    expect((await sql('SELECT status FROM dtb_products WHERE id = $1', [E2E_SALE.id]))[0].status).toBe('APPROVED');   // lỗi → rollback, không bị giữ hàng
  });
});

test.describe('Chủ đồ đăng đồ thanh lý → admin duyệt', () => {
  test('API: giá bán bắt buộc, loại món cố định sau khi tạo', async () => {
    const owner = await api(USERS.owner);
    const bad = await owner.post('owner/products', { data: await validBody(owner, `E2E thiếu giá ${RUN}`, { listingType: 'SALE', salePrice: 0, rentPricePerDay: 0 }) });
    expect(bad.status()).toBe(400);
    expect(await bad.text()).toContain('Giá bán tối thiểu');
    expect((await owner.post('owner/products', { data: await validBody(owner, `E2E thuê 0đ ${RUN}`, { rentPricePerDay: 0 }) })).status()).toBe(400);

    const req = await validBody(owner, `E2E thanh lý API ${RUN}`, { listingType: 'SALE', salePrice: 250000, rentPricePerDay: 0 });
    const p = await data(await owner.post('owner/products', { data: req }));
    expect(p).toMatchObject({ listingType: 'SALE', salePrice: 250000, rentPricePerDay: 0, status: 'PENDING' });
    const upd = await data(await owner.put(`owner/products/${p.id}`, { data: { ...req, listingType: 'RENT', rentPricePerDay: 90000, salePrice: 260000 } }));
    expect(upd).toMatchObject({ listingType: 'SALE', salePrice: 260000 });

    expect(await saleIds({ type: 'SALE' })).not.toContain(p.id);   // chưa duyệt thì chưa lên kệ
    await data(await (await api(USERS.admin)).post(`admin/products/${p.id}/review`, { data: { approve: true } }));
    expect(await saleIds({ type: 'SALE' })).toContain(p.id);
    expect(await saleIds()).not.toContain(p.id);
  });

  test('UI: tab Thanh lý → form không có giá thuê / cọc → gửi duyệt; admin thấy giá bán', async ({ page }) => {
    await page.route((url) => url.hostname.endsWith('r2.cloudflarestorage.com'), (route) => route.fulfill({
      status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'PUT', 'access-control-allow-headers': '*' },
    }));
    const NAME = `E2E Đầm thanh lý UI ${RUN}`;
    await login(page, USERS.owner);
    await page.goto('/account?tab=owner');
    await page.getByRole('button', { name: /^Thanh lý\d*$/ }).click();
    await expect(page).toHaveURL(/kind=SALE/);
    await expect(page.getByRole('heading', { name: 'Đồ thanh lý của tôi' })).toBeVisible();
    await page.getByRole('link', { name: 'Đăng đồ thanh lý' }).click();

    await expect(page).toHaveURL(/\/owner\/products\/new\?type=SALE/);
    await expect(page.getByRole('heading', { name: 'Đăng đồ thanh lý' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Thanh lý/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Giá thuê / ngày')).toHaveCount(0);
    await expect(page.getByText(/^Tiền cọc:/)).toHaveCount(0);

    await page.locator('input[type=file]').setInputFiles(['truoc', 'sau', 'vai'].map((n) => ({ name: `${n}.png`, mimeType: 'image/png', buffer: PNG })));
    await expect(page.getByRole('button', { name: 'Xoá ảnh' })).toHaveCount(3);
    await page.getByLabel('Tên món đồ').fill(NAME);
    await page.getByLabel(/^Mô tả/).fill('Đầm mặc 1 lần, thanh lý lại giá tốt (E2E).');
    await page.getByLabel('Loại đồ').selectOption('Váy dự tiệc');
    await page.getByLabel('Độ mới').selectOption('Mới 99%');
    await page.getByRole('combobox', { name: 'Size', exact: true }).selectOption('M');
    for (const [k, v] of [['Ngực', '88'], ['Eo', '70'], ['Mông', '94']]) await page.getByLabel(k, { exact: true }).fill(v);
    for (const group of ['Màu sắc', 'Phong cách', 'Dịp phù hợp']) await chipsOf(page, group).first().click();
    await page.getByLabel('Giá gốc (lúc mua mới)').fill('1000000');
    await page.getByLabel('Giá bán thanh lý').fill('300000');
    await expect(page.getByText('Rẻ hơn giá gốc 70%')).toBeVisible();
    await page.getByRole('button', { name: 'Gửi duyệt' }).click();

    await expect(page).toHaveURL(/tab=owner.*kind=SALE/);
    const item = page.locator('li').filter({ hasText: NAME });
    await expect(item).toContainText(`Giá bán ${money(300000)}`);
    await expect(item.locator('span.whitespace-nowrap')).toHaveText('Chờ duyệt');
    await page.getByRole('button', { name: /^Cho thuê\d*$/ }).click();
    await expect(page.locator('li').filter({ hasText: NAME })).toHaveCount(0);   // không lẫn sang tab Cho thuê

    await login(page, USERS.admin);
    await page.goto('/admin?tab=products');
    await expect(page.locator('li.card').filter({ hasText: NAME })).toContainText(new RegExp(`Thanh lý · Giá gốc ${money(1000000)}\\s*₫ · Giá bán ${money(300000)}\\s*₫`));
  });
});

test.describe('Khách mua đồ thanh lý', () => {
  test('danh mục: tab Thanh lý chỉ hiện đồ thanh lý, có nhãn + giá bán', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByRole('link', { name: E2E_SALE.name })).toHaveCount(0);
    await page.getByRole('main').getByRole('button', { name: 'Thanh lý', exact: true }).click();
    await expect(page).toHaveURL(/type=SALE/);
    await expect(page.getByRole('heading', { level: 1, name: 'Đồ thanh lý' })).toBeVisible();
    await expect(page.getByText('Khoảng giá bán')).toBeVisible();
    await expect(page.getByText('Tình trạng', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: E2E_PRODUCT.name })).toHaveCount(0);

    const card = page.locator('div.group').filter({ hasText: E2E_SALE.name });
    await expect(card).toContainText('Thanh lý');
    await expect(card).toContainText(money(E2E_SALE.price));
    await expect(card).not.toContainText('/ngày');
  });

  test('chi tiết → Mua ngay (không chọn ngày) → giỏ không cọc → đặt mua COD', async ({ page }) => {
    await login(page, USERS.renter);
    await page.goto(`/products/${E2E_SALE.id}`);
    await expect(page.getByText('Mua đứt, không cần trả lại, không đặt cọc')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chọn ngày nhận và trả đồ' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Mua ngay' }).click();

    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByText('Mua thanh lý')).toBeVisible();
    await expect(row(page, 'Tiền đồ (thuê / mua)')).toContainText(money(E2E_SALE.price));
    await expect(page.getByText('Tiền cọc bảo đảm')).toHaveCount(0);
    await page.getByRole('button', { name: 'Tiến hành đặt hàng' }).click();

    await expect(page.getByRole('heading', { name: 'Đặt mua' })).toBeVisible();
    await page.getByText('Tự đến lấy', { exact: true }).click();
    await page.getByText('Thanh toán khi nhận (COD)').click();
    await expect(row(page, 'Thành tiền')).toContainText(money(E2E_SALE.price));
    await page.getByRole('button', { name: 'Đặt mua', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Đặt mua thành công!' })).toBeVisible();
    await expect(page.getByText(`Tổng: ${money(E2E_SALE.price)}`, { exact: false })).toBeVisible();

    order = (await data(await (await api(USERS.renter)).get('bookings/mine'))).find((b) => b.productId === E2E_SALE.id && b.status === 'PENDING');
    expect(order).toMatchObject({ kind: 'SALE', rentAmount: E2E_SALE.price, depositAmount: 0, shippingFee: 0, totalAmount: E2E_SALE.price, days: 0 });

    await page.goto('/account');
    const r = bookingRow(page, order.code);
    await expect(r).toContainText('Mua thanh lý');
    await expect(r).toContainText(`Giá bán ${money(E2E_SALE.price)}`);
    await expect(r).not.toContainText('Cọc');
    await expect(r.locator('ol > li')).toHaveText(SALE_TIMELINE);
  });

  test('đã có người mua: món thành Đã bán, rời kệ, người khác không mua được', async ({ page }) => {
    expect((await sql('SELECT status FROM dtb_products WHERE id = $1', [E2E_SALE.id]))[0].status).toBe('SOLD');
    expect(await saleIds({ type: 'SALE' })).not.toContain(E2E_SALE.id);
    const again = await (await api(USERS.stylist)).post('bookings/checkout', { data: body([{ productId: E2E_SALE.id }]) });
    expect(again.ok()).toBeFalsy();
    expect(await again.text()).toContain('đã có người mua');

    await login(page, USERS.stylist);
    await page.goto(`/products/${E2E_SALE.id}`);   // link trong đơn mua vẫn mở được
    await expect(page.getByText('Món này đã có người mua')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mua ngay' })).toHaveCount(0);
  });
});

test.describe('Chủ đồ xử lý đơn mua', () => {
  test('tab Thanh lý: xác nhận → đã gửi → khách đã nhận = Đã bán; không lẫn sang tab Cho thuê', async ({ page }) => {
    const owner = await api(USERS.owner);
    expect((await owner.patch(`owner/bookings/${order.id}/status`, { data: { status: 'RENTED' } })).ok()).toBeFalsy();   // đơn mua không có "Đang thuê"

    await login(page, USERS.owner);
    await page.goto('/account?tab=owner&kind=SALE');
    await expect(page.getByRole('heading', { name: /Đơn mua đồ thanh lý/ })).toBeVisible();
    const r = bookingRow(page, order.code);
    await expect(r).toContainText(/E2E renter · 0\d{9,10} · Tự đến lấy/);   // đặt qua giao diện: người nhận lấy từ hồ sơ khách
    for (const [button, status] of [['Xác nhận đơn', 'Đã xác nhận'], ['Đã gửi đi', 'Đang giao'], ['Khách đã nhận', 'Đã bán']]) {
      await r.getByRole('button', { name: button }).click();
      await expect(statusBadge(r)).toHaveText(status);
    }
    await expect(r).toContainText('COD · Đã thanh toán');   // COD: thu tiền khi giao
    await expect(r.getByRole('button')).toHaveCount(0);

    const item = page.locator('li').filter({ hasText: E2E_SALE.name }).last();
    await expect(item.locator('span.whitespace-nowrap')).toHaveText('Đã bán');
    await expect(item.getByRole('link', { name: 'Sửa' })).toHaveCount(0);

    await page.getByRole('button', { name: /^Cho thuê\d*$/ }).click();
    await expect(bookingRow(page, order.code)).toHaveCount(0);

    const done = (await data(await owner.get('owner/bookings'))).find((b) => b.id === order.id);
    expect(done).toMatchObject({ status: 'COMPLETED', paymentStatus: 'PAID', depositStatus: 'PENDING', refundAmount: null });
    expect((await data(await owner.get('owner/stats'))).revenue).toBeGreaterThanOrEqual(E2E_SALE.price);   // doanh thu gồm tiền bán
  });

  test('món đã bán không sửa được; khách đánh giá được đơn mua', async () => {
    const owner = await api(USERS.owner);
    const d = await data(await owner.get(`products/${E2E_SALE.id}`));
    const edit = await owner.put(`owner/products/${E2E_SALE.id}`, { data: { ...d, name: 'Đổi tên (E2E)' } });
    expect(edit.status()).toBe(400);
    expect(await edit.text()).toContain('Món đã bán');
    await data(await (await api(USERS.renter)).post(`bookings/${order.id}/review`, { data: { rating: 5, comment: 'Đồ như mô tả (E2E)' } }));
  });
});

test('giỏ trộn thuê + mua: tiền đúng; huỷ đơn mua → món lên kệ lại', async ({ page }) => {
  const renter = await api(USERS.renter);
  const start = futureDate(8, 4), end = futureDate(9, 4);
  const res = await data(await renter.post('bookings/checkout', {
    data: body([{ productId: E2E_PRODUCT.id, startDate: start, endDate: end }, { productId: E2E_SALE2.id }]),
  }));
  expect(res.totalAmount).toBe(2 * RENT + DEPOSIT + E2E_SALE2.price);
  const sale = res.bookings.find((b) => b.kind === 'SALE');
  const rent = res.bookings.find((b) => b.kind === 'RENT');
  expect(sale).toMatchObject({ productId: E2E_SALE2.id, depositAmount: 0, totalAmount: E2E_SALE2.price });
  expect(rent).toMatchObject({ productId: E2E_PRODUCT.id, days: 2, depositAmount: DEPOSIT });
  expect(await saleIds({ type: 'SALE' })).not.toContain(E2E_SALE2.id);

  await login(page, USERS.renter);
  page.on('dialog', (d) => d.accept());
  await page.goto('/account');
  await bookingRow(page, sale.code).getByRole('button', { name: 'Huỷ đơn' }).click();
  await expect(statusBadge(bookingRow(page, sale.code))).toHaveText('Đã huỷ');
  expect((await sql('SELECT status FROM dtb_products WHERE id = $1', [E2E_SALE2.id]))[0].status).toBe('APPROVED');
  expect(await saleIds({ type: 'SALE' })).toContain(E2E_SALE2.id);

  await data(await renter.post(`bookings/${rent.id}/cancel`));   // trả lịch cho các spec sau
});
