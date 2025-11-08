# 🚀 Lệnh Deploy lên VPS

## Cách 1: Dùng script tự động (Khuyến nghị)

```bash
# 1. SSH vào VPS
ssh deploy@36.50.27.82
# hoặc
ssh root@36.50.27.82

# 2. Vào thư mục project
cd /home/deploy/Laumamnhatoi-erp

# 3. Pull code mới từ Git
git pull origin main

# 4. Cho quyền thực thi script
chmod +x deploy-pos-fix.sh

# 5. Chạy script deploy
./deploy-pos-fix.sh
```

## Cách 2: Chạy từng lệnh thủ công

```bash
# 1. SSH vào VPS
ssh deploy@36.50.27.82

# 2. Vào thư mục project
cd /home/deploy/Laumamnhatoi-erp

# 3. Pull code mới
git pull origin main

# 4. Vào thư mục frontend
cd apps/frontend

# 5. Install dependencies (nếu cần)
npm install

# 6. Clean build cũ
rm -rf .next
rm -rf .next/cache
rm -rf tsconfig.tsbuildinfo
rm -rf node_modules/.cache

# 7. Rebuild frontend
npm run build

# 8. Quay về thư mục root
cd /home/deploy/Laumamnhatoi-erp

# 9. Restart chỉ frontend (KHÔNG restart backend)
pm2 restart laumam-frontend

# 10. Lưu PM2 config
pm2 save

# 11. Kiểm tra status
pm2 status

# 12. Xem logs
pm2 logs laumam-frontend --lines 20
```

## Cách 3: One-liner (Copy toàn bộ và paste)

```bash
cd /home/deploy/Laumamnhatoi-erp && \
git pull origin main && \
cd apps/frontend && \
rm -rf .next .next/cache tsconfig.tsbuildinfo node_modules/.cache && \
npm run build && \
cd /home/deploy/Laumamnhatoi-erp && \
pm2 restart laumam-frontend && \
pm2 save && \
echo "✅ Deploy completed! Database is safe."
```

## Kiểm tra sau khi deploy

```bash
# 1. Kiểm tra PM2 status
pm2 status

# 2. Kiểm tra frontend đang chạy
pm2 logs laumam-frontend --lines 20

# 3. Test frontend
curl -I http://localhost:3002/pos

# 4. Kiểm tra backend vẫn chạy (database connection)
pm2 logs laumam-backend --lines 10
```

## Nếu gặp lỗi

### Lỗi: Permission denied
```bash
chmod +x deploy-pos-fix.sh
```

### Lỗi: Port đã được sử dụng
```bash
# Kill process trên port 3002
lsof -ti:3002 | xargs kill -9
# hoặc
fuser -k 3002/tcp
```

### Lỗi: Build failed
```bash
cd apps/frontend
rm -rf node_modules
npm install
npm run build
```

### Lỗi: PM2 không tìm thấy process
```bash
# Start lại frontend
pm2 start ecosystem.config.js --only laumam-frontend
pm2 save
```

## ⚠️ Lưu ý quan trọng

1. **Database an toàn**: Script chỉ rebuild frontend, KHÔNG động vào database
2. **Backend vẫn chạy**: Chỉ restart frontend, backend giữ nguyên để giữ database connection
3. **Không mất dữ liệu**: Tất cả dữ liệu trong database vẫn an toàn

## Sau khi deploy xong

1. **Clear browser cache**:
   - Mở DevTools (F12)
   - Right-click nút Reload → "Empty Cache and Hard Reload"
   - Hoặc Ctrl+Shift+R

2. **Kiểm tra POS page**:
   - Mở: http://36.50.27.82:3002/pos
   - Kiểm tra Console không còn ChunkLoadError
   - Kiểm tra Network tab → chunk files load thành công

