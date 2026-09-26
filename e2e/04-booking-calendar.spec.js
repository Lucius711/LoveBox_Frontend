import { test, expect } from '@playwright/test';
import { E2E_PRODUCT, USERS, api, bookCOD, checkoutBody, data, futureDate, login } from './helpers.js';

// System — 2.2 Module Booking & Thuật toán Lịch: thuê 10→12 thì khoá 10→13 (thêm 1 ngày đệm giặt ủi)
test.describe.configure({ mode: 'serial' });

const P = E2E_PRODUCT.id;
const d = (day) => futureDate(day, 1); // tháng sau

test('khách A thuê 10→12 → hệ thống khoá 10→13', async () => {
  await bookCOD(USERS.renter, P, d(10), d(12));
  const blocked = await data(await (await api()).get(`products/${P}/blocked-dates`));
  for (const day of [10, 11, 12, 13]) expect(blocked).toContain(d(day));
  expect(blocked).not.toContain(d(9));
  expect(blocked).not.toContain(d(14));
});

test('khách B không đặt được ngày bị khoá (kể cả ngày đệm), đặt được từ ngày 14', async () => {
  const b = await api(USERS.stylist);
  for (const [s, e] of [[11, 11], [13, 13], [8, 9], [5, 20]]) {
    const res = await b.post('bookings/checkout', { data: checkoutBody(P, d(s), d(e)) });
    expect(res.status(), `${s}→${e} phải bị từ chối vì trùng lịch`).toBe(409);
  }
  const ok = await data(await b.post('bookings/checkout', { data: checkoutBody(P, d(14), d(14)) }));
  expect(ok.bookings[0].status).toBe('PENDING');
  // huỷ ngay để trả lịch cho các test khác
  await data(await b.post(`bookings/${ok.bookings[0].id}/cancel`));
  const blocked = await data(await (await api()).get(`products/${P}/blocked-dates`));
  expect(blocked).not.toContain(d(14));
});

test('ngày thuê không hợp lệ: trong quá khứ, trả trước nhận, quá 30 ngày', async () => {
  const b = await api(USERS.stylist);
  for (const [s, e] of [['2020-01-01', '2020-01-02'], [d(20), d(18)], [futureDate(1, 4), futureDate(5, 5)]]) {
    const res = await b.post('bookings/checkout', { data: checkoutBody(P, s, e) });
    expect(res.status(), `${s}→${e}`).toBe(400);
  }
});

test('lịch trên trang chi tiết làm mờ ngày đã có người thuê và chặn chọn khoảng vướng lịch', async ({ page }) => {
  await login(page, USERS.stylist);
  await page.goto(`/products/${P}`);
  const cal = page.locator('div.select-none').first();
  await cal.getByRole('button', { name: 'Tháng sau' }).click();
  for (const day of [10, 11, 12, 13]) {
    const btn = cal.getByRole('button', { name: String(day), exact: true });
    await expect(btn).toBeDisabled();
    await expect(btn).toHaveAttribute('title', 'Đã có người thuê');
  }
  await expect(cal.getByRole('button', { name: '14', exact: true })).toBeEnabled();
  await expect(cal.getByRole('button', { name: '9', exact: true })).toBeEnabled();

  // Chọn 5 → 20 đi qua ngày bị khoá → báo lỗi, không chọn được
  await cal.getByRole('button', { name: '5', exact: true }).click();
  await cal.getByRole('button', { name: '20', exact: true }).click();
  await expect(page.getByText(/vướng lịch người khác/)).toBeVisible();
  await expect(cal.getByText('Chọn ngày trả đồ')).toBeVisible();

  // Chọn hợp lệ 15 → 17 = 3 ngày
  await cal.getByRole('button', { name: '15', exact: true }).click();
  await cal.getByRole('button', { name: '17', exact: true }).click();
  await expect(page.getByText('3 ngày', { exact: true })).toBeVisible();
});

test('ngày đã qua trên lịch bị khoá', async ({ page }) => {
  test.skip(new Date().getDate() === 1, 'hôm nay là ngày 1, không có ngày đã qua trong tháng');
  await page.goto(`/products/${P}`);
  const cal = page.locator('div.select-none').first();
  await expect(cal.getByRole('button', { name: '1', exact: true })).toBeDisabled();
  await expect(cal.getByRole('button', { name: 'Tháng trước' })).toBeDisabled();
});
