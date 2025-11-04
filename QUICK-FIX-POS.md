# Quick Fix POS Page - Hướng dẫn nhanh

## Vấn đề
POS page không load được JavaScript - file `page-6752f73ec0053381.js` không tồn tại trong build.

## Cách fix ngay (không cần pull)

### Bước 1: Stash local changes và pull
```bash
cd /home/deploy/Laumamnhatoi-erp
git stash
git pull origin main
```

### Bước 2: Rebuild frontend hoàn toàn
```bash
cd /home/deploy/Laumamnhatoi-erp/apps/frontend

# Xóa build cũ hoàn toàn
rm -rf .next
rm -rf .next/cache
rm -rf tsconfig.tsbuildinfo

# Đảm bảo dependencies đã được cài
npm install

# Rebuild
npm run build

# Kiểm tra file POS có trong build không
find .next -name "*pos*page*.js" -type f
```

### Bước 3: Restart frontend
```bash
cd /home/deploy/Laumamnhatoi-erp

# Kill process trên port 3002
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

# Restart PM2
pm2 delete laumam-frontend 2>/dev/null || true
pm2 start ecosystem.config.js --only laumam-frontend
pm2 save
```

### Bước 4: Kiểm tra
```bash
# Đợi frontend khởi động
sleep 5

# Kiểm tra file có tồn tại trong build
find /home/deploy/Laumamnhatoi-erp/apps/frontend/.next -name "*pos*page*.js" -type f

# Kiểm tra Next.js có serve được không
curl -I http://localhost:3002/_next/static/chunks/app/pos/page-*.js 2>/dev/null | head -1
```

## Sau khi fix

1. **Xóa cache browser**: Ctrl+Shift+R (Windows) hoặc Cmd+Shift+R (Mac)
2. **Truy cập lại**: http://36.50.27.82:3002/pos
3. **Kiểm tra console**: Nếu vẫn lỗi, kiểm tra hash mới trong console và so sánh với file thực tế

## Nếu vẫn không có file sau khi build

Có thể do lỗi khi build POS page. Kiểm tra logs:

```bash
cd /home/deploy/Laumamnhatoi-erp/apps/frontend
npm run build 2>&1 | grep -i "pos\|error" | tail -20
```

