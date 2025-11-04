# Fix Lỗi EADDRINUSE - Port đã được sử dụng

## Vấn đề
Backend và Frontend gặp lỗi `EADDRINUSE: address already in use` khi khởi động vì có process zombie đang chiếm ports 3001 và 3002.

## Cách fix nhanh

### Bước 1: Stash local changes và pull code
```bash
cd /home/deploy/Laumamnhatoi-erp
git stash
git pull origin main
```

### Bước 2: Chạy script cleanup
```bash
chmod +x cleanup-and-restart.sh
./cleanup-and-restart.sh
```

## Hoặc fix thủ công

### Bước 1: Kill tất cả process trên ports
```bash
# Kill process trên port 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Kill process trên port 3002
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

# Kill bằng process name
pkill -9 -f "node dist/main" 2>/dev/null || true
pkill -9 -f "next start" 2>/dev/null || true
```

### Bước 2: Dừng và xóa tất cả PM2
```bash
pm2 delete all
pm2 kill
sleep 3
```

### Bước 3: Kiểm tra ports đã được giải phóng
```bash
# Kiểm tra port 3001
lsof -i:3001

# Kiểm tra port 3002
lsof -i:3002
```

### Bước 4: Khởi động lại services
```bash
cd /home/deploy/Laumamnhatoi-erp
pm2 start ecosystem.config.js
pm2 save
```

### Bước 5: Kiểm tra status
```bash
pm2 status
pm2 logs --lines 20
```

## Kiểm tra health

```bash
# Backend
curl http://localhost:3001/api/health

# Frontend
curl -I http://localhost:3002
```

