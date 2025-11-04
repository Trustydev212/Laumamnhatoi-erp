# 🛡️ Hướng dẫn cập nhật hệ thống an toàn

## 📋 Tổng quan

Script `safe-update.sh` giúp bạn cập nhật hệ thống một cách an toàn với:
- ✅ **Backup database tự động** trước khi cập nhật
- ✅ **Lưu trạng thái code** (commit hash) để rollback
- ✅ **Rollback tự động** nếu có lỗi
- ✅ **Health check** sau khi cập nhật
- ✅ **Log chi tiết** từng bước

## 🚀 Cách sử dụng

### 1. Cập nhật hệ thống (Khuyến nghị)

```bash
# Chạy script cập nhật an toàn
cd /home/deploy/Laumamnhatoi-erp
chmod +x safe-update.sh
./safe-update.sh
```

Script sẽ tự động:
1. 📦 Backup database (tự động nén để tiết kiệm dung lượng)
2. 💾 Lưu trạng thái code hiện tại
3. 📥 Pull code mới từ GitHub
4. 📦 Cập nhật dependencies
5. 🗄️ Chạy database migrations
6. 🔨 Build code (backend + frontend)
7. 🔄 Restart services
8. 🧪 Kiểm tra health check

### 2. Xem logs trong quá trình cập nhật

```bash
# Xem logs realtime
pm2 logs

# Xem logs backend
pm2 logs laumam-backend

# Xem logs frontend
pm2 logs laumam-frontend

# Xem logs với số dòng giới hạn
pm2 logs --lines 100
```

### 3. Kiểm tra trạng thái services

```bash
# Xem status tất cả services
pm2 status

# Xem thông tin chi tiết
pm2 show laumam-backend
pm2 show laumam-frontend

# Restart services nếu cần
pm2 restart all
```

## 🔄 Rollback (Khôi phục)

Script tự động rollback nếu có lỗi trong quá trình cập nhật. Nếu cần rollback thủ công:

### Rollback Database

```bash
# Liệt kê các backup có sẵn
ls -lh /home/deploy/backups/

# Khôi phục từ backup (thay YYYYMMDD-HHMMSS bằng timestamp)
cd /home/deploy/Laumamnhatoi-erp/apps/backend

# Nếu backup là file .gz, giải nén trước
gunzip /home/deploy/backups/backup-YYYYMMDD-HHMMSS.sql.gz

# Khôi phục database
export PGPASSWORD="210200"
psql -h localhost -U nhatoi_user -d nha_toierp < /home/deploy/backups/backup-YYYYMMDD-HHMMSS.sql
```

### Rollback Code

```bash
cd /home/deploy/Laumamnhatoi-erp

# Xem lịch sử commit
git log --oneline -10

# Rollback về commit cũ (thay COMMIT_HASH bằng hash thực tế)
git reset --hard COMMIT_HASH

# Rebuild và restart
cd apps/backend && npm run build && cd ../..
pm2 restart all
```

## 📦 Quản lý Backups

### Xem danh sách backups

```bash
# Liệt kê tất cả backups
ls -lh /home/deploy/backups/

# Xem backup mới nhất
ls -t /home/deploy/backups/ | head -1
```

### Xóa backups cũ (giữ lại 7 ngày gần nhất)

```bash
# Xóa backups cũ hơn 7 ngày
find /home/deploy/backups/ -name "backup-*.sql*" -mtime +7 -delete

# Hoặc giữ lại 10 backup mới nhất
cd /home/deploy/backups/
ls -t backup-*.sql* | tail -n +11 | xargs rm -f
```

### Tạo backup thủ công

```bash
cd /home/deploy/Laumamnhatoi-erp/apps/backend

# Load database credentials
source <(grep -v '^#' .env | sed 's/^/export /')

# Tạo backup
export PGPASSWORD="210200"
pg_dump -h localhost -U nhatoi_user -d nha_toierp -F c -f /home/deploy/backups/manual-backup-$(date +%Y%m%d-%H%M%S).dump

# Nén backup
gzip /home/deploy/backups/manual-backup-*.dump
```

## ⚠️ Lưu ý quan trọng

### 1. Trước khi cập nhật

- ✅ **Kiểm tra không gian đĩa**: Đảm bảo có ít nhất 2GB trống
  ```bash
  df -h
  ```

- ✅ **Kiểm tra kết nối database**: Đảm bảo có thể kết nối
  ```bash
  cd apps/backend
  npm run db:studio
  ```

- ✅ **Kiểm tra git status**: Đảm bảo không có thay đổi quan trọng chưa commit
  ```bash
  git status
  ```

### 2. Trong quá trình cập nhật

- ⏸️ **Không tắt terminal** hoặc dừng script
- 👀 **Theo dõi logs** để phát hiện lỗi sớm
- 📱 **Thông báo cho người dùng** về thời gian bảo trì

### 3. Sau khi cập nhật

- ✅ **Kiểm tra website hoạt động**: http://laumamnhatoi.vn
- ✅ **Kiểm tra API**: http://laumamnhatoi.vn/api/health
- ✅ **Kiểm tra POS**: http://laumamnhatoi.vn/pos
- ✅ **Xem logs**: `pm2 logs` để tìm lỗi

## 🐛 Xử lý lỗi

### Lỗi: Backup thất bại

```bash
# Kiểm tra PostgreSQL đang chạy
sudo systemctl status postgresql

# Kiểm tra quyền truy cập
sudo -u postgres psql -c "\du"

# Kiểm tra kết nối
psql -h localhost -U nhatoi_user -d nha_toierp
```

### Lỗi: Build thất bại

```bash
# Xóa cache và rebuild
cd apps/backend
rm -rf node_modules dist
npm install
npm run build

# Frontend
cd ../frontend
rm -rf node_modules .next
npm install
npm run build
```

### Lỗi: Migration thất bại

```bash
# Kiểm tra schema.prisma
cd apps/backend
cat prisma/schema.prisma

# Reset migration (CHỈ khi cần thiết - sẽ mất dữ liệu!)
# npm run db:reset

# Hoặc push schema trực tiếp (development)
npm run db:push
```

### Lỗi: Service không khởi động

```bash
# Xem logs chi tiết
pm2 logs --err

# Kiểm tra port
lsof -i :3001
lsof -i :3002

# Kill processes cũ
pkill -9 node
pm2 delete all
pm2 start ecosystem.config.js
```

## 📊 So sánh với script deploy.sh

| Tính năng | deploy.sh | safe-update.sh |
|-----------|-----------|----------------|
| Backup database | ❌ | ✅ Tự động |
| Rollback tự động | ❌ | ✅ |
| Lưu trạng thái code | ❌ | ✅ |
| Health check | ✅ | ✅ |
| Migration | ❌ | ✅ |
| Error handling | ⚠️ Cơ bản | ✅ Chi tiết |

## 🔐 Bảo mật

- 🔒 **Backup files** được lưu với quyền hạn chế (chỉ user deploy)
- 🔒 **Database password** không được log ra console
- 🔒 **Rollback files** chứa thông tin nhạy cảm, cần bảo vệ

## 📞 Hỗ trợ

Nếu gặp vấn đề:

1. **Xem logs chi tiết**:
   ```bash
   pm2 logs --lines 200
   ```

2. **Kiểm tra backup có sẵn**:
   ```bash
   ls -lh /home/deploy/backups/
   ```

3. **Kiểm tra git status**:
   ```bash
   git status
   git log --oneline -5
   ```

4. **Kiểm tra database**:
   ```bash
   cd apps/backend
   npm run db:studio
   ```

## 🎯 Best Practices

1. **Cập nhật vào giờ ít người dùng** (ví dụ: 2-4 giờ sáng)
2. **Thông báo trước** cho người dùng về thời gian bảo trì
3. **Giữ ít nhất 3-5 backups** gần nhất
4. **Test trên môi trường dev** trước khi deploy production
5. **Monitor logs** trong 30 phút đầu sau khi cập nhật
6. **Kiểm tra chức năng quan trọng** ngay sau khi cập nhật

## 📝 Checklist trước khi cập nhật

- [ ] Đã kiểm tra không gian đĩa (≥2GB)
- [ ] Đã kiểm tra kết nối database
- [ ] Đã kiểm tra git status
- [ ] Đã thông báo cho người dùng
- [ ] Đã chuẩn bị thời gian bảo trì (30-60 phút)
- [ ] Đã backup thủ công quan trọng (nếu cần)
- [ ] Đã kiểm tra code mới trên GitHub

## 🎉 Hoàn tất

Sau khi cập nhật thành công:

1. ✅ Kiểm tra website hoạt động bình thường
2. ✅ Test các chức năng chính (POS, Orders, Reports)
3. ✅ Kiểm tra logs không có lỗi
4. ✅ Xóa backup cũ nếu cần (giữ lại 7 ngày gần nhất)
5. ✅ Ghi nhận version mới và thay đổi

---

**Lưu ý**: Script này được thiết kế để an toàn, nhưng luôn cẩn thận khi cập nhật hệ thống production. Nên test trên môi trường dev trước!

