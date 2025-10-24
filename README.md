# Nhà Tôi ERP - Hệ thống quản lý quán ăn

Hệ thống quản lý quán ăn toàn diện với kiến trúc modular, API-first và realtime.

## 🏗️ Kiến trúc

### Backend (NestJS + PostgreSQL)
- **Modular Architecture**: Chia nhỏ thành các module độc lập
- **API-first**: RESTful API với Swagger documentation
- **Realtime**: WebSocket với Socket.IO
- **Authentication**: JWT với refresh token
- **Database**: PostgreSQL với Prisma ORM
- **Audit Log**: Theo dõi mọi thay đổi dữ liệu
- **Backup**: Tự động backup hàng ngày

### Frontend (Next.js + TailwindCSS)
- **PWA**: Progressive Web App, hoạt động offline
- **Responsive**: Tối ưu cho PC, tablet, mobile
- **Realtime**: Kết nối WebSocket realtime
- **State Management**: React Query + Context API

## 📦 Modules

### 1. POS (Point of Sale)
- Quản lý bàn
- Tạo và quản lý đơn hàng
- Menu và danh mục
- Gộp/tách bàn, chia bill
- Khuyến mãi theo giờ

### 2. Inventory (Kho)
- Quản lý nguyên liệu
- Tự động trừ kho theo định mức
- Cảnh báo hết hạn
- Nhà cung cấp
- Xuất nhập kho

### 3. Customer (CRM)
- Quản lý khách hàng
- Tích điểm và phân hạng
- Remarketing qua Zalo/SMS
- Lịch sử giao dịch

### 4. Report (Báo cáo)
- Báo cáo theo ngày/ca/món
- Dashboard tổng quan
- Thống kê doanh thu
- Phân tích xu hướng

### 5. Payment (Thanh toán)
- Tích hợp Momo, ZaloPay
- Quản lý giao dịch
- Hoàn tiền

### 6. Shift (Ca làm việc)
- Chấm công
- Phân ca
- KPI nhân viên

## 🚀 Cài đặt

### Yêu cầu hệ thống
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker (tùy chọn)

### Cài đặt với Docker (Khuyến nghị)

```bash
# Clone repository
git clone <repository-url>
cd nha-toi-erp

# Copy environment file
cp env.example .env

# Chỉnh sửa .env với thông tin của bạn
# DATABASE_URL, JWT_SECRET, etc.

# Chạy với Docker Compose
docker-compose up -d

# Chạy migration
docker-compose exec backend npm run db:migrate

# Seed dữ liệu mẫu
docker-compose exec backend npm run db:seed
```

### Cài đặt thủ công

```bash
# Cài đặt dependencies
npm install

# Cài đặt backend
cd apps/backend
npm install
npm run db:generate
npm run db:push

# Cài đặt frontend
cd ../frontend
npm install

# Chạy development
npm run dev
```

## 🔧 Cấu hình

### Environment Variables

Tạo file `.env` từ `env.example`:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/nha_toi_erp"
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"

# API
API_PORT=3001
CORS_ORIGIN="http://localhost:3000"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
```

## 📱 Sử dụng

### Truy cập ứng dụng
- **Frontend**: http://localhost:3000
- **API Documentation**: http://localhost:3001/api/docs
- **Database Studio**: `npm run db:studio`

### Tài khoản mặc định
- **Admin**: admin / admin123
- **Manager**: manager / manager123
- **Cashier**: cashier / cashier123

## 🔒 Bảo mật

- JWT Authentication với refresh token
- Password hashing với bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- SQL injection protection (Prisma)

## 📊 Monitoring

- Health check endpoint: `/health`
- Audit logs cho mọi thay đổi
- Error logging
- Performance monitoring

## 🚀 Deployment

### Production với Docker

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### VPS/Cloud

1. Cài đặt Node.js, PostgreSQL, Redis
2. Clone repository
3. Cấu hình environment variables
4. Chạy migration
5. Build và start ứng dụng

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License

MIT License - xem file LICENSE để biết thêm chi tiết.

## 📞 Hỗ trợ

- Email: support@nhatoi.com
- Documentation: [Wiki](link-to-wiki)
- Issues: [GitHub Issues](link-to-issues)

---

**Nhà Tôi ERP** - Hệ thống quản lý quán ăn hiện đại, đáng tin cậy và dễ sử dụng.
