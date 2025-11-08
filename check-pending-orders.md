# 🔍 Kiểm tra tại sao đơn hàng đang ở trạng thái "Đang xử lý"

## Vấn đề

Các đơn hàng hiển thị status "Đang xử lý" (màu vàng) trong bảng "Đơn hàng gần đây".

## Nguyên nhân

Theo code:
- Order mặc định có status = **`PENDING`** khi được tạo
- Frontend hiển thị `PENDING` = **"Đang xử lý"** (màu vàng)
- Order chỉ chuyển sang `COMPLETED` = **"Hoàn thành"** khi user click nút **"Thanh toán"** trong POS

## Cách kiểm tra

### 1. Kiểm tra qua Browser Console

Mở DevTools (F12) và chạy:

```javascript
// Lấy tất cả orders
fetch('http://36.50.27.82:3001/api/pos/orders', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
  }
})
.then(r => r.json())
.then(orders => {
  // Filter orders PENDING
  const pending = orders.filter(o => o.status === 'PENDING');
  console.log('Orders đang xử lý:', pending);
  console.log('Số lượng:', pending.length);
  
  // Chi tiết từng order
  pending.forEach(order => {
    console.log(`- ${order.orderNumber}: Bàn ${order.table?.name}, Tổng: ${order.total}₫, Tạo: ${new Date(order.createdAt).toLocaleString('vi-VN')}`);
  });
});
```

### 2. Kiểm tra qua API

```bash
# Lấy token từ browser localStorage trước
TOKEN="your-token-here"

# Lấy tất cả orders
curl -H "Authorization: Bearer $TOKEN" http://36.50.27.82:3001/api/pos/orders | jq '.[] | select(.status == "PENDING")'

# Hoặc filter trong response
curl -H "Authorization: Bearer $TOKEN" http://36.50.27.82:3001/api/pos/orders | jq '[.[] | select(.status == "PENDING")]'
```

### 3. Kiểm tra trực tiếp trong Database

```bash
# SSH vào VPS
ssh deploy@36.50.27.82

# Kết nối PostgreSQL
psql -U nhatoi_user -d nha_toierp

# Query orders PENDING
SELECT 
  o."orderNumber",
  t.name as table_name,
  o.status,
  o.total,
  o."createdAt",
  u.username as staff
FROM "Order" o
LEFT JOIN "Table" t ON o."tableId" = t.id
LEFT JOIN "User" u ON o."userId" = u.id
WHERE o.status = 'PENDING'
ORDER BY o."createdAt" DESC;
```

### 4. Dùng Prisma Studio (Khuyến nghị)

```bash
cd /home/deploy/Laumamnhatoi-erp/apps/backend
npx prisma studio
```

Mở browser: http://localhost:5555
- Vào bảng `Order`
- Filter: `status = PENDING`
- Xem chi tiết từng order

## Cách xử lý

### Xử lý thủ công trong POS:

1. Mở POS page: http://36.50.27.82:3002/pos
2. Chọn bàn có order đang xử lý (màu đỏ "Có khách")
3. Xem giỏ hàng và order hiện tại
4. Click nút **"Thanh toán"**
5. Chọn phương thức thanh toán:
   - **Tiền mặt**: Thanh toán và in hóa đơn
   - **Chuyển khoản**: Thanh toán, in hóa đơn và QR code
6. Order sẽ chuyển sang status `COMPLETED` = "Hoàn thành"

### Xử lý hàng loạt (nếu cần):

```sql
-- ⚠️ CẨN THẬN: Chỉ chạy nếu chắc chắn muốn đánh dấu tất cả orders là completed
-- UPDATE "Order" 
-- SET status = 'COMPLETED', "isPaid" = true, "paidAt" = NOW()
-- WHERE status = 'PENDING' AND "createdAt" < NOW() - INTERVAL '1 day';
```

## Kiểm tra chi tiết một order cụ thể

```sql
-- Thay ORDER_NUMBER bằng mã đơn cần kiểm tra
SELECT 
  o.*,
  t.name as table_name,
  u.username as staff,
  json_agg(
    json_build_object(
      'menu', m.name,
      'quantity', oi.quantity,
      'price', oi.price
    )
  ) as items
FROM "Order" o
LEFT JOIN "Table" t ON o."tableId" = t.id
LEFT JOIN "User" u ON o."userId" = u.id
LEFT JOIN "OrderItem" oi ON o.id = oi."orderId"
LEFT JOIN "Menu" m ON oi."menuId" = m.id
WHERE o."orderNumber" = '202511080003'
GROUP BY o.id, t.name, u.username;
```

## Tóm tắt

- **PENDING** = "Đang xử lý" = Order mới tạo, chưa thanh toán
- **COMPLETED** = "Hoàn thành" = Order đã thanh toán
- Để chuyển PENDING → COMPLETED: Click "Thanh toán" trong POS
- Đây là hành vi bình thường, không phải bug

