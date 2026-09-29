import { test, expect } from '@playwright/test';
import { E2E_PRODUCT, SEED_PRODUCT, USERS, api, bookingRow, checkoutBody, data, futureDate, login, money, pickDates } from './helpers.js';

// Requirement brief — 4. LUỒNG THANH TOÁN ; System — 2.3 Thanh toán & Tính tiền cọc
// Đồ e2e: 100.000đ/ngày, giá niêm yết 1.000.000đ, cọc 50% = 500.000đ. Ship hoả tốc 30.000đ/đơn.
test.describe.configure({ mode: 'serial' });

const RENT = 100000;
const DEPOSIT = 500000;
const SHIP = 30000;
const row = (page, label) => page.locator('div.flex.justify-between').filter({ hasText: label }).last();
const cartItem = (id, name, startDate = null, endDate = null) => ({
  productId: id, name, image: null, rentPricePerDay: RENT, deposit: DEPOSIT, size: 'M', startDate, endDate,
});

test('giỏ hàng: chọn ngày → tự tính số ngày, tiền thuê, cọc, tạm tính', async ({ page }) => {
  await login(page, USERS.renter);
  await page.goto(`/products/${E2E_PRODUCT.id}`);
  await pickDates(page, 20, 21);
  await expect(row(page, 'Tạm tính')).toContainText(money(2 * RENT + DEPOSIT));
  await page.getByRole('button', { name: 'Thuê ngay' }).click();

  await expect(page).toHaveURL(/\/cart/);
  await expect(page.getByText('(2 ngày)')).toBeVisible();
  await expect(row(page, 'Tiền thuê')).toContainText(money(2 * RENT));
  await expect(row(page, 'Tiền cọc bảo đảm')).toContainText(money(DEPOSIT));
  await expect(row(page, 'Tạm tính')).toContainText(money(2 * RENT + DEPOSIT));

  // Đổi ngày ngay trong giỏ: 22 → 24 = 3 ngày
  await page.getByRole('button', { name: /\(2 ngày\)/ }).click();
  const cal = page.locator('div.select-none');
  await cal.getByRole('button', { name: '22', exact: true }).click();
  await cal.getByRole('button', { name: '24', exact: true }).click();
  await expect(page.getByText('(3 ngày)')).toBeVisible();
  await expect(row(page, 'Tạm tính')).toContainText(money(3 * RENT + DEPOSIT));
});

test('checkout: Thành tiền = tiền thuê × ngày + cọc + phí ship; đặt COD thành công', async ({ page }) => {
  await login(page, USERS.renter);
  await page.goto(`/products/${E2E_PRODUCT.id}`);
  await pickDates(page, 22, 24);
  await page.getByRole('button', { name: 'Thuê ngay' }).click();
  await page.getByRole('button', { name: 'Tiến hành đặt thuê' }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  // Thông tin giao nhận điền sẵn từ hồ sơ
  await expect(page.getByLabel('Số điện thoại')).toHaveValue('0911111111');
  await expect(page.getByLabel('Họ tên người nhận')).not.toHaveValue('');

  // Ship hoả tốc (mặc định) cộng 30k, tự đến lấy thì 0đ
  await expect(row(page, 'Phí vận chuyển')).toContainText(money(SHIP));
  await expect(row(page, 'Thành tiền')).toContainText(money(3 * RENT + DEPOSIT + SHIP));
  await page.getByText('Tự đến lấy', { exact: true }).click();
  await expect(row(page, 'Thành tiền')).toContainText(money(3 * RENT + DEPOSIT));

  // SĐT sai định dạng → không gửi được
  const phone = page.getByLabel('Số điện thoại');
  await phone.fill('123');
  await page.getByText('Thanh toán khi nhận (COD)').click();
  await page.getByRole('button', { name: 'Đặt thuê', exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  expect(await phone.evaluate((el) => el.validity.valid)).toBe(false);

  await phone.fill('0922222222');
  await page.getByLabel('Địa chỉ nhận đồ').fill('12 Đường Checkout, Q1');
  await page.getByRole('button', { name: 'Đặt thuê', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Đặt thuê thành công!' })).toBeVisible();
  await expect(page.getByText(`Tổng: ${money(3 * RENT + DEPOSIT)}`, { exact: false })).toBeVisible();

  // Kiểm tra số tiền lưu ở backend + SĐT/địa chỉ được lưu cho lần sau
  const renter = await api(USERS.renter);
  const booking = (await data(await renter.get('bookings/mine'))).find((b) => b.productId === E2E_PRODUCT.id && b.startDate === futureDate(22));
  expect(booking).toMatchObject({ days: 3, rentAmount: 3 * RENT, depositAmount: DEPOSIT, shippingFee: 0, totalAmount: 3 * RENT + DEPOSIT,
    paymentMethod: 'COD', paymentStatus: 'UNPAID', status: 'PENDING', depositStatus: 'PENDING' });
  await expect.poll(async () => (await data(await renter.get('users/me'))).phone).toBe('0922222222');
});

test('phí ship tính 1 lần cho cả đơn nhiều món', async () => {
  const res = await data(await (await api(USERS.renter)).post('bookings/checkout', { data: {
    recipientName: 'E2E', phone: '0911111111', address: '1 Test', deliveryMethod: 'EXPRESS', paymentMethod: 'COD',
    items: [{ productId: E2E_PRODUCT.id, startDate: futureDate(25, 2), endDate: futureDate(26, 2) },
      { productId: SEED_PRODUCT.id, startDate: futureDate(25, 2), endDate: futureDate(26, 2) }],
  } }));
  expect(res.bookings).toHaveLength(2);
  expect(res.bookings.reduce((s, b) => s + b.shippingFee, 0)).toBe(SHIP);
  expect(res.totalAmount).toBe(res.bookings.reduce((s, b) => s + b.rentAmount + b.depositAmount + b.shippingFee, 0));
});

test('thanh toán QR: hiện mã QR (PayOS đã cấu hình) hoặc báo lỗi rõ ràng', async ({ page }) => {
  await login(page, USERS.renter);
  await page.goto(`/products/${SEED_PRODUCT.id}`);
  await pickDates(page, 3, 3);
  await page.getByRole('button', { name: 'Thuê ngay' }).click();
  await page.getByRole('button', { name: 'Tiến hành đặt thuê' }).click();
  await page.getByText('Chuyển khoản QR').click();
  await page.getByRole('button', { name: 'Đặt thuê & lấy mã QR' }).click();
  const qr = page.getByRole('heading', { name: 'Quét mã để thanh toán' });
  await expect(qr.or(page.getByText(/Không tạo được mã QR/))).toBeVisible();
  if (await qr.isVisible()) {
    await expect(page.getByText('Đang chờ thanh toán…')).toBeVisible();
    await expect(page.getByRole('link', { name: /Mở trang thanh toán PayOS/ })).toBeVisible();
  }
});

test('đơn QR chưa thanh toán → "Tiếp tục thanh toán" từ Đơn thuê của tôi', async ({ page }) => {
  const res = await (await api(USERS.renter)).post('bookings/checkout', { data: checkoutBody(SEED_PRODUCT.id, futureDate(8, 3), futureDate(9, 3), 'PAYOS') });
  test.skip(!res.ok(), 'PayOS chưa cấu hình ở backend này');
  const { checkoutCode, bookings } = (await res.json()).data;
  await login(page, USERS.renter);
  await page.goto('/account');
  const row = bookingRow(page, bookings[0].code);
  await expect(row).toContainText('Chưa thanh toán');
  await row.getByRole('link', { name: 'Tiếp tục thanh toán' }).click();
  await expect(page).toHaveURL(new RegExp(`/checkout/success\\?code=${checkoutCode}`));
  await expect(page.getByRole('heading', { name: 'Quét mã để thanh toán' })).toBeVisible();
  await expect(page.getByText(`Mã đơn ${checkoutCode}`)).toBeVisible();
  await expect(page.getByText('Đang chờ thanh toán…')).toBeVisible();
  await page.getByRole('link', { name: 'Để sau, xem trong Đơn thuê của tôi' }).click();
  await expect(page).toHaveURL(/\/account/);
  await data(await (await api(USERS.renter)).post(`bookings/${bookings[0].id}/cancel`));   // trả lịch
});

test.fixme('checkout có ô nhập STK nhận tiền hoàn cọc', async ({ page }) => {
  // Requirement 4: "Điền thông tin giao nhận: Tên, SĐT, Địa chỉ, hình thức giao hàng, stk nhận tiền hoàn sau khi trả đồ"
  // App hiện chỉ nhập STK ở trang Hồ sơ (hoặc dùng tài khoản đã quét QR).
  await login(page, USERS.renter);
  await page.addInitScript((i) => localStorage.setItem('lt_cart', JSON.stringify([i])), cartItem(E2E_PRODUCT.id, E2E_PRODUCT.name, futureDate(27, 3), futureDate(28, 3)));
  await page.goto('/checkout');
  await expect(page.getByLabel(/STK nhận hoàn cọc/)).toBeVisible();
  await expect(page.getByLabel('Ngân hàng')).toBeVisible();
});

test('giỏ chưa chọn ngày / ngày đã qua → chưa cho đặt; xoá món khỏi giỏ', async ({ page }) => {
  await page.addInitScript((items) => localStorage.setItem('lt_cart', JSON.stringify(items)), [
    cartItem(E2E_PRODUCT.id, E2E_PRODUCT.name),
    cartItem(SEED_PRODUCT.id, SEED_PRODUCT.name, '2020-01-01', '2020-01-02'),
  ]);
  await page.goto('/cart');
  await expect(page.getByRole('button', { name: 'Chọn ngày nhận & trả đồ' })).toBeVisible();
  await expect(page.getByText('Ngày nhận đã qua, chọn lại nhé.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tiến hành đặt thuê' })).toBeDisabled();
  await expect(page.getByText('Chọn ngày thuê cho tất cả món trước nhé')).toBeVisible();

  await page.getByRole('button', { name: 'Xoá' }).first().click();
  await page.getByRole('button', { name: 'Xoá' }).first().click();
  await expect(page.getByText('Giỏ đang trống.')).toBeVisible();
});

test('khách chưa đăng nhập bấm đặt thuê → sang trang đăng nhập', async ({ page }) => {
  await page.addInitScript((i) => localStorage.setItem('lt_cart', JSON.stringify([i])),
    cartItem(SEED_PRODUCT.id, SEED_PRODUCT.name, futureDate(10, 2), futureDate(11, 2)));
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Tiến hành đặt thuê' }).click();
  await expect(page).toHaveURL(/\/login/);
});
