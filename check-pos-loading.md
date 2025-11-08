# 🔍 Hướng dẫn kiểm tra tại sao POS đang bị quay (loading)

## Vấn đề hiện tại

Từ browser console, bạn đang gặp lỗi:
- **ChunkLoadError**: File `page-6752f73ec0053381.js` không load được
- **400 Bad Request**: Server trả về lỗi khi request file chunk
- **MIME type error**: Server trả về HTML thay vì JavaScript

## Nguyên nhân

1. **File chunk không tồn tại**: Next.js build không tạo ra file này hoặc file bị xóa
2. **Build cũ**: File chunk có hash cũ nhưng đã bị xóa sau khi rebuild
3. **Server không serve đúng static files**: Next.js server không serve file từ `.next/static`
4. **Cache issue**: Browser cache file cũ nhưng server đã không còn file đó

## Các lệnh kiểm tra

### 1. Kiểm tra Backend có chạy không

```bash
# Kiểm tra port 3001
lsof -i:3001
# hoặc
netstat -an | grep 3001

# Kiểm tra PM2
pm2 list | grep backend
```

### 2. Kiểm tra Frontend có chạy không

```bash
# Kiểm tra port 3002
lsof -i:3002
# hoặc
netstat -an | grep 3002

# Kiểm tra PM2
pm2 list | grep frontend
```

### 3. Kiểm tra file chunk có tồn tại không

```bash
cd apps/frontend

# Tìm file chunk POS
find .next -name "*pos*page*.js" -type f

# Kiểm tra file có tồn tại với hash cụ thể
ls -lh .next/static/chunks/app/pos/page-*.js

# Kiểm tra file từ URL lỗi
# URL: http://36.50.27.82:3002/_next/static/chunks/app/pos/page-6752f73ec0053381.js
# File path: .next/static/chunks/app/pos/page-6752f73ec0053381.js
ls -lh .next/static/chunks/app/pos/page-6752f73ec0053381.js
```

### 4. Kiểm tra API endpoints

```bash
# Test API với curl
curl -I http://36.50.27.82:3001/pos/tables
curl -I http://36.50.27.82:3001/pos/menu
curl -I http://36.50.27.82:3001/pos/categories

# Test với token (nếu có)
TOKEN="your-token-here"
curl -H "Authorization: Bearer $TOKEN" http://36.50.27.82:3001/pos/tables
```

### 5. Kiểm tra logs

```bash
# Frontend logs
pm2 logs laumam-frontend --lines 50

# Backend logs
pm2 logs laumam-backend --lines 50

# Nginx logs (nếu dùng)
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### 6. Kiểm tra trong Browser Console

Mở browser DevTools (F12) và chạy các lệnh sau:

```javascript
// 1. Kiểm tra API URL
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);

// 2. Kiểm tra token
console.log('Token:', localStorage.getItem('accessToken') ? 'Present' : 'Missing');

// 3. Test API call
fetch('http://36.50.27.82:3001/pos/tables', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
  }
})
.then(r => r.json())
.then(data => console.log('✅ API OK:', data))
.catch(err => console.error('❌ API Error:', err));

// 4. Test chunk file
fetch('http://36.50.27.82:3002/_next/static/chunks/app/pos/page-6752f73ec0053381.js')
.then(r => {
  console.log('Chunk Status:', r.status);
  console.log('Content-Type:', r.headers.get('content-type'));
  return r.text();
})
.then(text => {
  console.log('Chunk Content (first 100 chars):', text.substring(0, 100));
})
.catch(err => console.error('❌ Chunk Error:', err));
```

## Giải pháp

### Giải pháp 1: Rebuild Frontend (Khuyến nghị)

```bash
cd apps/frontend

# 1. Stop frontend
pm2 delete laumam-frontend
# hoặc
lsof -ti:3002 | xargs kill -9

# 2. Clean build
rm -rf .next
rm -rf .next/cache
rm -rf tsconfig.tsbuildinfo
rm -rf node_modules/.cache

# 3. Rebuild
npm run build

# 4. Restart
cd ../..
pm2 start ecosystem.config.js --only laumam-frontend
pm2 save
```

### Giải pháp 2: Sử dụng script tự động

```bash
# Chạy script fix tự động
chmod +x fix-pos-chunk-loading.sh
./fix-pos-chunk-loading.sh
```

### Giải pháp 3: Clear Browser Cache

1. Mở browser DevTools (F12)
2. Right-click vào nút Reload
3. Chọn "Empty Cache and Hard Reload"
4. Hoặc dùng Ctrl+Shift+R (Windows/Linux) hoặc Cmd+Shift+R (Mac)

### Giải pháp 4: Kiểm tra Next.js Configuration

Kiểm tra file `apps/frontend/next.config.js` có cấu hình đúng không:

```javascript
// Đảm bảo có cấu hình headers cho static files
async headers() {
  return [
    {
      source: '/_next/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ]
}
```

### Giải pháp 5: Kiểm tra Nginx Configuration (nếu dùng)

Nếu dùng Nginx reverse proxy, đảm bảo có cấu hình:

```nginx
location /_next/static/ {
    alias /path/to/apps/frontend/.next/static/;
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Content-Type "application/javascript";
}
```

## Kiểm tra sau khi fix

1. **Clear browser cache** và reload trang
2. **Mở DevTools** → Console tab → Kiểm tra không còn ChunkLoadError
3. **Mở Network tab** → Kiểm tra file chunk load thành công (status 200)
4. **Kiểm tra POS page** load được và không còn quay vòng

## Debug thêm

Nếu vẫn còn lỗi, kiểm tra:

1. **File permissions**: Đảm bảo Next.js có quyền đọc file trong `.next/`
2. **Disk space**: Kiểm tra còn đủ dung lượng không
3. **Build errors**: Kiểm tra có lỗi khi build không
4. **Server logs**: Xem logs chi tiết để tìm nguyên nhân

## Liên hệ

Nếu vẫn không giải quyết được, cung cấp:
- Output của `pm2 logs laumam-frontend`
- Screenshot browser console
- Output của `ls -lh apps/frontend/.next/static/chunks/app/pos/`

