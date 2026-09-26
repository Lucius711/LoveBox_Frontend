import PolicyPage from '../components/PolicyPage';
import { EXPRESS_FEE } from '../constants';
import { formatCurrency } from '../utils/format';

export default function ShippingPage() {
  return <PolicyPage title="Giao nhận & trả đồ" sections={[
    ['1. Hình thức nhận đồ', `Tự đến lấy (miễn phí) hoặc Ship hoả tốc (${formatCurrency(EXPRESS_FEE)}/đơn, giao trước ngày nhận đồ).`],
    ['2. Trạng thái đơn', 'Chờ xác nhận → Đang giao → Đang thuê → Đã trả đồ → Đã hoàn cọc. Bạn theo dõi trong mục Tài khoản › Đơn thuê.'],
    ['3. Trả đồ', 'Trả đồ đúng ngày trả đã chọn. Không cần giặt — chúng tôi giặt ủi chuyên nghiệp giữa các lượt thuê.'],
    ['4. Kiểm định & hoàn cọc', 'Sau khi nhận lại đồ, đội kiểm định kiểm tra tình trạng. Không hư hỏng → cọc được hoàn về số tài khoản bạn đã đăng ký.'],
  ]} />;
}
