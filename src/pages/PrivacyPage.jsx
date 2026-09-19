import MainLayout from '../layouts/MainLayout'

const sections = [
  {
    title: '1. Điều khoản chung',
    content: 'Tại Love Box, chúng tôi coi trọng quyền riêng tư của bạn và cam kết bảo vệ dữ liệu cá nhân của bạn. Chính sách này nêu rõ cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn. Bằng việc truy cập hoặc sử dụng website của chúng tôi, bạn đồng ý với các điều khoản của Chính sách Bảo mật này.',
  },
  {
    title: '2. Thông tin chúng tôi thu thập',
    content: 'Chúng tôi thu thập những thông tin mà bạn cung cấp trực tiếp cho chúng tôi, chẳng hạn khi bạn tạo tài khoản, đặt hàng, đăng ký nhận bản tin hoặc liên hệ hỗ trợ khách hàng. Thông tin này có thể bao gồm tên, email, số điện thoại, địa chỉ giao hàng và thông tin thanh toán của bạn.',
  },
  {
    title: '3. Cách chúng tôi sử dụng thông tin của bạn',
    content: (
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>Để xử lý và hoàn tất đơn hàng của bạn.</li>
        <li>Để liên lạc với bạn về trạng thái đơn hàng.</li>
        <li>Để gửi email khuyến mãi cho bạn (nếu bạn đã đăng ký).</li>
        <li>Để cải thiện website và dịch vụ khách hàng của chúng tôi.</li>
      </ul>
    ),
  },
  {
    title: '4. Bảo mật dữ liệu',
    content: 'Chúng tôi áp dụng các biện pháp bảo mật hợp lý để bảo vệ thông tin cá nhân của bạn khỏi truy cập, thay đổi hoặc tiết lộ trái phép. Tuy nhiên, không có phương thức truyền dữ liệu nào qua Internet là an toàn tuyệt đối 100%.',
  },
]

export default function PrivacyPage() {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Chính sách bảo mật</h1>
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
