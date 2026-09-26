import PolicyPage from '../components/PolicyPage';

export default function PrivacyPage() {
  return <PolicyPage title="Chính sách bảo mật" sections={[
    ['1. Thông tin thu thập', 'Tên, email và ảnh đại diện từ tài khoản Google; số điện thoại, địa chỉ nhận đồ, số tài khoản nhận hoàn cọc do bạn cung cấp; số đo cơ thể bạn nhập cho trợ lý AI.'],
    ['2. Mục đích sử dụng', 'Giao nhận đồ, hoàn cọc, liên lạc về đơn thuê và gợi ý trang phục phù hợp. Số đo chỉ dùng cho lượt tìm kiếm đó và không được lưu lại.'],
    ['3. Chia sẻ', 'Chủ đồ chỉ thấy tên, số điện thoại và địa chỉ nhận đồ của đơn thuê món đồ của họ. Số tài khoản hoàn cọc chỉ admin xem được.'],
    ['4. Bảo mật', 'Dữ liệu được truyền qua HTTPS và lưu trữ có kiểm soát truy cập. Không có hệ thống nào an toàn tuyệt đối, hãy liên hệ chúng tôi nếu phát hiện bất thường.'],
  ]} />;
}
