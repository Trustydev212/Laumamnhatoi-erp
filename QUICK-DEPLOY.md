# 🚀 Quick Deploy Guide

## Trên VPS, chạy các lệnh sau:

```bash
# 1. SSH vào VPS
ssh deploy@your-vps-ip

# 2. Vào thư mục project
cd /home/deploy/Laumamnhatoi-erp

# 3. Pull code mới nhất
git pull origin main

# 4. Deploy
./deploy.sh
```

## Script sẽ tự động:

✅ Pull code từ GitHub  
✅ Build backend (chắc chắn thành công)  
✅ Build frontend (có thể fail nhưng không chặn deploy)  
✅ Start services với PM2  
✅ Health checks  

## Sau khi deploy:

```bash
# Kiểm tra status
pm2 status

# Xem logs
pm2 logs

# Test backend
curl http://localhost:3001/api/health
```

## URLs:

- 🌐 Website: http://laumamnhatoi.vn
- 🔧 API: http://laumamnhatoi.vn/api
- 📚 Docs: http://laumamnhatoi.vn/api/docs

## Nếu có lỗi:

```bash
# Xem logs chi tiết
pm2 logs laumam-backend
pm2 logs laumam-frontend

# Restart services
pm2 restart all
```

