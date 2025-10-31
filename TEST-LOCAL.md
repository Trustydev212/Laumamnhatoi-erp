# 🧪 Hướng dẫn Test Local Trước Khi Deploy

Tài liệu này hướng dẫn cách test build và chạy ứng dụng trên local trước khi deploy lên VPS.

## 📋 Yêu cầu

- Node.js >= 18.0.0
- npm >= 8.0.0
- PM2 (sẽ được cài đặt tự động nếu chưa có)

## 🚀 Cách Sử Dụng

### Trên Windows (PowerShell)

```powershell
.\test-local.ps1
```

### Trên Linux/Mac hoặc Git Bash (Windows)

```bash
bash test-local.sh
```

### Hoặc dùng npm script

```bash
npm run test:local
```

## 📝 Script sẽ thực hiện

1. ✅ **Clean builds cũ**: Xóa `apps/backend/dist` và `apps/frontend/.next`
2. ✅ **Build backend**: Build NestJS backend
3. ✅ **Build frontend**: Build Next.js frontend
4. ✅ **Kiểm tra build**: Xác minh các file build đã được tạo
5. ✅ **Khởi động services** (nếu bạn chọn 'y'):
   - Backend chạy trên port 3001
   - Frontend chạy trên port 3002
   - Sử dụng PM2 để quản lý processes

## 🔍 Kiểm tra sau khi chạy

Sau khi script hoàn thành, bạn có thể truy cập:

- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health
- **API Docs (Swagger)**: http://localhost:3001/api/docs
- **Frontend**: http://localhost:3002

## 🛠️ Các lệnh hữu ích

### Xem logs
```bash
pm2 logs
# Hoặc xem logs của từng service
pm2 logs laumam-backend
pm2 logs laumam-frontend
```

### Quản lý services
```bash
# Xem trạng thái
pm2 status

# Dừng services
pm2 stop all

# Khởi động lại
pm2 restart all

# Xóa services
pm2 delete all
```

### Chỉ build mà không chạy services
```bash
npm run test:local:build
# hoặc
npm run build
```

## ⚠️ Lưu ý

1. **Environment Variables**: Đảm bảo bạn có file `.env` hoặc `.env.local` với các cấu hình cần thiết cho local development.

2. **Database**: Đảm bảo database đã được setup và có thể kết nối được từ local.

3. **Port conflicts**: Nếu port 3001 hoặc 3002 đang được sử dụng, hãy dừng các service khác hoặc thay đổi port trong ecosystem config.

4. **PM2**: Script sẽ tạo file `ecosystem.local.js` để chạy local. File này sẽ không được commit lên git (thêm vào .gitignore).

## 🔄 So sánh với Deploy Script

| Tính năng | Test Local | Deploy (VPS) |
|-----------|------------|--------------|
| Pull code từ Git | ❌ | ✅ |
| Clean builds | ✅ | ✅ |
| Build backend | ✅ | ✅ |
| Build frontend | ✅ | ✅ |
| Khởi động với PM2 | ✅ (optional) | ✅ |
| Health checks | ✅ | ✅ |
| Chạy production mode | ✅ | ✅ |

## ❓ Troubleshooting

### Backend build failed
- Kiểm tra lỗi trong terminal
- Đảm bảo `npm install` đã chạy đầy đủ
- Kiểm tra TypeScript errors: `npm run lint`

### Frontend build failed
- Kiểm tra lỗi trong terminal
- Kiểm tra Next.js config
- Xóa `.next` folder và build lại

### Services không start được
- Kiểm tra logs: `pm2 logs`
- Kiểm tra port đã được sử dụng: `netstat -ano | findstr :3001` (Windows) hoặc `lsof -i :3001` (Mac/Linux)
- Kiểm tra environment variables

### Health check failed
- Đợi thêm vài giây để services khởi động hoàn toàn
- Kiểm tra logs để xem lỗi cụ thể
- Kiểm tra database connection

## 📚 Tài liệu liên quan

- [Deployment Guide](./DEPLOYMENT-GUIDE.md)
- [Deployment Checklist](./DEPLOYMENT-CHECKLIST.md)

