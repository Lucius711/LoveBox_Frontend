import { test, expect } from '@playwright/test';
import { E2E_PRODUCT, USERS, api, bookCOD, bookingRow, data, futureDate, login, money, statusBadge } from './helpers.js';

// Requirement brief — 5. QUẢN LÝ TÀI KHOẢN (lịch sử thuê + trạng thái) ; System — 1. Phân quyền (Owner xác nhận đơn, theo dõi doanh thu;
// Admin quản lý tranh chấp, dòng tiền) ; 2.3 Logic hoàn cọc (đã đổi sang admin chuyển khoản THỦ CÔNG theo yêu cầu) ; Users.TrustScore
test.describe.configure({ mode: 'serial' });

const DEPOSIT = 500000;
const TIMELINE = ['Chờ xác nhận', 'Đang giao', 'Đang thuê', 'Đã trả đồ', 'Đã hoàn cọc'];
let main; // đơn chính đi hết vòng đời

/** Trả lời hộp thoại của admin: số tiền trừ = mức tối đa, mô tả hư hỏng, mã giao dịch; confirm → OK. */
function answerDialogs(page) {
  page.on('dialog', (d) => {
    const max = d.message().match(/tối đa (\d+)/);
    if (max) return d.accept(max[1]);
    if (d.message().includes('Mã giao dịch')) return d.accept('FT-E2E-123');
    return d.accept(d.type() === 'prompt' ? 'Rách gấu váy (E2E)' : undefined);
  });
}
const toOwnerReturned = async (id) => {
  const owner = await api(USERS.owner);
  for (const status of ['CONFIRMED', 'RENTED', 'RETURNED']) await data(await owner.patch(`owner/bookings/${id}/status`, { data: { status } }));
};

test('khách: đơn mới "Chờ xác nhận" + thanh tiến trình 5 bước', async ({ page }) => {
  main = await bookCOD(USERS.renter, E2E_PRODUCT.id, futureDate(5, 2), futureDate(7, 2));
  await login(page, USERS.renter);
  await page.goto('/account');
  const row = bookingRow(page, main.code);
  await expect(statusBadge(row)).toHaveText('Chờ xác nhận');
  await expect(row.locator('ol > li')).toHaveText(TIMELINE);
  await expect(row).toContainText('COD · Chưa thanh toán · Chưa thu');
});

test('chủ đồ: thấy đơn mới, xác nhận → đã gửi → khách đã nhận → nhận lại đồ', async ({ page }) => {
  await login(page, USERS.owner);
  await page.goto('/account?tab=owner');
  await expect(page.getByText(/\d+ mới/)).toBeVisible();
  const row = bookingRow(page, main.code);
  await expect(row).toContainText('E2E Người nhận · 0911111111 · Tự đến lấy');
  const steps = [['Xác nhận đơn', 'Đã xác nhận'], ['Đã gửi đi', 'Đang giao'], ['Khách đã nhận', 'Đang thuê'], ['Đã nhận lại đồ', 'Đã trả đồ']];
  for (const [button, status] of steps) {
    await row.getByRole('button', { name: button }).click();
    await expect(statusBadge(row)).toHaveText(status);
  }
  await expect(row).toContainText('Đã thanh toán · Đang giữ cọc'); // COD: thu tiền + giữ cọc khi khách nhận đồ

  const stats = await data(await (await api(USERS.owner)).get('owner/stats'));
  expect(stats.revenue).toBeGreaterThanOrEqual(main.rentAmount);
  await expect(page.getByText('Doanh thu thuê')).toBeVisible();
});

test('chủ đồ không được đẩy đơn sang hoàn cọc (chỉ admin)', async () => {
  const res = await (await api(USERS.owner)).patch(`owner/bookings/${main.id}/status`, { data: { status: 'COMPLETED' } });
  expect(res.ok()).toBeFalsy();
});

test('admin: đồ hư hỏng → tranh chấp → chốt, cọc bị trừ hết; khách bị trừ uy tín', async ({ page }) => {
  await login(page, USERS.admin);
  answerDialogs(page);
  await page.goto('/admin?tab=bookings');
  const row = bookingRow(page, main.code);
  await row.getByRole('button', { name: 'Hư hỏng → Tranh chấp' }).click();
  await expect(statusBadge(row)).toHaveText('Tranh chấp');
  await expect(row).toContainText(`Trừ cọc ${money(DEPOSIT)}`);
  await expect(row).toContainText('Ghi chú kiểm định: Rách gấu váy (E2E)');

  await row.getByRole('button', { name: 'Chốt & hoàn phần cọc còn lại' }).click();
  await expect(statusBadge(row)).toHaveText('Đã hoàn cọc');
  await expect(row).toContainText('Mất cọc');

  const me = await data(await (await api(USERS.renter)).get('users/me'));
  expect(me.trustScore).toBe(80);

  const stats = await data(await (await api(USERS.admin)).get('admin/stats'));
  expect(stats.depositsForfeited).toBeGreaterThanOrEqual(DEPOSIT);
  await page.getByRole('button', { name: 'Dòng tiền' }).click();
  for (const card of ['Cọc đang giữ (Hold)', 'Cọc bị trừ (hư hỏng)', 'Chờ chuyển khoản hoàn tiền', 'Tranh chấp đang mở'])
    await expect(page.getByText(card)).toBeVisible();
});

test('khách đánh giá đơn đã xong → hiện trên trang sản phẩm', async ({ page }) => {
  await login(page, USERS.renter);
  await page.goto('/account');
  const row = bookingRow(page, main.code);
  await row.getByRole('button', { name: '4 sao' }).click();
  await row.getByPlaceholder('Nhận xét (tuỳ chọn)').fill('Đồ đẹp, giao nhanh (E2E)');
  await row.getByRole('button', { name: 'Gửi' }).click();
  await expect(page.getByText('Cảm ơn bạn đã đánh giá')).toBeVisible();
  await expect(row.getByRole('button', { name: 'Gửi' })).toHaveCount(0);
  expect((await (await api(USERS.renter)).post(`bookings/${main.id}/review`, { data: { rating: 5 } })).ok()).toBeFalsy(); // không đánh giá 2 lần

  await page.goto(`/products/${E2E_PRODUCT.id}`);
  await expect(page.getByText('Đồ đẹp, giao nhanh (E2E)')).toBeVisible();
  await expect(page.getByText(/4\.0 · 1 đánh giá/)).toBeVisible();
});

test('hoàn cọc thủ công: phải có STK, admin chuyển khoản rồi bấm xác nhận', async ({ page }) => {
  const b = await bookCOD(USERS.renter, E2E_PRODUCT.id, futureDate(3, 3), futureDate(4, 3));
  await toOwnerReturned(b.id);
  const admin = await api(USERS.admin);

  const blocked = await admin.patch(`admin/bookings/${b.id}/status`, { data: { status: 'COMPLETED' } });
  expect(blocked.status()).toBe(400);
  expect(await blocked.text()).toContain('Chưa có tài khoản nhận hoàn tiền');

  const { banks } = await data(await (await api()).get('products/meta'));
  await data(await (await api(USERS.renter)).patch('users/me', { data: { bankAccount: '0123456789', bankName: banks[0] } }));

  await login(page, USERS.admin);
  answerDialogs(page);
  await page.goto('/admin?tab=bookings');
  const row = bookingRow(page, b.code);
  await expect(row).toContainText('Hoàn cọc: STK hồ sơ khách');
  await row.getByRole('button', { name: 'Kiểm định OK → Hoàn cọc' }).click();
  await expect(statusBadge(row)).toHaveText('Đã hoàn cọc');
  await expect(row).toContainText('0123456789'); // chốt hoàn cọc → STK khách hiện để admin chuyển khoản
  await expect(row).toContainText(`Chờ hoàn ${money(DEPOSIT)}`);

  await row.getByRole('button', { name: 'Đã chuyển khoản' }).click();
  await expect(page.getByText('Đã ghi nhận hoàn tiền')).toBeVisible();
  await expect(row).toContainText(new RegExp(`Đã hoàn ${money(DEPOSIT)}.*về ${banks[0]}`));
  await expect(row.getByRole('button', { name: 'Đã chuyển khoản' })).toHaveCount(0);
  expect((await admin.post(`admin/bookings/${b.id}/refund/confirm`, { data: {} })).ok()).toBeFalsy(); // không xác nhận 2 lần
});

test('trừ một phần cọc: hoàn phần còn lại', async () => {
  const b = await bookCOD(USERS.renter, E2E_PRODUCT.id, futureDate(10, 3), futureDate(11, 3));
  await toOwnerReturned(b.id);
  const admin = await api(USERS.admin);
  await data(await admin.patch(`admin/bookings/${b.id}/status`, { data: { status: 'DISPUTED', deductionAmount: 100000, note: 'Bẩn nhẹ' } }));
  const done = await data(await admin.patch(`admin/bookings/${b.id}/status`, { data: { status: 'COMPLETED' } }));
  expect(done).toMatchObject({ deductionAmount: 100000, refundAmount: DEPOSIT - 100000, refundStatus: 'PROCESSING', depositStatus: 'REFUNDED' });
  const confirmed = await data(await admin.post(`admin/bookings/${b.id}/refund/confirm`, { data: { ref: 'FT1' } }));
  expect(confirmed.refundStatus).toBe('SUCCEEDED');
});

test('khách huỷ đơn chờ xác nhận; chủ đồ từ chối đơn', async ({ page }) => {
  const mine = await bookCOD(USERS.renter, E2E_PRODUCT.id, futureDate(15, 2), futureDate(16, 2));
  const other = await bookCOD(USERS.renter, E2E_PRODUCT.id, futureDate(20, 2), futureDate(21, 2));

  await login(page, USERS.renter);
  page.on('dialog', (d) => d.accept());
  await page.goto('/account');
  await bookingRow(page, mine.code).getByRole('button', { name: 'Huỷ đơn' }).click();
  await expect(statusBadge(bookingRow(page, mine.code))).toHaveText('Đã huỷ');
  expect((await (await api(USERS.owner)).patch(`owner/bookings/${mine.id}/status`, { data: { status: 'CONFIRMED' } })).ok()).toBeFalsy();

  await login(page, USERS.owner); // init script sau ghi đè token khách
  await page.goto('/account?tab=owner');
  await bookingRow(page, other.code).getByRole('button', { name: 'Từ chối' }).click();
  await expect(statusBadge(bookingRow(page, other.code))).toHaveText('Đã huỷ');
});
