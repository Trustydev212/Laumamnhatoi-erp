# 🛡️ Bảo vệ Database khi Deploy

## ⚠️ QUAN TRỌNG: Script deploy-pos-fix.sh AN TOÀN với Database

Script `deploy-pos-fix.sh` được thiết kế **CHỈ fix frontend**, **KHÔNG động vào database**.

### ✅ Những gì script KHÔNG làm:

- ❌ **KHÔNG** chạy `prisma migrate`
- ❌ **KHÔNG** chạy `prisma db push`
- ❌ **KHÔNG** chạy `prisma migrate reset`
- ❌ **KHÔNG** xóa database
- ❌ **KHÔNG** drop tables
- ❌ **KHÔNG** restart backend (giữ database connection)
- ❌ **KHÔNG** thay đổi schema database

### ✅ Những gì script LÀM:

- ✅ Pull code mới từ Git
- ✅ Install dependencies (chỉ frontend)
- ✅ Clean frontend build artifacts (`.next`, cache)
- ✅ Rebuild frontend
- ✅ Restart **CHỈ frontend service** (backend vẫn chạy)

## 🔒 Bảo vệ Database

### 1. Script chỉ rebuild frontend

Script chỉ làm việc với:
- `apps/frontend/.next` - Build output
- `apps/frontend/node_modules` - Dependencies
- **KHÔNG** động vào `apps/backend/prisma/`
- **KHÔNG** động vào database files

### 2. Backend không bị restart

Script chỉ restart `laumam-frontend`, **KHÔNG** restart `laumam-backend`:
- Database connections được giữ nguyên
- Không có downtime cho database
- Tất cả dữ liệu vẫn an toàn

### 3. Không có lệnh database

Script không chứa bất kỳ lệnh nào liên quan đến:
- `prisma migrate`
- `prisma db push`
- `prisma db seed`
- `pg_dump` / `pg_restore`
- `psql` commands

## 📋 Kiểm tra Database sau Deploy

Sau khi chạy script, bạn có thể kiểm tra database vẫn hoạt động:

```bash
# Kiểm tra backend vẫn chạy
pm2 status | grep laumam-backend

# Kiểm tra database connection (nếu có script)
cd apps/backend
npm run db:generate  # Chỉ generate Prisma client, không thay đổi DB

# Kiểm tra trong code
# Mở browser → http://36.50.27.82:3002/dashboard
# Xem dữ liệu vẫn hiển thị đúng
```

## 🚨 Nếu cần chạy Migration

**LƯU Ý:** Nếu bạn cần chạy migration (thay đổi schema), **KHÔNG dùng script này**.

Thay vào đó, dùng script an toàn hơn:

```bash
# Script có backup database trước khi migrate
./safe-update.sh
```

Hoặc chạy migration thủ công:

```bash
cd apps/backend
npm run db:generate
npx prisma migrate deploy  # Chỉ apply migrations mới, không reset
```

## ✅ Xác nhận Database An toàn

Sau khi chạy `deploy-pos-fix.sh`, bạn sẽ thấy message:

```
✅ Database không bị ảnh hưởng - tất cả dữ liệu vẫn an toàn!
```

Điều này xác nhận script đã hoàn tất mà **KHÔNG** động vào database.

## 📞 Liên hệ

Nếu có bất kỳ lo ngại nào về database, hãy:
1. Kiểm tra `pm2 logs laumam-backend` - Backend vẫn chạy bình thường
2. Kiểm tra database connection trong backend logs
3. Test API endpoints - Nếu API hoạt động, database OK

---

**Tóm lại:** Script `deploy-pos-fix.sh` **100% an toàn** với database. Nó chỉ rebuild frontend và restart frontend service, **KHÔNG** làm gì với database.

