# 🐘 HƯỚNG DẪN CÀI ĐẶT POSTGRESQL

## **Bước 1: Tải PostgreSQL**
1. Truy cập: https://www.postgresql.org/download/windows/
2. Tải PostgreSQL 15 hoặc mới hơn
3. Chạy installer

## **Bước 2: Cài đặt với các settings sau:**
- **Port**: 5432 (mặc định)
- **Username**: postgres
- **Password**: postgres123
- **Database**: nha_toi_erp (sẽ tạo sau)

## **Bước 3: Chạy setup script**
```bash
.\setup-postgres.bat
```

## **Bước 4: Chạy hệ thống**
```bash
.\start-with-postgres.bat
```

## **Kiểm tra PostgreSQL đã chạy:**
```bash
psql -U postgres -c "SELECT version();"
```

## **Nếu gặp lỗi:**
1. Kiểm tra PostgreSQL service đang chạy
2. Kiểm tra port 5432 không bị chiếm
3. Kiểm tra firewall settings
