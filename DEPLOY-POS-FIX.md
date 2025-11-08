# 🚀 Hướng dẫn Deploy Fix POS ChunkLoadError lên VPS

## Bước 1: SSH vào VPS

```bash
ssh deploy@36.50.27.82
# hoặc
ssh root@36.50.27.82
```

## Bước 2: Vào thư mục project

```bash
cd /home/deploy/Laumamnhatoi-erp
```

## Bước 3: Pull code mới từ Git

```bash
git pull origin main
```

## Bước 4: Chạy script fix POS chunk loading (nếu cần)

```bash
# Cho quyền thực thi
chmod +x fix-pos-chunk-loading.sh

# Chạy script fix
./fix-pos-chunk-loading.sh
```

## Bước 5: Deploy lên VPS

### Cách 1: Dùng script deploy có sẵn (Khuyến nghị)

```bash
chmod +x deploy.sh
./deploy.sh
```

### Cách 2: Deploy thủ công

```bash
# 1. Pull code
git pull origin main

# 2. Install dependencies
npm install
cd apps/frontend && npm install && cd ../..
cd apps/backend && npm install && cd ../..

# 3. Clean build
cd apps/frontend
rm -rf .next
rm -rf .next/cache
rm -rf tsconfig.tsbuildinfo
cd ../..

# 4. Build frontend
cd apps/frontend
npm run build
cd ../..

# 5. Build backend
cd apps/backend
npm run build
cd ../..

# 6. Restart services
pm2 restart laumam-frontend
pm2 restart laumam-backend
pm2 save
```

## Bước 6: Kiểm tra

```bash
# Kiểm tra PM2 status
pm2 status

# Kiểm tra logs
pm2 logs laumam-frontend --lines 50

# Test frontend
curl -I http://localhost:3002/pos

# Test chunk file (thay hash mới)
curl -I http://localhost:3002/_next/static/chunks/app/pos/page-*.js
```

## Bước 7: Clear browser cache

Sau khi deploy, người dùng cần:
1. Mở browser DevTools (F12)
2. Right-click nút Reload
3. Chọn "Empty Cache and Hard Reload"
4. Hoặc Ctrl+Shift+R (Windows/Linux) hoặc Cmd+Shift+R (Mac)

## Troubleshooting

### Nếu POS vẫn bị quay:

1. **Kiểm tra file chunk có tồn tại:**
```bash
cd apps/frontend
find .next -name "*pos*page*.js" -type f
```

2. **Kiểm tra logs:**
```bash
pm2 logs laumam-frontend --lines 100
```

3. **Kiểm tra build:**
```bash
cd apps/frontend
npm run build
```

4. **Kiểm tra permissions:**
```bash
ls -la apps/frontend/.next/static/chunks/app/pos/
```

5. **Restart frontend:**
```bash
pm2 restart laumam-frontend
```

### Nếu build fail:

```bash
# Clean và rebuild
cd apps/frontend
rm -rf .next node_modules/.cache
npm run build
```

### Nếu port bị chiếm:

```bash
# Kill process trên port 3002
lsof -ti:3002 | xargs kill -9
# hoặc
fuser -k 3002/tcp
```

## Script nhanh (One-liner)

```bash
cd /home/deploy/Laumamnhatoi-erp && \
git pull origin main && \
cd apps/frontend && \
rm -rf .next .next/cache tsconfig.tsbuildinfo && \
npm run build && \
cd ../.. && \
pm2 restart laumam-frontend && \
pm2 save && \
echo "✅ Deploy completed!"
```

## Kiểm tra sau deploy

1. **Mở browser:** http://36.50.27.82:3002/pos
2. **Mở DevTools (F12)** → Console tab
3. **Kiểm tra không còn ChunkLoadError**
4. **Kiểm tra Network tab** → File chunk load thành công (200)

## Liên hệ

Nếu vẫn có vấn đề, cung cấp:
- Output của `pm2 logs laumam-frontend`
- Output của `ls -lh apps/frontend/.next/static/chunks/app/pos/`
- Screenshot browser console

