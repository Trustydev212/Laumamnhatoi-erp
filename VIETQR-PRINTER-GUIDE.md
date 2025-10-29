# 🧾 VietQR Printer Integration Guide

## 📋 Tổng quan

Hệ thống in hóa đơn VietQR được tích hợp vào ứng dụng ERP để in hóa đơn đẹp với mã QR thanh toán động qua máy Xprinter T80L.

## 🎯 Tính năng chính

- ✅ In hóa đơn với layout chuẩn (logo, bảng món, tổng tiền)
- ✅ Mã QR VietQR động (mỗi hóa đơn 1 mã riêng)
- ✅ QR code quét được trong app ngân hàng
- ✅ Chạy qua USB hoặc LAN
- ✅ Không phụ thuộc Chrome print hay phần mềm thứ 3
- ✅ ESC/POS protocol chuẩn

## 🏗️ Cấu trúc hệ thống

```
Frontend (POS) → Backend API → VietQR API → ESC/POS → Xprinter T80L
```

### Luồng xử lý:
1. Frontend gửi dữ liệu hóa đơn (JSON)
2. Backend tải QR PNG từ VietQR API
3. Convert PNG → ESC/POS bitmap
4. In ra máy Xprinter qua USB/LAN

## 📁 Files đã tạo/cập nhật

### Backend
- `src/services/vietqr-printer.service.ts` - Service xử lý in VietQR
- `src/modules/printer/vietqr-printer.controller.ts` - Controller API
- `src/modules/printer/vietqr-printer.module.ts` - Module
- `src/app.module.ts` - Đã import VietQRPrinterModule

### Frontend
- `src/app/pos/page.tsx` - Đã thêm nút "🧾 In VietQR (QR Bank)"
- `src/app/vietqr-test/page.tsx` - Trang test tích hợp

## 🔧 Cấu hình

### VietQR Config
```typescript
{
  acqId: 970436,           // Vietcombank
  accountNo: "0123456789", // Số tài khoản thực tế
  accountName: "LAU MAM NHA TOI" // Tên tài khoản
}
```

### Printer Config
```typescript
{
  type: 'usb',             // hoặc 'network'
  device: '/dev/usb/lp0',  // Linux USB path (optional)
  ip: '192.168.1.100',     // IP máy in LAN (optional)
  port: 9100               // Port máy in LAN (optional)
}
```

## 🚀 API Endpoints

### In hóa đơn VietQR
```http
POST /api/printer/vietqr/print-bill
Content-Type: application/json

{
  "id": "HD20251029-001",
  "cashier": "Triết",
  "date": "29/10/2025",
  "startTime": "13:30",
  "items": [
    {"name": "Cà phê sữa", "qty": 1, "price": 20000}
  ],
  "total": 20000
}
```

### Test in hóa đơn
```http
GET /api/printer/vietqr/test
```

### Cập nhật cấu hình VietQR
```http
POST /api/printer/vietqr/config/vietqr
Content-Type: application/json

{
  "acqId": 970436,
  "accountNo": "0123456789",
  "accountName": "LAU MAM NHA TOI"
}
```

### Cập nhật cấu hình máy in
```http
POST /api/printer/vietqr/config/printer
Content-Type: application/json

{
  "type": "usb",
  "device": "/dev/usb/lp0"
}
```

### Kiểm tra trạng thái
```http
GET /api/printer/vietqr/status
GET /api/printer/vietqr/config
```

## 🖨️ Layout hóa đơn

```
         LẨU MẮM NHÀ TÔI
        HÓA ĐƠN THANH TOÁN
--------------------------------
Mã HĐ: HD20251029-001
Thu ngân: Triết
Ngày: 29/10/2025  Giờ: 13:30
--------------------------------
STT  Tên món             SL   Thành tiền
1    Cà phê sữa          1     20,000
--------------------------------
Tổng cộng:               20,000 đ
+ Thanh toán qua VietQR
        [QR CODE RÕ NÉT]
699 Phạm Hữu Lầu, Cao Lãnh
Cảm ơn Quý khách!
--------------------------------
```

## 🧪 Testing

### 1. Test qua trang web
Truy cập: `http://localhost:3000/vietqr-test`

### 2. Test qua POS
- Mở POS: `http://localhost:3000/pos`
- Tạo đơn hàng
- Click "🧾 In VietQR (QR Bank)"

### 3. Test API trực tiếp
```bash
# Test in hóa đơn
curl -X POST http://localhost:3001/api/printer/vietqr/print-bill \
  -H "Content-Type: application/json" \
  -d '{
    "id": "HD20251029-001",
    "cashier": "Test",
    "date": "29/10/2025",
    "startTime": "13:30",
    "items": [{"name": "Test", "qty": 1, "price": 10000}],
    "total": 10000
  }'
```

## 🔧 Troubleshooting

### Lỗi kết nối máy in
1. Kiểm tra máy in đã kết nối USB/LAN
2. Kiểm tra driver máy in
3. Thử đổi cấu hình từ USB sang LAN hoặc ngược lại

### Lỗi QR code
1. Kiểm tra kết nối internet
2. Kiểm tra VietQR API có hoạt động
3. Kiểm tra cấu hình ngân hàng

### Lỗi ESC/POS
1. Kiểm tra máy in hỗ trợ ESC/POS
2. Kiểm tra encoding UTF-8
3. Kiểm tra kích thước giấy 80mm

## 📦 Dependencies

### Backend
- `escpos` - ESC/POS protocol
- `escpos-usb` - USB printer support
- `sharp` - Image processing
- `axios` - HTTP client

### Frontend
- Không cần thêm dependency

## 🚀 Deployment

### Production
1. Cập nhật cấu hình VietQR với thông tin thực tế
2. Cấu hình máy in production
3. Test kết nối máy in
4. Deploy backend và frontend

### Docker
```dockerfile
# Backend cần quyền USB
--privileged
# Hoặc mount USB device
-v /dev/bus/usb:/dev/bus/usb
```

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Console logs backend
2. Network tab browser
3. Máy in có hoạt động
4. VietQR API có accessible

---

**Lưu ý:** Đây là hệ thống tích hợp hoàn chỉnh, sẵn sàng sử dụng trong production với cấu hình phù hợp.
