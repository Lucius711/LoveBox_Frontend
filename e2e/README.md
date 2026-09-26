# E2E (Playwright)

Chạy trên stack thật: Postgres + backend + frontend. Đăng nhập bằng JWT tự ký (bỏ qua Google), dữ liệu test nằm trong các tài khoản `e2e-*@lovebox.test` và được reset mỗi lần chạy (`global-setup.js`).

```bash
npm i && npx playwright install chromium   # lần đầu
# bật backend (mvn spring-boot:run) — FE tự bật bằng `npm run dev` nếu chưa chạy
npm run test:e2e              # chạy hết
npm run test:e2e -- --ui      # xem từng bước
npm run test:e2e -- --project=mobile   # chỉ test điện thoại (Pixel 7)
```

Cấu hình (API, `JWT_SECRET`, DB) khai báo ở đầu `e2e/helpers.js` → `CONFIG`. Muốn đổi tạm mà không sửa code: đặt biến `E2E_<TÊN>` (vd `E2E_DB_PASSWORD`, `E2E_API_URL`). URL frontend: `E2E_BASE_URL` (mặc định `http://localhost:5173`, đặt thì không tự bật vite).

## Bộ test theo tài liệu yêu cầu

| File | Yêu cầu |
|---|---|
| `01-homepage` | Trang chủ: header, banner "Tìm đồ cùng AI ngay", Đồ mới lên kệ, Được thuê nhiều nhất, footer |
| `02-catalog` | Danh mục: loại đồ, phong cách, lọc giá / size / màu / tình trạng, sắp xếp, phân trang, tìm kiếm, lazy load ảnh |
| `03-ai-stylist` | Trợ lý AI: số đo → size, ngân sách, bóc từ khoá, match ≥ 80%, đề xuất màu thay thế, khung chat, lịch sử chat |
| `04-booking-calendar` | Khoá lịch + 1 ngày đệm giặt ủi, lịch làm mờ ngày đã thuê |
| `05-checkout` | Giỏ hàng, công thức tiền thuê × ngày + cọc + ship, COD, QR PayOS |
| `06-rental-lifecycle` | Trạng thái đơn, chủ đồ xử lý đơn, admin tranh chấp, hoàn cọc thủ công, điểm uy tín, đánh giá |
| `07-owner-products` | Đăng / sửa / ẩn đồ, bắt buộc 3 ảnh + nhãn, admin duyệt / từ chối |
| `08-roles-security` | Phân quyền Renter / Owner / Admin |
| `09-profile-onboarding` | Onboarding, hồ sơ phong cách, STK nhận hoàn cọc |
| `10-mobile` | Responsive trên điện thoại (project `mobile`) |

`test.fixme` = yêu cầu trong tài liệu mà app **chưa có** (hiện là "skipped" trong báo cáo): mục menu "Cách thức thuê",
form khảo sát nhanh trong khung chat, ô nhập STK ở bước checkout.

Không test tự động: khách quét QR trả tiền thật qua PayOS (cần ngân hàng), email thông báo (Resend). Hoàn cọc đã chuyển sang admin chuyển khoản thủ công. Upload ảnh R2 được giả lập ở bước PUT.
