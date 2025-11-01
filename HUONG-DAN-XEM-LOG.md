# 📋 HƯỚNG DẪN XEM LOG BACKEND

Tài liệu này hướng dẫn cách kiểm tra logs của backend trên VPS để debug và theo dõi hệ thống.

---

## 🔍 CÁC CÁCH XEM LOG BACKEND

### 1️⃣ Xem Log với PM2 (Khuyến nghị)

Backend đang chạy với PM2, đây là cách dễ nhất để xem logs:

#### Xem log real-time (theo dõi trực tiếp):
```bash
pm2 logs backend
```

#### Xem log với số dòng giới hạn:
```bash
pm2 logs backend --lines 100
```

#### Xem log và tự động làm mới:
```bash
pm2 logs backend --lines 50 --raw
```

#### Xem tất cả logs (tất cả ứng dụng PM2):
```bash
pm2 logs
```

#### Chỉ xem log lỗi:
```bash
pm2 logs backend --err
```

#### Chỉ xem log thông thường:
```bash
pm2 logs backend --out
```

---

### 2️⃣ Xem Log File Trực Tiếp

PM2 lưu logs tại các file mặc định:

#### Log thông thường (stdout):
```bash
~/.pm2/logs/backend-out.log
```

#### Log lỗi (stderr):
```bash
~/.pm2/logs/backend-error.log
```

#### Xem log file trực tiếp:
```bash
# Xem toàn bộ log
cat ~/.pm2/logs/backend-out.log

# Xem 100 dòng cuối
tail -n 100 ~/.pm2/logs/backend-out.log

# Xem log real-time (giống pm2 logs)
tail -f ~/.pm2/logs/backend-out.log

# Xem log lỗi
cat ~/.pm2/logs/backend-error.log
```

---

### 3️⃣ Tìm Log Lỗi Cụ Thể

#### Tìm lỗi xóa đơn hàng:
```bash
pm2 logs backend --lines 200 | grep -i "order\|delete\|error"
```

Hoặc:
```bash
grep -i "delete\|order\|error" ~/.pm2/logs/backend-error.log
```

#### Tìm log trong khoảng thời gian:
```bash
# Xem log từ 1 giờ trước
tail -n 500 ~/.pm2/logs/backend-out.log | grep "$(date -d '1 hour ago' '+%Y-%m-%d')"
```

#### Tìm lỗi 500:
```bash
grep -i "500\|Internal Server Error" ~/.pm2/logs/backend-error.log
```

---

### 4️⃣ Xem Log Chi Tiết Của NestJS

NestJS có log levels. Để xem log chi tiết hơn, kiểm tra file `.env`:

```bash
# Xem cấu hình log level
cat apps/backend/.env | grep LOG_LEVEL

# Hoặc trong code có thể set:
# LOG_LEVEL=debug (hiển thị tất cả logs)
# LOG_LEVEL=error (chỉ hiển thị lỗi)
```

---

### 5️⃣ Xem Log Docker (Nếu dùng Docker)

Nếu backend chạy trong Docker container:

```bash
# Xem log container
docker logs backend-container-name

# Xem log real-time
docker logs -f backend-container-name

# Xem log với số dòng
docker logs --tail 100 backend-container-name
```

---

## 🐛 DEBUG LỖI XÓA ĐƠN HÀNG

Khi xóa đơn hàng bị lỗi 500, làm theo các bước sau:

### Bước 1: Xem log real-time
```bash
pm2 logs backend --lines 0
```
Sau đó thử xóa đơn hàng từ frontend, bạn sẽ thấy lỗi ngay lập tức.

### Bước 2: Tìm lỗi cụ thể
```bash
pm2 logs backend --err --lines 50 | grep -A 10 -B 10 "order\|delete\|500"
```

### Bước 3: Xem stack trace
```bash
tail -n 200 ~/.pm2/logs/backend-error.log | grep -A 20 "Error\|Exception"
```

### Bước 4: Kiểm tra database
```bash
# Nếu dùng PostgreSQL qua Docker
docker exec -it postgres-container psql -U your_user -d your_database

# Hoặc nếu dùng SQLite (dev)
sqlite3 apps/backend/prisma/dev.db
```

---

## 📊 CÁC LỆNH PM2 HỮU ÍCH KHÁC

### Xem trạng thái ứng dụng:
```bash
pm2 status
```

### Xem thông tin chi tiết:
```bash
pm2 describe backend
```

### Restart backend (sau khi fix code):
```bash
pm2 restart backend
```

### Xem memory và CPU usage:
```bash
pm2 monit
```

### Xóa logs cũ:
```bash
pm2 flush backend
```

---

## 🔍 CÁC LOG LEVEL THƯỜNG GẶP

### Console.log trong code:
- Xuất hiện trong `backend-out.log`
- Dùng để debug

### Error/Exception:
- Xuất hiện trong `backend-error.log`
- Cần chú ý và fix ngay

### HTTP Requests:
- NestJS tự động log các request
- Format: `[Nest] timestamp - LOG [App] Method Path - StatusCode`

---

## 📝 VÍ DỤ LOG KHI XÓA ĐƠN HÀNG

Khi xóa đơn hàng, bạn sẽ thấy logs tương tự:

```
[Nest] 12345  - 12/01/2024, 10:30:45 AM     LOG [OrderService] Deleting order: cmhgk2njc0001ypmqztuwuhzv
[Nest] 12345  - 12/01/2024, 10:30:45 AM     LOG [OrderService] Order status: COMPLETED, isPaid: true
[Nest] 12345  - 12/01/2024, 10:30:45 AM     LOG [MenuIngredientService] Refunding stock for menu: abc123
[Nest] 12345  - 12/01/2024, 10:30:45 AM   ERROR [OrderService] Error deleting order: ...
```

Hoặc nếu có lỗi:
```
[Nest] 12345  - 12/01/2024, 10:30:45 AM   ERROR [ExceptionsHandler] Cannot delete order: ...
    at OrderService.remove (order.service.ts:495:29)
    at PosController.deleteOrder (pos.controller.ts:136:15)
```

---

## 🚀 QUICK CHECK COMMANDS

### Kiểm tra nhanh xem backend có đang chạy:
```bash
pm2 status | grep backend
```

### Xem log lỗi mới nhất:
```bash
tail -n 50 ~/.pm2/logs/backend-error.log
```

### Xem log mới nhất (100 dòng):
```bash
pm2 logs backend --lines 100 --nostream
```

### Tìm tất cả lỗi hôm nay:
```bash
grep "$(date '+%Y-%m-%d')" ~/.pm2/logs/backend-error.log
```

---

## 💡 TIPS

1. **Luôn xem log real-time khi test:**
   ```bash
   pm2 logs backend --lines 0
   ```

2. **Save log vào file để phân tích:**
   ```bash
   pm2 logs backend --lines 500 > backend-debug.log
   ```

3. **Filter log theo keyword:**
   ```bash
   pm2 logs backend | grep "keyword"
   ```

4. **Xem log từ một thời điểm cụ thể:**
   ```bash
   grep "2024-01-12 10:30" ~/.pm2/logs/backend-out.log
   ```

---

## 🔐 QUYỀN TRUY CẬP

Đảm bảo bạn có quyền truy cập:
- SSH vào VPS
- Quyền đọc file log (thường là user chạy PM2)
- Quyền sudo nếu cần (cho một số lệnh)

---

## 📞 CẦN HỖ TRỢ?

Nếu vẫn không thấy log hoặc gặp vấn đề:
1. Kiểm tra PM2 có đang chạy: `pm2 status`
2. Kiểm tra quyền truy cập file log
3. Kiểm tra đường dẫn log trong `ecosystem.config.js`
4. Restart PM2: `pm2 restart backend`

---

**Chúc bạn debug thành công! 🎯**

