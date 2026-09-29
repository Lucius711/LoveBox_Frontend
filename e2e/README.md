# E2E (Playwright)

Chạy trên stack thật: Postgres + backend + frontend. Đăng nhập bằng JWT tự ký (bỏ qua Google), dữ liệu test nằm trong các tài khoản `e2e-*@lentique.test` và được reset mỗi lần chạy (`global-setup.js`).

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
| `01-homepage` | Trang chủ: header (logo, menu, tìm kiếm, đăng nhập, giỏ; đăng nhập rồi thì chuông + nhãn vai trò), banner "Tìm đồ cùng AI ngay", Đồ mới lên kệ, Được thuê nhiều nhất, footer |
| `02-catalog` | Danh mục: loại đồ (Áo dài, Đầm dạ hội, Veston, Cosplay…), phong cách, lọc giá / size / màu / tình trạng, sắp xếp, phân trang, tìm kiếm, lazy load ảnh, trang chi tiết |
| `03-ai-stylist` | Trợ lý AI: số đo → size, 3 vòng, ngân sách, bóc từ khoá, match ≥ 80%, 3-5 kết quả, đề xuất màu thay thế, Xem chi tiết / Thêm vào giỏ, lịch sử chat |
| `04-booking-calendar` | Khoá lịch + 1 ngày đệm giặt ủi, lịch làm mờ ngày đã thuê, ngày không hợp lệ |
| `05-checkout` | Giỏ hàng, tiền thuê × ngày + cọc + ship, COD, QR PayOS, tiếp tục thanh toán đơn QR dở |
| `06-rental-lifecycle` | Chờ xác nhận → Đang giao → Đang thuê → Đã trả đồ → Đã hoàn cọc; chủ đồ xử lý đơn + doanh thu; admin tranh chấp, trừ cọc, hoàn cọc, điểm uy tín; đánh giá |
| `07-owner-products` | Đăng ký làm Chủ đồ (gửi đơn → admin duyệt / từ chối kèm lý do); Chủ đồ đăng / sửa / ẩn đồ, bắt buộc 3 ảnh + Tags, admin kiểm duyệt |
| `08-roles-security` | 3 vai trò Khách thuê / Chủ đồ / Admin: quyền API + menu, trang, footer theo vai trò; admin không thuê / đăng đồ |
| `09-profile-onboarding` | Onboarding, hồ sơ phong cách, STK nhận hoàn cọc, hồ sơ admin rút gọn, điểm uy tín |
| `10-mobile` | Responsive trên điện thoại (project `mobile`) |
| `11-notifications` | Chủ đồ nhận thông báo có người thuê; thông báo khi đồ / đơn Chủ đồ được duyệt; chuông trên header |
| `12-database` | Cột bắt buộc của Users / Products / Product_Tags / Bookings, mọi món đã duyệt đủ Tags cho AI |

Các spec chạy tuần tự theo số (dùng chung 1 DB): `11-notifications` dùng kết quả duyệt đơn Chủ đồ của `07`.

`test.fixme` = yêu cầu trong tài liệu mà app **chưa có** (hiện là "skipped" trong báo cáo): mục menu "Cách thức thuê",
form khảo sát nhanh trong khung chat, ô nhập STK ở bước checkout. Test "tiếp tục thanh toán" tự bỏ qua nếu backend chưa cấu hình PayOS.

Không test tự động: khách quét QR trả tiền thật qua PayOS (cần ngân hàng), email thông báo (Resend). Hoàn cọc là admin chuyển khoản thủ công. Upload ảnh R2 được giả lập ở bước PUT.
