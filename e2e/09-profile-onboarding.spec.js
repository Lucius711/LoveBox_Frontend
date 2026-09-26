import { test, expect } from '@playwright/test';
import { USERS, api, data, login } from './helpers.js';

// Hồ sơ phong cách (nguồn số đo / ngân sách / gu cho AI) + thông tin liên hệ & STK nhận hoàn cọc (Users.BankAccount)
const row = (page, label) => page.locator('dl > div').filter({ hasText: label }).locator('dd');

test('người mới đăng nhập → onboarding từng bước, chọn size thay cho số đo 3 vòng', async ({ page }) => {
  await login(page, USERS.newbie);
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByText('Câu 1/7')).toBeVisible();

  await page.getByRole('button', { name: 'Kỷ yếu' }).click();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByLabel('Chiều cao (cm)').fill('158');
  await page.getByLabel('Cân nặng (kg)').fill('48');
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await expect(page.getByRole('heading', { name: 'Số đo 3 vòng hoặc size bạn hay mặc' })).toBeVisible();
  await page.getByRole('button', { name: 'M', exact: true }).click();
  while (await page.getByRole('button', { name: 'Tiếp tục' }).isVisible()) await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Hoàn tất' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/account?tab=profile');
  await expect(row(page, 'Size hay mặc')).toHaveText('M');
  await expect(row(page, 'Chiều cao / cân nặng')).toHaveText('158 cm · 48 kg');
  await expect(row(page, 'Dịp thường mặc')).toHaveText('Kỷ yếu');
});

test('sửa hồ sơ phong cách: số đo 3 vòng, size, ngân sách', async ({ page }) => {
  await login(page, USERS.renter);
  await page.goto('/account?tab=profile');
  await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
  await page.getByLabel('Ngực', { exact: true }).fill('86');
  await page.getByLabel('Eo', { exact: true }).fill('66');
  await page.getByLabel('Mông', { exact: true }).fill('92');
  const L = page.getByRole('button', { name: 'L', exact: true });
  await L.click();
  await expect(L).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /≤ 300\.000/ }).click();
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText('Đã cập nhật hồ sơ')).toBeVisible();
  await expect(row(page, 'Size hay mặc')).toHaveText('L');
  await expect(row(page, 'Số đo 3 vòng')).toHaveText('86 - 66 - 92');
  await expect(row(page, 'Ngân sách / ngày')).toContainText('300.000');

  await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
  await L.click(); // bấm lại để bỏ chọn
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(row(page, 'Size hay mặc')).toHaveText('Chưa có');
});

test('thông tin liên hệ & STK nhận hoàn cọc', async ({ page }) => {
  const { banks } = await data(await (await api()).get('products/meta'));
  await login(page, USERS.renter);
  await page.goto('/account?tab=profile');
  await page.getByLabel('Địa chỉ').fill('99 Đường E2E, Q3');
  await page.getByLabel('STK nhận hoàn cọc').fill('9704000011');
  await page.getByLabel('Ngân hàng').selectOption(banks[1] ?? banks[0]);
  await page.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(page.getByText('Đã lưu', { exact: true })).toBeVisible();
  const me = await data(await (await api(USERS.renter)).get('users/me'));
  expect(me).toMatchObject({ address: '99 Đường E2E, Q3', bankAccount: '9704000011', bankName: banks[1] ?? banks[0] });
});

test('API từ chối số đo / size không hợp lệ', async () => {
  const renter = await api(USERS.renter);
  for (const bad of [{ clothingSize: 'XXL' }, { heightCm: 50 }, { weightKg: 500 }, { bust: 10 }])
    expect((await renter.put('users/me/style-profile', { data: bad })).status(), JSON.stringify(bad)).toBe(400);
});
