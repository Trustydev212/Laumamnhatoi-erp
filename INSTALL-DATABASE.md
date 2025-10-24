# Hướng dẫn cài đặt Database cho Nhà Tôi ERP

## 🐘 Cài đặt PostgreSQL

### Windows:

1. **Tải PostgreSQL**: https://www.postgresql.org/download/windows/
2. **Cài đặt** với các tùy chọn mặc định
3. **Ghi nhớ mật khẩu** cho user `postgres`
4. **Khởi động PostgreSQL** service

### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### macOS:
```bash
brew install postgresql
brew services start postgresql
```

## 🔧 Cấu hình Database

### 1. Tạo database:
```sql
-- Kết nối PostgreSQL
psql -U postgres

-- Tạo database
CREATE DATABASE nha_toi_erp;

-- Tạo user (tùy chọn)
CREATE USER nhatoi_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE nha_toi_erp TO nhatoi_user;

-- Thoát
\q
```

### 2. Cập nhật file .env:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/nha_toi_erp"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
```

## 🚀 Chạy setup database

Sau khi cài đặt PostgreSQL:

```bash
# Windows
cmd /c "setup-database.bat"

# Linux/Mac
chmod +x setup-database.sh
./setup-database.sh
```

## 🔍 Kiểm tra kết nối

```bash
# Test kết nối PostgreSQL
psql -U postgres -d nha_toi_erp -c "SELECT version();"

# Test kết nối Redis
redis-cli ping
```

## 🆘 Troubleshooting

### Lỗi "Can't reach database server":
1. Kiểm tra PostgreSQL đang chạy
2. Kiểm tra port 5432
3. Kiểm tra firewall
4. Kiểm tra DATABASE_URL trong .env

### Lỗi "Authentication failed":
1. Kiểm tra username/password
2. Kiểm tra pg_hba.conf
3. Thử reset password postgres

### Lỗi "Database does not exist":
1. Tạo database thủ công
2. Kiểm tra tên database trong .env

## 📱 Sử dụng Docker (Khuyến nghị)

Nếu không muốn cài đặt thủ công:

```bash
# Cài Docker Desktop
# Sau đó chạy:
docker-compose up -d postgres redis

# Chờ 30 giây rồi chạy:
cmd /c "setup-database.bat"
```

## ✅ Sau khi setup xong

Bạn sẽ có:
- ✅ Database `nha_toi_erp` với đầy đủ bảng
- ✅ 4 tài khoản test: admin, manager, cashier, kitchen
- ✅ Dữ liệu mẫu: bàn, menu, nguyên liệu, khách hàng
- ✅ Sẵn sàng chạy ứng dụng!
