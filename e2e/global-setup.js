import { API, E2E_PRODUCT, USERS, sql } from './helpers.js';

/** Reset dữ liệu của các tài khoản e2e → mỗi lần chạy bắt đầu từ trạng thái giống nhau. */
export default async function globalSetup() {
  const health = await fetch(`${API}/products/meta`).catch(() => null);
  if (!health?.ok) throw new Error(`Backend chưa chạy ở ${API} (đặt E2E_API_URL nếu khác)`);

  // DB phải đã chạy đủ migration của backend (V14 thống kê truy cập)
  const [{ v }] = await sql('SELECT max(version::int) AS v FROM flyway_schema_history WHERE success');
  if (v < 14) throw new Error(`DB trong CONFIG mới ở migration V${v}, cần ≥ V14 → khởi động lại backend (bản mới) trỏ vào đúng DB này`);

  const ids = Object.values(USERS).map((u) => u.id);
  await sql(`DELETE FROM dtb_reviews WHERE user_id = ANY($1)
               OR product_id IN (SELECT id FROM dtb_products WHERE owner_id = ANY($1))`, [ids]);
  await sql(`DELETE FROM dtb_bookings WHERE renter_id = ANY($1)
               OR product_id IN (SELECT id FROM dtb_products WHERE owner_id = ANY($1))`, [ids]);
  await sql('DELETE FROM dtb_products WHERE owner_id = ANY($1)', [ids]); // tags/ảnh xoá theo cascade
  await sql('DELETE FROM dtb_chat_sessions WHERE user_id = ANY($1)', [ids]);
  await sql('DELETE FROM dtb_owner_applications WHERE user_id = ANY($1)', [ids]);
  await sql('DELETE FROM dtb_notifications WHERE user_id = ANY($1)', [ids]);

  for (const u of Object.values(USERS)) {
    await sql(`
      INSERT INTO dtb_users (id, google_sub, email, name, role, phone, address, height_cm, weight_kg, onboarded_at)
      VALUES ($1, $2, $3, $4, $5, '0911111111', '1 Đường Test, Q1', 160, 55, CASE WHEN $6 THEN NOW() END)
      ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email, name = EXCLUDED.name, phone = EXCLUDED.phone,
        address = EXCLUDED.address, bank_account = NULL, bank_name = NULL, trust_score = 100, deleted_at = NULL,
        height_cm = EXCLUDED.height_cm, weight_kg = EXCLUDED.weight_kg, bust = NULL, waist = NULL, hip = NULL,
        clothing_size = NULL, budget_max = NULL, fav_occasions = '', fav_styles = '', fav_colors = '',
        fit_note = NULL, onboarded_at = EXCLUDED.onboarded_at`,
    [u.id, u.sub, u.email, u.name, u.role, u.onboarded]);
  }
  // Người chưa onboarding thì hồ sơ trống hẳn
  await sql('UPDATE dtb_users SET height_cm = NULL, weight_kg = NULL WHERE id = $1', [USERS.newbie.id]);

  await sql(`INSERT INTO dtb_products (id, owner_id, name, description, category, size, bust_max, waist_max, hip_max,
               item_condition, retail_price, rent_price_per_day, deposit_percent, status)
             VALUES ($1, $2, $3, 'Đầm đỏ đô dùng cho kiểm thử tự động E2E.', 'Váy dự tiệc', 'M', 90, 72, 96,
               'Mới 99%', 1000000, 100000, 50, 'APPROVED')`, [E2E_PRODUCT.id, USERS.owner.id, E2E_PRODUCT.name]);
  await sql(`INSERT INTO dtb_product_tags (product_id, tag_type, tag_value)
             VALUES ($1, 'COLOR', 'Đỏ đô'), ($1, 'STYLE', 'Thanh lịch'), ($1, 'OCCASION', 'Kỷ yếu')`, [E2E_PRODUCT.id]);
  await sql(`INSERT INTO dtb_product_images (product_id, sort_order, url)
             VALUES ($1, 0, 'https://picsum.photos/seed/e2e-0/600/800'), ($1, 1, 'https://picsum.photos/seed/e2e-1/600/800'),
                    ($1, 2, 'https://picsum.photos/seed/e2e-2/600/800')`, [E2E_PRODUCT.id]);
}
