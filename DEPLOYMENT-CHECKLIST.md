# ✅ CHECKLIST TRIỂN KHAI LÊN VPS

## 📋 Tổng quan

Kiểm tra toàn bộ hệ thống trước khi deploy lên VPS.

## 🔨 BUILD & COMPILATION

### ✅ Backend Build
- [x] `npm run build` trong `apps/backend` - **THÀNH CÔNG**
- [x] File output: `apps/backend/dist/src/main.js` - **TỒN TẠI**
- [x] Tất cả modules đã được compile:
  - [x] Print module (hệ thống in hóa đơn mới)
  - [x] POS module
  - [x] Admin module
  - [x] Auth module
  - [x] Các module khác

### ✅ Frontend Build
- [x] `npm run build` trong `apps/frontend` - **THÀNH CÔNG**
- [x] Next.js build output: `.next/` - **TỒN TẠI**
- [x] Tất cả pages đã được build:
  - [x] POS page
  - [x] Admin page
  - [x] Print test page
  - [x] Các pages khác

### ✅ Dependencies
- [x] `escpos` và `escpos-usb` - **CÓ SẴN**
- [x] `axios` - **CÓ SẴN**
- [x] `sharp` - **CÓ SẴN**
- [x] Tất cả dependencies cần thiết - **ĐẦY ĐỦ**

## 📝 CẤU HÌNH FILE

### ✅ Environment Variables

#### Backend (`apps/backend/env.production`)
- [x] `API_PORT=3001` - **ĐÚNG**
- [x] `DATABASE_URL` - **CẤU HÌNH ĐÚNG**
- [x] `CORS_ORIGIN` - **CÓ DOMAIN**
- [x] `SOCKET_URL` - **CẤU HÌNH ĐÚNG**
- [x] `JWT_SECRET` - **CÓ SẴN**

#### Frontend (`apps/frontend/env.production`)
- [x] `PORT=3002` - **ĐÚNG**
- [x] `NEXT_PUBLIC_API_URL=/api` - **ĐÚNG (qua Nginx proxy)**
- [x] `NEXT_PUBLIC_WS_URL` - **ĐÚNG (WebSocket)**

### ✅ PM2 Configuration (`ecosystem.config.js`)
- [x] Backend script path: `apps/backend/dist/src/main.js` - **ĐÃ SỬA**
- [x] Frontend script: `npm run start` - **ĐÚNG**
- [x] Working directory: `/home/deploy/Laumamnhatoi-erp` - **ĐÚNG**
- [x] Log paths: `/home/deploy/.pm2/logs/` - **ĐÚNG**
- [x] Memory limit: 1G - **HỢP LÝ**

### ✅ Nginx Configuration (`nginx-production.conf`)
- [x] Server name: `laumamnhatoi.vn` - **ĐÚNG**
- [x] API proxy: `/api/` → `127.0.0.1:3001` - **ĐÚNG**
- [x] WebSocket: `/socket.io/` → `127.0.0.1:3001` - **ĐÚNG**
- [x] Frontend proxy: `/` → `127.0.0.1:3002` - **ĐÚNG**
- [x] Gzip compression - **BẬT**
- [x] Security headers - **CÓ SẴN**

### ✅ Deployment Script (`deploy.sh`)
- [x] Check backend build path: `dist/src/main.js` - **ĐÃ SỬA**
- [x] Git pull - **CÓ**
- [x] Clean old builds - **CÓ**
- [x] Build backend & frontend - **CÓ**
- [x] PM2 restart - **CÓ**
- [x] Health check - **CÓ**

## 🐛 LINTER & TYPESCRIPT ERRORS

- [x] Backend TypeScript - **KHÔNG CÓ LỖI**
- [x] Frontend TypeScript - **KHÔNG CÓ LỖI**
- [x] ESLint - **KHÔNG CÓ LỖI**

## 🆕 TÍNH NĂNG MỚI (Hệ thống in hóa đơn)

### ✅ Backend
- [x] Print Service - **HOÀN THÀNH**
- [x] Print Controller với 2 endpoints:
  - [x] `/api/print/print-bill` - In hóa đơn
  - [x] `/api/print/print-qr` - In QR thanh toán
  - [x] `/api/print/calculate-tax` - Tính thuế cho frontend
- [x] Tích hợp TaxConfigService - **HOÀN THÀNH**
- [x] Hỗ trợ USB và LAN printing - **CÓ**

### ✅ Frontend
- [x] Nút "In máy Xprinter" (ESC/POS) - **CÓ**
- [x] Nút "In qua máy tính" (Browser print) - **CÓ**
- [x] Nút "In QR thanh toán" - **CÓ**
- [x] Tự động tính thuế khi mở hóa đơn - **CÓ**
- [x] Hiển thị thuế đầy đủ (VAT, Phí phục vụ) - **CÓ**
- [x] CSS print styles - **CÓ**

## 🔧 CẦN KIỂM TRA TRÊN VPS

### Trước khi deploy:
1. [ ] **Database**: PostgreSQL đã được tạo và cấu hình
2. [ ] **Prisma**: Chạy `npm run db:generate` và `npm run db:push`
3. [ ] **User deploy**: User `deploy` đã tồn tại và có quyền
4. [ ] **Git**: Repository đã clone về `/home/deploy/Laumamnhatoi-erp`
5. [ ] **Node.js**: Version >= 18.0.0 đã cài đặt
6. [ ] **PM2**: Đã cài đặt và cấu hình
7. [ ] **Nginx**: Đã cài đặt và cấu hình
8. [ ] **Ports**: Port 3001, 3002 đã mở
9. [ ] **SSL**: Chuẩn bị cấu hình SSL (nếu cần)

### Sau khi deploy:
1. [ ] **Health check**: `/health` endpoint hoạt động
2. [ ] **API test**: `/api/health` trả về OK
3. [ ] **Frontend**: Website load được
4. [ ] **WebSocket**: Socket.io kết nối được
5. [ ] **Login**: Đăng nhập hoạt động
6. [ ] **POS**: Tạo đơn hàng được
7. [ ] **Print**: Test in hóa đơn (nếu có máy in)
8. [ ] **Tax**: Cấu hình thuế trong admin hoạt động
9. [ ] **PM2 logs**: Kiểm tra logs không có lỗi
10. [ ] **PM2 status**: Tất cả services đang chạy

## 📦 DEPENDENCIES CẦN CÀI TRÊN VPS

```bash
# System dependencies cho escpos-usb (nếu in qua USB)
sudo apt-get update
sudo apt-get install -y libusb-1.0-0-dev

# Nếu không có, máy in LAN vẫn hoạt động bình thường
```

## 🚀 LỆNH DEPLOY

### Option 1: Dùng deploy.sh (Khuyến nghị)
```bash
cd /home/deploy/Laumamnhatoi-erp
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Deploy thủ công
```bash
cd /home/deploy/Laumamnhatoi-erp
git pull origin main

# Build backend
cd apps/backend
npm install
npm run build

# Build frontend
cd ../frontend
npm install
npm run build

# Restart PM2
cd /home/deploy/Laumamnhatoi-erp
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

## ⚠️ LƯU Ý QUAN TRỌNG

### ✅ Đã sửa:
1. ✅ `ecosystem.config.js`: Path backend từ `dist/main.js` → `dist/src/main.js`
2. ✅ `deploy.sh`: Check path từ `dist/main.js` → `dist/src/main.js`

### ⚠️ Cần lưu ý:
1. **Database**: Phải chạy Prisma generate và push trước khi start
2. **Máy in USB**: Cần cài `libusb-1.0-0-dev` trên Linux
3. **Tax config**: File `tax-config.json` sẽ được tạo tự động khi cấu hình thuế
4. **Ports**: Đảm bảo firewall cho phép port 3001, 3002, 80, 443
5. **Domain**: DNS đã trỏ về IP VPS chưa

## 📊 SUMMARY

### ✅ ĐÃ HOÀN THÀNH:
- ✅ Build backend thành công
- ✅ Build frontend thành công
- ✅ Không có lỗi linter/typescript
- ✅ Dependencies đầy đủ
- ✅ Cấu hình files đã sửa đúng
- ✅ Hệ thống in hóa đơn mới hoàn chỉnh
- ✅ Tích hợp tính thuế từ admin

### ⚠️ CẦN KIỂM TRA TRÊN VPS:
- ⚠️ Database setup
- ⚠️ Prisma migrations
- ⚠️ System dependencies (libusb-1.0-0-dev)
- ⚠️ Network configuration
- ⚠️ SSL certificate (nếu cần)

## 🎯 SẴN SÀNG DEPLOY

**Tất cả đã sẵn sàng! Có thể deploy lên VPS.**

---

**Ngày kiểm tra**: 29/10/2025
**Trạng thái**: ✅ Sẵn sàng deploy

