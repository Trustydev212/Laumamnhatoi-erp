# 🚀 Hướng dẫn Deploy lên VPS

## Bước 1: SSH vào VPS

```bash
ssh deploy@your-vps-ip
# hoặc
ssh deploy@laumamnhatoi.vn
```

## Bước 2: Navigate đến project directory

```bash
cd /home/deploy/Laumamnhatoi-erp
```

## Bước 3: Pull code mới nhất từ Git

```bash
git pull origin main
```

## Bước 4: Chạy deploy script

```bash
./deploy.sh
```

## Script sẽ tự động:

1. ✅ **Pull code mới nhất** từ GitHub
2. ✅ **Clean builds cũ** (backend/dist, frontend/.next)
3. ✅ **Build backend** (NestJS)
   - Nếu fail → Script sẽ dừng (backend bắt buộc)
4. ✅ **Build frontend** (Next.js)
   - Nếu fail → Cảnh báo nhưng vẫn tiếp tục
   - Backend vẫn được deploy
5. ✅ **Stop services cũ** (PM2)
6. ✅ **Start services mới** với PM2
   - Chỉ start backend nếu frontend build fail
   - Start cả 2 nếu thành công
7. ✅ **Health checks** cho cả 2 services
8. ✅ **Hiển thị logs** và status

## Kết quả mong đợi:

### Trường hợp tốt nhất:
- ✅ Backend: Hoạt động trên port 3001
- ✅ Frontend: Hoạt động trên port 3002
- ✅ Cả 2 services online

### Trường hợp frontend build fail:
- ✅ Backend: Vẫn hoạt động bình thường
- ⚠️ Frontend: Không được deploy (sẽ báo cảnh báo)
- ✅ Script vẫn hoàn thành thành công

## Kiểm tra sau khi deploy:

```bash
# Xem status services
pm2 status

# Xem logs
pm2 logs

# Test backend
curl http://localhost:3001/api/health

# Test frontend (nếu đã deploy)
curl http://localhost:3002
```

## URLs sau khi deploy:

- 🌐 **Website**: http://laumamnhatoi.vn
- 🔧 **Backend API**: http://laumamnhatoi.vn/api
- 📚 **API Docs**: http://laumamnhatoi.vn/api/docs

## Troubleshooting:

### Frontend build fail:
```bash
# Xem logs chi tiết
cd apps/frontend
npm run build

# Hoặc xem PM2 logs
pm2 logs laumam-frontend
```

### Backend không start:
```bash
# Check logs
pm2 logs laumam-backend

# Check port
netstat -tulpn | grep 3001
```

### Restart services:
```bash
pm2 restart all
# hoặc
pm2 restart laumam-backend
pm2 restart laumam-frontend
```

## Rollback (nếu cần):

```bash
# Xem commit history
git log --oneline -10

# Rollback về commit trước
git reset --hard HEAD~1
./deploy.sh
```

