# Hướng dẫn cài đặt Nhà Tôi ERP

## 🚀 Cài đặt nhanh (Khuyến nghị)

### Bước 1: Cài đặt Docker Desktop
1. Tải Docker Desktop từ: https://www.docker.com/products/docker-desktop/
2. Cài đặt và khởi động Docker Desktop
3. Đảm bảo Docker đang chạy

### Bước 2: Chạy ứng dụng
```bash
# Windows
start.bat

# Linux/Mac
chmod +x start.sh
./start.sh
```

## 🔧 Cài đặt thủ công (Không cần Docker)

### Bước 1: Cài đặt các yêu cầu hệ thống

#### Windows:
1. **Node.js 18+**: https://nodejs.org/
2. **PostgreSQL 15+**: https://www.postgresql.org/download/windows/
3. **Redis**: https://github.com/microsoftarchive/redis/releases

#### Linux (Ubuntu/Debian):
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Redis
sudo apt-get install redis-server
```

#### macOS:
```bash
# Sử dụng Homebrew
brew install node postgresql redis
```

### Bước 2: Cấu hình Database

#### PostgreSQL:
```sql
-- Tạo database
CREATE DATABASE nha_toi_erp;

-- Tạo user (tùy chọn)
CREATE USER nhatoi_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE nha_toi_erp TO nhatoi_user;
```

### Bước 3: Cấu hình Environment

```bash
# Copy file env
cp env.example .env

# Chỉnh sửa .env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/nha_toi_erp"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
```

### Bước 4: Chạy ứng dụng

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
cd ../..
npm run dev
```

**Hoặc sử dụng script có sẵn:**
```bash
# Windows
start-dev.bat

# Linux/Mac
chmod +x start-dev.sh
./start-dev.sh
```

## 🐳 Cài đặt với Docker (Khuyến nghị)

### Yêu cầu:
- Docker Desktop
- Docker Compose

### Chạy:
```bash
# Clone và cài đặt
git clone <repository>
cd nha-toi-erp

# Copy env file
cp env.example .env

# Chạy với Docker
docker-compose up --build

# Hoặc chạy nền
docker-compose up -d --build
```

## 🔍 Kiểm tra cài đặt

### Truy cập các URL:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **Database Studio**: `npm run db:studio` (trong thư mục backend)

### Kiểm tra logs:
```bash
# Backend logs
docker-compose logs backend

# Frontend logs
docker-compose logs frontend

# Database logs
docker-compose logs postgres
```

## 🛠️ Troubleshooting

### Lỗi thường gặp:

#### 1. "docker-compose is not recognized"
- Cài đặt Docker Desktop
- Hoặc sử dụng `start-dev.bat`/`start-dev.sh`

#### 2. "Database connection failed"
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra DATABASE_URL trong .env
- Kiểm tra port 5432

#### 3. "Redis connection failed"
- Kiểm tra Redis đang chạy
- Kiểm tra REDIS_URL trong .env
- Kiểm tra port 6379

#### 4. "Port already in use"
- Thay đổi port trong .env
- Hoặc dừng service đang sử dụng port

#### 5. "Module not found"
- Chạy `npm install` trong thư mục gốc
- Chạy `npm install` trong apps/backend
- Chạy `npm install` trong apps/frontend

### Reset hoàn toàn:
```bash
# Xóa containers và volumes
docker-compose down -v

# Xóa node_modules
rm -rf node_modules apps/*/node_modules

# Cài đặt lại
npm install
cd apps/backend && npm install
cd ../frontend && npm install
cd ../..

# Chạy lại
docker-compose up --build
```

## 📱 PWA Setup

Để sử dụng như Progressive Web App:

1. Mở http://localhost:3000
2. Click vào icon "Install" trên thanh địa chỉ
3. Hoặc menu "Add to Home Screen" trên mobile

## 🔒 Production Setup

### Environment Variables:
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_SECRET=your-production-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
```

### Build và Deploy:
```bash
# Build production
npm run build

# Start production
npm run start
```

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:
1. Logs của từng service
2. Environment variables
3. Port conflicts
4. Database connection

Hoặc tạo issue trên GitHub với thông tin lỗi chi tiết.
