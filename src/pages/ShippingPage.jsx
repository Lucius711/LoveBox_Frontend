import MainLayout from '../layouts/MainLayout'

const sections = [
  {
    title: '1. Điều khoản giao hàng chung',
    content: 'Chúng tôi giao hàng cho các sản phẩm thủ công của mình trên toàn thế giới. Dưới đây là mọi thông tin bạn cần biết về quy trình giao và nhận hàng của chúng tôi.',
  },
  {
    title: '2. Thời gian xử lý',
    content: 'Vì mỗi sản phẩm đều được làm thủ công theo đơn đặt hàng, vui lòng cho phép 5–10 ngày làm việc để sản phẩm của bạn được hoàn thiện trước khi giao đi.',
  },
  {
    title: '3. Phí và thời gian giao hàng',
    content: (
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li><strong>Trong nước (Việt Nam):</strong> 2–4 ngày làm việc. Áp dụng phí giao hàng tiêu chuẩn.</li>
        <li><strong>Quốc tế:</strong> 7–15 ngày làm việc tùy theo quốc gia nhận hàng. Phí giao hàng sẽ được tính tại bước thanh toán.</li>
      </ul>
    ),
  },
  {
    title: '4. Theo dõi đơn hàng',
    content: 'Sau khi đơn hàng được giao, bạn sẽ nhận được email xác nhận kèm thông tin theo dõi để có thể cập nhật hành trình của kiện hàng.',
  },
]

export default function ShippingPage() {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Thông tin giao hàng</h1>
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
