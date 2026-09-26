import { test, expect } from '@playwright/test';
import { USERS, api, chatWidget, data, login, openChat, setProfile, sql } from './helpers.js';

// Requirement brief — 3. "CÁCH THỨC THUÊ" - TRỢ LÝ AI ; System — 2.1 Module Tìm kiếm AI
// Chạy được cả khi có GEMINI_API_KEY lẫn khi không (backend rơi về so khớp từ khoá) → chỉ assert điều đúng ở cả 2 trường hợp.
test.describe.configure({ mode: 'serial' });

const SIZES = ['S', 'M', 'L', 'XL'];
const U = USERS.stylist;
const ask = async (ctx, prompt, chatId) => data(await ctx.post('stylist/search', { data: { prompt, chatId } }));
const result = async (ctx, prompt) => (await ask(ctx, prompt)).result;

/** Bất biến của mọi kết quả gợi ý: 3-5 món, món "khớp" ≥ 80%, đúng size, đúng ngân sách, khớp nhiều xếp trước. */
function checkInvariants(r, { size, maxPrice } = {}) {
  expect(r.results.length).toBeLessThanOrEqual(5);
  for (const m of r.results) {
    if (!m.alternative) expect(m.matchRate, m.product.name).toBeGreaterThanOrEqual(80);
    if (maxPrice) expect(m.product.rentPricePerDay, m.product.name).toBeLessThanOrEqual(maxPrice);
    if (size) expect([0, 1], `${m.product.name} size ${m.product.size}`).toContain(SIZES.indexOf(m.product.size) - SIZES.indexOf(size));
  }
  const exact = r.results.filter((m) => !m.alternative).map((m) => m.matchRate);
  expect(exact).toEqual([...exact].sort((a, b) => b - a));
}

test.describe('Bước 1 — nhập liệu: số đo → size, ngân sách', () => {
  test('chiều cao / cân nặng tự quy đổi ra size', async () => {
    let ctx = await setProfile(U, { heightCm: 160, weightKg: 45 });
    expect((await result(ctx, 'Váy dự tiệc')).size).toBe('S');
    ctx = await setProfile(U, { heightCm: 160, weightKg: 50 });
    expect((await result(ctx, 'Váy dự tiệc')).size).toBe('M');
    ctx = await setProfile(U, { heightCm: 160, weightKg: 55 });
    const r = await result(ctx, 'Váy dự tiệc');
    expect(r.size).toBe('L');
    checkInvariants(r, { size: 'L' });
    ctx = await setProfile(U, { heightCm: 170, weightKg: 50 });
    expect((await result(ctx, 'Váy dự tiệc')).size).toBe('L'); // người cao → lên 1 size
  });

  test('số đo gõ trong câu chat được dùng khi hồ sơ trống', async () => {
    const ctx = await setProfile(U, {});
    expect((await result(ctx, 'Váy dự tiệc cho mình, 1m60 50kg')).size).toBe('M');
  });

  test('size khách tự khai được ưu tiên', async () => {
    const ctx = await setProfile(U, { heightCm: 160, weightKg: 70, clothingSize: 'S' });
    const r = await result(ctx, 'Váy dự tiệc');
    expect(r.size).toBe('S');
    checkInvariants(r, { size: 'S' });
  });

  test('số đo 3 vòng loại trừ đồ không vừa', async () => {
    const ctx = await setProfile(U, { heightCm: 160, weightKg: 55, bust: 92, waist: 74, hip: 98 });
    const r = await result(ctx, 'đồ đi tiệc');
    const guest = await api();
    for (const m of r.results) {
      const p = await data(await guest.get(`products/${m.product.id}`));
      expect(p.bustMax, p.name).toBeGreaterThanOrEqual(92);
      expect(p.waistMax, p.name).toBeGreaterThanOrEqual(74);
      expect(p.hipMax, p.name).toBeGreaterThanOrEqual(98);
    }
  });

  test('ngân sách: lấy từ hồ sơ, giá trong câu chat thắng; quá thấp thì báo không có đồ', async () => {
    let ctx = await setProfile(U, { heightCm: 160, weightKg: 55, budgetMax: 150000 });
    const r1 = await result(ctx, 'đồ đi tiệc thanh lịch');
    expect(r1.criteria.maxPrice).toBe(150000);
    checkInvariants(r1, { maxPrice: 150000 });
    const r2 = await result(ctx, 'đồ đi tiệc thanh lịch dưới 100k');
    expect(r2.criteria.maxPrice).toBe(100000);
    checkInvariants(r2, { maxPrice: 100000 });

    ctx = await setProfile(U, { heightCm: 160, weightKg: 55, budgetMax: 10000 });
    const r3 = await result(ctx, 'đầm dạ hội');
    expect(r3.results).toHaveLength(0);
    expect(r3.message).toContain('Hiện chưa có bộ nào vừa số đo và ngân sách');
  });

  test('hồ sơ thiếu → bot hỏi lại; khai size thì không hỏi chiều cao / cân nặng', async () => {
    let r = await result(await setProfile(U, {}), 'Váy dự tiệc');
    expect(r.missing).toEqual(['chiều cao', 'cân nặng', 'ngân sách thuê mỗi ngày']);
    expect(r.message).toContain('Để chọn vừa người hơn');
    r = await result(await setProfile(U, { clothingSize: 'L' }), 'Váy dự tiệc');
    expect(r.missing).toEqual(['ngân sách thuê mỗi ngày']);
    r = await result(await setProfile(U, { clothingSize: 'L', budgetMax: 300000 }), 'Váy dự tiệc');
    expect(r.missing).toEqual([]);
  });

  test.fixme('form khảo sát nhanh ngay trong khung chat (dropdown dịp + chiều cao/cân nặng)', async ({ page }) => {
    // System 2.1: "Khách hàng sẽ điền 1 Form khảo sát nhanh ngay trong khung chat: Dropdown chọn dịp, Input chiều cao (cm), cân nặng (kg)"
    // App hiện lấy các thông tin này từ Hồ sơ phong cách (onboarding), trong khung chat chỉ có ô chat tự do.
    await login(page, U);
    await page.goto('/');
    const w = await openChat(page);
    await expect(w.getByRole('combobox', { name: /Dịp/ })).toBeVisible();
    await expect(w.getByLabel(/Chiều cao/)).toBeVisible();
    await expect(w.getByLabel(/Cân nặng/)).toBeVisible();
  });
});

test.describe('Bước 2 — AI bóc tách từ khoá & so khớp Tags', () => {
  test('câu mẫu trong tài liệu: đỏ đô, trễ vai, che bắp tay, dưới 300k', async () => {
    const ctx = await setProfile(U, { clothingSize: 'M' });
    const r = await result(ctx, 'Mình muốn tìm đầm màu đỏ đô, trễ vai, che được bắp tay to, giá thuê dưới 300k');
    expect(r.criteria.colors).toContain('Đỏ đô');
    expect(r.criteria.features).toEqual(expect.arrayContaining(['Trễ vai', 'Che bắp tay']));
    expect(r.criteria.maxPrice).toBe(300000);
    checkInvariants(r, { size: 'M', maxPrice: 300000 });
  });

  test('nhận diện loại đồ, phong cách, dịp', async () => {
    const ctx = await setProfile(U, { clothingSize: 'M' });
    const r = await result(ctx, 'Đầm dạ hội thanh lịch, kín đáo, đi đám cưới');
    expect(r.criteria.categories).toContain('Đầm dạ hội');
    expect(r.criteria.styles).toEqual(expect.arrayContaining(['Thanh lịch', 'Kín đáo']));
    expect(r.criteria.occasions).toContain('Đám cưới');
  });

  test('chỉ trả đồ khớp ≥ 80% (đúng loại đồ đã hỏi)', async () => {
    const ctx = await setProfile(U, { clothingSize: 'M', budgetMax: 500000 });
    const r = await result(ctx, 'Áo dài');
    const exact = r.results.filter((m) => !m.alternative);
    expect(exact.length).toBeGreaterThan(0);
    for (const m of exact) expect(m.product.category).toBe('Áo dài');
    checkInvariants(r, { size: 'M', maxPrice: 500000 });
  });
});

test.describe('Bước 3 — kết quả & xử lý ngoại lệ', () => {
  test('hết màu khách muốn → tự đề xuất màu gần nhất', async () => {
    // Kho không có đồ "Xanh lá" nhưng có "Xanh mint" (cùng họ màu)
    const ctx = await setProfile(U, { clothingSize: 'M' });
    const r = await result(ctx, 'Váy màu xanh lá');
    expect(r.criteria.colors).toContain('Xanh lá');
    expect(r.message).toContain('đang hết');
    expect(r.results.length).toBeGreaterThan(0);
    for (const m of r.results) {
      expect(m.alternative).toBe(true);
      expect(m.product.colors).not.toContain('Xanh lá');
    }
    expect(r.results.some((m) => m.product.colors.includes('Xanh mint'))).toBe(true);
  });

  test('gợi ý "cho bạn" ở trang chủ theo hồ sơ', async ({ page }) => {
    const ctx = await setProfile(U, { heightCm: 160, weightKg: 55, clothingSize: 'M', budgetMax: 200000, favStyles: ['Thanh lịch'] });
    const list = await data(await ctx.get('stylist/for-you'));
    expect(list.length).toBeGreaterThan(0);
    checkInvariants({ results: list }, { size: 'M', maxPrice: 200000 });
    await login(page, U);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Gợi ý cho bạn' })).toBeVisible();
  });

  test('khung chat: gợi ý mẫu, chip hồ sơ, kết quả, tinh chỉnh, chat mới', async ({ page }) => {
    await setProfile(U, { heightCm: 160, weightKg: 55, clothingSize: 'M', budgetMax: 500000 });
    await login(page, U);
    await page.goto('/');
    const w = await openChat(page);
    for (const chip of ['160cm', '55kg', 'Size M']) await expect(w.getByText(chip, { exact: true })).toBeVisible();

    const suggestion = 'Set công sở kín đáo để thuyết trình';
    await w.getByRole('button', { name: suggestion }).click();
    await expect(w.locator('div.ml-auto', { hasText: suggestion })).toBeVisible();
    await expect(w.getByText('Size gợi ý: M')).toBeVisible();
    await expect(w.getByText(/AI hiểu là:|Từ khoá:/)).toBeVisible();

    await expect(w.getByLabel('Tin nhắn')).toHaveAttribute('placeholder', /Muốn đổi gì\?/);
    await w.getByLabel('Tin nhắn').fill('màu đen thôi');
    await w.getByRole('button', { name: 'Gửi' }).click();
    await expect(w.getByText('Size gợi ý: M')).toHaveCount(2);

    await w.getByRole('button', { name: 'Chat mới' }).click();
    await expect(w.getByText('Size gợi ý: M')).toHaveCount(0);
    await expect(w.getByRole('button', { name: suggestion })).toBeVisible();
  });

  test('mỗi kết quả có "Xem chi tiết" và "Thêm vào giỏ"', async ({ page }) => {
    await setProfile(U, { clothingSize: 'M', budgetMax: 500000 });
    await login(page, U);
    await page.goto('/');
    const w = await openChat(page);
    await w.getByLabel('Tin nhắn').fill('Váy dự tiệc');
    await w.getByRole('button', { name: 'Gửi' }).click();

    const cards = w.locator('div.card').filter({ has: page.getByRole('button', { name: 'Thêm vào giỏ' }) });
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeLessThanOrEqual(5);
    await expect(cards.first().getByText(/Khớp \d+%|Gợi ý thay thế/)).toBeVisible();
    await cards.first().getByRole('button', { name: 'Thêm vào giỏ' }).click();
    await expect(page.getByRole('link', { name: 'Giỏ hàng' })).toContainText('1');
    await cards.first().getByRole('link', { name: 'Xem chi tiết' }).click();
    await expect(page).toHaveURL(/\/products\/[0-9a-f-]{36}$/);
    await expect(chatWidget(page).locator('div.ml-auto', { hasText: 'Váy dự tiệc' })).toBeVisible(); // không mất hội thoại
  });

  test('hồ sơ thiếu: banner trang chủ + link cập nhật trong chat', async ({ page }) => {
    await setProfile(U, {});
    await login(page, U);
    await page.goto('/');
    await expect(page.getByText('Hồ sơ của bạn còn thiếu chiều cao, cân nặng, ngân sách.')).toBeVisible();
    const w = await openChat(page);
    await expect(w.getByText('chưa có số đo')).toBeVisible();
    await w.getByLabel('Tin nhắn').fill('Váy dự tiệc');
    await w.getByRole('button', { name: 'Gửi' }).click();
    await w.getByRole('link', { name: 'Cập nhật hồ sơ' }).click();
    await expect(page).toHaveURL(/tab=profile/);
  });

  test('khách chưa đăng nhập được mời đăng nhập; widget ẩn ở trang đăng nhập', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('main').getByRole('button', { name: 'Tìm đồ cùng AI' }).click();
    await expect(chatWidget(page).getByText('Đăng nhập để dùng trợ lý AI')).toBeVisible();
    await chatWidget(page).getByRole('link', { name: 'Đăng nhập để bắt đầu' }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Mở trợ lý AI' })).toHaveCount(0);
  });
});

test.describe('Lịch sử chat', () => {
  const PROMPT = 'Áo dài trắng dự lễ kỷ yếu, dáng thanh lịch';

  test('lưu lịch sử, xem lại, lưu trữ / khôi phục', async ({ page }) => {
    await setProfile(U, { clothingSize: 'M' });
    await login(page, U);
    await page.goto('/');
    const w = await openChat(page);
    await w.getByLabel('Tin nhắn').fill(PROMPT);
    await w.getByRole('button', { name: 'Gửi' }).click();
    await expect(w.getByText(/Size gợi ý:/)).toBeVisible();

    await w.getByRole('button', { name: 'Lịch sử', exact: true }).click();
    const item = w.locator('li').filter({ hasText: PROMPT });
    await item.getByRole('button', { name: 'Lưu trữ' }).click();
    await expect(item).toHaveCount(0);
    await w.getByRole('button', { name: 'Đã lưu trữ', exact: true }).click();
    await item.getByRole('button', { name: 'Khôi phục' }).click();
    await w.getByRole('button', { name: 'Gần đây' }).click();

    await item.getByRole('button', { name: PROMPT }).click(); // mở lại → về tab Chat
    await expect(w.locator('div.ml-auto', { hasText: PROMPT })).toBeVisible();
    await expect(w.getByText(/Size gợi ý:/)).toBeVisible();
  });

  test('phân trang 10 cuộc / trang', async ({ page }) => {
    await sql('DELETE FROM dtb_chat_sessions WHERE user_id = $1', [U.id]);
    for (let i = 1; i <= 12; i++)
      await sql(`INSERT INTO dtb_chat_sessions (user_id, title, updated_at) VALUES ($1, $2, NOW() - make_interval(hours => $3))`,
        [U.id, `E2E cũ ${String(i).padStart(2, '0')}`, i]);
    await login(page, U);
    await page.goto('/');
    const w = await openChat(page);
    await w.getByRole('button', { name: 'Lịch sử', exact: true }).click();
    await expect(w.getByText('Trang 1/2')).toBeVisible();
    await expect(w.locator('ul > li')).toHaveCount(10);
    await w.getByRole('button', { name: 'Trang sau' }).click();
    await expect(w.getByText('E2E cũ 12')).toBeVisible();
    await expect(w.getByRole('button', { name: 'Trang sau' })).toBeDisabled();
  });

  test('API: nói tiếp cùng cuộc, tiêu đề cắt gọn, người khác không xem / sửa được', async () => {
    const ctx = await setProfile(U, { clothingSize: 'M' });
    const first = await ask(ctx, 'Set công sở kín đáo để thuyết trình');
    const second = await ask(ctx, 'màu đen thôi', first.chatId);
    expect(second.chatId).toBe(first.chatId);
    const detail = await data(await ctx.get(`stylist/chats/${first.chatId}`));
    expect(detail.messages.map((m) => m.from)).toEqual(['user', 'bot', 'user', 'bot']);

    const long = await ask(ctx, `Mình cần một bộ váy dự tiệc ${'thật thanh lịch '.repeat(10)}`.trim());
    const t = (await data(await ctx.get(`stylist/chats/${long.chatId}`))).title;
    expect(t).toHaveLength(120);
    expect(t.endsWith('...')).toBe(true);

    const other = await api(USERS.owner);
    expect((await other.get(`stylist/chats/${first.chatId}`)).status()).toBe(404);
    expect((await other.patch(`stylist/chats/${first.chatId}`, { data: { archived: true } })).status()).toBe(404);
    expect((await ctx.post('stylist/search', { data: { prompt: '   ' } })).status()).toBe(400);
    expect((await ctx.post('stylist/search', { data: { prompt: 'a'.repeat(1001) } })).status()).toBe(400);
  });
});
