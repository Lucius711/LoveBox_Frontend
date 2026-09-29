import { test, expect } from '@playwright/test';
import { sql } from './helpers.js';

// System — 3. YÊU CẦU CSDL + "Lưu ý cho team IT": mỗi món BẮT BUỘC có Tags (loại đồ, phong cách, màu, size, vòng eo tối đa, dịp)
const columns = async (table) => (await sql(
  'SELECT column_name FROM information_schema.columns WHERE table_name = $1', [table])).map((r) => r.column_name);

test('Users: Name, Role, Phone, BankAccount, Address, TrustScore', async () => {
  expect(await columns('dtb_users')).toEqual(expect.arrayContaining(['id', 'name', 'role', 'phone', 'bank_account', 'address', 'trust_score']));
  const roles = (await sql('SELECT DISTINCT role FROM dtb_users')).map((r) => r.role);
  for (const r of roles) expect(['RENTER', 'OWNER', 'ADMIN']).toContain(r);
});

test('Products: OwnerID, Name, Description, RetailPrice, RentPricePerDay + size, số đo tối đa, cọc 50-100%', async () => {
  expect(await columns('dtb_products')).toEqual(expect.arrayContaining(['id', 'owner_id', 'name', 'description', 'retail_price',
    'rent_price_per_day', 'category', 'size', 'bust_max', 'waist_max', 'hip_max', 'item_condition', 'deposit_percent']));
  await expect(sql(`UPDATE dtb_products SET deposit_percent = 40 WHERE id = (SELECT id FROM dtb_products LIMIT 1)`)).rejects.toThrow();
});

test('Product_Tags: màu / phong cách / dịp / kiểu dáng liên kết ProductID', async () => {
  expect(await columns('dtb_product_tags')).toEqual(expect.arrayContaining(['product_id', 'tag_type', 'tag_value']));
  const types = (await sql('SELECT DISTINCT tag_type FROM dtb_product_tags')).map((r) => r.tag_type);
  expect(types).toEqual(expect.arrayContaining(['COLOR', 'STYLE', 'OCCASION']));
});

test('mọi món đã duyệt đều đủ Tags cho AI: loại đồ, size, vòng eo, màu, phong cách, dịp', async () => {
  const missing = await sql(`
    SELECT p.name FROM dtb_products p WHERE p.status = 'APPROVED' AND (
      p.category IS NULL OR p.size IS NULL OR p.waist_max IS NULL
      OR NOT EXISTS (SELECT 1 FROM dtb_product_tags t WHERE t.product_id = p.id AND t.tag_type = 'COLOR')
      OR NOT EXISTS (SELECT 1 FROM dtb_product_tags t WHERE t.product_id = p.id AND t.tag_type = 'STYLE')
      OR NOT EXISTS (SELECT 1 FROM dtb_product_tags t WHERE t.product_id = p.id AND t.tag_type = 'OCCASION'))`);
  expect(missing.map((r) => r.name)).toEqual([]);
});

test('Bookings: ProductID, RenterID, StartDate, EndDate, RentAmount, DepositAmount, Status đủ vòng đời', async () => {
  expect(await columns('dtb_bookings')).toEqual(expect.arrayContaining(['id', 'product_id', 'renter_id', 'start_date', 'end_date',
    'rent_amount', 'deposit_amount', 'status']));
  const [{ def }] = await sql(`SELECT pg_get_constraintdef(c.oid) AS def FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid WHERE t.relname = 'dtb_bookings' AND c.contype = 'c' AND pg_get_constraintdef(c.oid) LIKE '%PENDING%CONFIRMED%'`);
  for (const s of ['PENDING', 'CONFIRMED', 'SHIPPING', 'RENTED', 'RETURNED', 'COMPLETED']) expect(def).toContain(s);
});
