import MainLayout from '../layouts/MainLayout'

const sections = [
  {
    title: '1. Điều khoản chung',
    content: 'Chào mừng đến với Love Box! Khi truy cập hoặc sử dụng website và dịch vụ của chúng tôi, bạn đồng ý tuân thủ và bị ràng buộc bởi các điều khoản và điều kiện dưới đây. Những điều khoản này điều chỉnh việc bạn sử dụng website Love Box và việc mua bất kỳ sản phẩm nào từ chúng tôi. Chúng tôi có quyền cập nhật các điều khoản này bất kỳ lúc nào.',
  },
  {
    title: '2. Sản phẩm và giá cả',
    content: (
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>Tất cả sản phẩm của chúng tôi đều được làm thủ công, vì vậy có thể có những khác biệt nhỏ giữa hình ảnh sản phẩm và sản phẩm thực tế bạn nhận được.</li>
        <li>Giá có thể thay đổi mà không cần thông báo trước.</li>
      </ul>
    ),
  },
  {
    title: '3. Đơn hàng và thanh toán',
    content: 'Khi bạn đặt hàng, bạn đồng ý cung cấp thông tin mua hàng và tài khoản đầy đủ, chính xác, và cập nhật. Chúng tôi có quyền từ chối hoặc hủy bất kỳ đơn hàng nào.',
  },
  {
    title: '4. Chính sách hoàn trả',
    content: 'Do tính chất đặt làm riêng và làm thủ công của sản phẩm, chúng tôi thường không chấp nhận hoàn trả. Tuy nhiên, nếu sản phẩm của bạn bị hư hại khi nhận, vui lòng liên hệ với chúng tôi trong vòng 7 ngày kể từ ngày giao hàng để trao đổi về việc đổi hoặc hoàn tiền.',
  },
]

export default function TermsPage() {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Điều khoản dịch vụ</h1>
        <p className="text-sm text-gray-400 mb-8">
          Ngày hiệu lực: 19 tháng 9, 2026 · Cập nhật lần cuối: 19 tháng 9, 2026
        </p>
        <div className="space-y-8">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">{s.title}</h2>
              {typeof s.content === 'string'
                ? <p className="text-gray-600 leading-relaxed">{s.content}</p>
                : s.content}
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
