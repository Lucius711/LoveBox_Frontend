import PolicyPage from '../components/PolicyPage';

export default function TermsPage() {
  return <PolicyPage title="Điều khoản thuê & cọc" sections={[
    ['1. Tính tiền', 'Thành tiền = Giá thuê/ngày × Số ngày thuê (tính cả ngày nhận và ngày trả) + Tiền cọc bảo đảm + Phí vận chuyển (nếu có).'],
    ['2. Tiền cọc', 'Tiền cọc bằng 50% – 100% giá niêm yết của món đồ do chủ đồ quy định. Lentique giữ cọc trong suốt thời gian thuê và hoàn lại vào tài khoản bạn đăng ký sau khi đồ được trả và kiểm tra không rách, hỏng.'],
    ['3. Hư hỏng & tranh chấp', 'Nếu đồ bị hư hỏng, mất hoặc trả trễ, Lentique có quyền trừ một phần hoặc toàn bộ cọc tương ứng thiệt hại và trừ điểm uy tín của tài khoản. Hai bên có thể khiếu nại, admin là bên phân xử cuối cùng.'],
    ['4. Lịch thuê', 'Sau mỗi lượt thuê, món đồ được khoá thêm 1 ngày để giặt ủi và vận chuyển. Những ngày này không thể đặt.'],
    ['5. Huỷ đơn', 'Bạn có thể huỷ đơn khi đơn còn ở trạng thái Chờ xác nhận. Nếu đã thanh toán, tiền sẽ được hoàn lại toàn bộ.'],
    ['6. Chủ đồ', 'Chủ đồ cam kết đồ đăng lên là hàng thật, đúng mô tả và số đo. Admin có quyền từ chối hoặc ẩn món đồ không đạt chất lượng.'],
  ]} />;
}
