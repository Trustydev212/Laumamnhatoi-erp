# 🚀 Nhà Tôi ERP - Deployment Guide

## 📋 Tổng quan

Hướng dẫn deploy tự động và chuẩn hóa cho hệ thống Nhà Tôi ERP trên VPS.

## 🎯 Mục tiêu

- ✅ **Deploy cực nhanh** - chỉ 1 lệnh
- ✅ **Chuẩn hóa** - không cần SSH từng lệnh
- ✅ **Tự động hóa** - script hoàn chỉnh
- ✅ **Production ready** - cấu hình tối ưu

## 📁 Cấu trúc file mới

```
Laumamnhatoi-erp/
├── apps/
│   ├── backend/
│   │   ├── env.production          # Environment variables cho backend
│   │   └── package.json            # Scripts chuẩn hóa
│   └── frontend/
│       ├── env.production          # Environment variables cho frontend
│       └── package.json            # Scripts chuẩn hóa
├── ecosystem.config.js             # PM2 configuration
├── nginx-production.conf           # Nginx reverse proxy
├── deploy.sh                      # Script deploy đầy đủ
├── quick-deploy.sh                # Script deploy nhanh
├── setup-vps-final.sh             # Script setup VPS hoàn chỉnh
└── README-DEPLOYMENT.md           # Hướng dẫn này
```

## 🔧 I. Chuẩn hóa Environment Variables

### Backend (.env.production)
```bash
API_PORT=3001
API_HOST=0.0.0.0
DATABASE_URL=postgresql://nhatoi_user:210200@localhost:5432/nha_toierp?schema=public
CORS_ORIGIN=http://36.50.27.82:3002
SOCKET_URL=ws://36.50.27.82:3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
NODE_ENV=production
```

### Frontend (.env.production)
```bash
PORT=3002
NEXT_PUBLIC_API_URL=http://36.50.27.82:3001
NEXT_PUBLIC_WS_URL=ws://36.50.27.82:3001
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

## ⚙️ II. Scripts Package.json

### Backend
```json
{
  "scripts": {
    "start:prod": "node dist/main.js",
    "build": "nest build",
    "dev": "nest start --watch"
  }
}
```

### Frontend
```json
{
  "scripts": {
    "start": "next start -p ${PORT:-3002}",
    "start:prod": "next start -p 3002",
    "build": "next build",
    "dev": "next dev -p 3000"
  }
}
```

## 🧱 III. PM2 Ecosystem Config

### ecosystem.config.js
- **Backend**: Port 3001, auto-restart, logging
- **Frontend**: Port 3002, auto-restart, logging
- **Environment**: Production variables
- **Deploy**: Git-based deployment

## 🌐 IV. Nginx Reverse Proxy

### nginx-production.conf
- **API**: `/api/` → Backend (3001)
- **WebSocket**: `/socket.io/` → Backend (3001)
- **Frontend**: `/` → Frontend (3002)
- **Security**: Headers, compression, caching
- **SSL**: Ready for Let's Encrypt

## 🚀 V. Deployment Scripts

### 1. Setup VPS lần đầu
```bash
# Upload và chạy script setup hoàn chỉnh
chmod +x setup-vps-final.sh
./setup-vps-final.sh
```

### 2. Deploy updates (đầy đủ)
```bash
# Backup, pull, build, restart
./deploy.sh production
```

### 3. Deploy nhanh
```bash
# Pull, build, restart (không backup)
./quick-deploy.sh
```

## 📋 Các bước deploy

### Lần đầu setup VPS:
1. **SSH vào VPS** với user `deploy`
2. **Clone repository**:
   ```bash
   git clone https://github.com/Trustydev212/Laumamnhatoi-erp.git
   cd Laumamnhatoi-erp
   ```
3. **Chạy setup script**:
   ```bash
   chmod +x setup-vps-final.sh
   ./setup-vps-final.sh
   ```

### Deploy updates:
1. **SSH vào VPS**
2. **Chạy deploy script**:
   ```bash
   cd ~/Laumamnhatoi-erp
   ./deploy.sh
   ```

## 🔍 Kiểm tra sau deploy

### URLs:
- **Frontend**: http://36.50.27.82:3002
- **Backend API**: http://36.50.27.82:3001
- **Admin Dashboard**: http://36.50.27.82:3002/admin
- **POS System**: http://36.50.27.82:3002/pos

### Commands:
```bash
# PM2 status
pm2 status

# PM2 logs
pm2 logs

# Nginx status
sudo systemctl status nginx

# Database access
sudo -u postgres psql nha_toierp
```

## 🛠️ Troubleshooting

### PM2 Issues:
```bash
# Restart all
pm2 restart all

# Stop all
pm2 stop all

# Delete all
pm2 delete all

# Start again
pm2 start ecosystem.config.js
```

### Nginx Issues:
```bash
# Test config
sudo nginx -t

# Restart
sudo systemctl restart nginx

# Check logs
sudo tail -f /var/log/nginx/error.log
```

### Database Issues:
```bash
# Reset database
cd apps/backend
npx prisma db push --force-reset
npx prisma db seed
```

## 🔐 Security Notes

1. **Change default passwords** trong database
2. **Update JWT_SECRET** trong production
3. **Setup SSL** với Let's Encrypt
4. **Configure firewall** properly
5. **Regular backups** của database

## 📞 Support

Nếu gặp vấn đề:
1. Check logs: `pm2 logs`
2. Check status: `pm2 status`
3. Check nginx: `sudo systemctl status nginx`
4. Check database: `sudo -u postgres psql nha_toierp`

---

**🎉 Chúc mừng! Bây giờ bạn có thể deploy cực nhanh chỉ với 1 lệnh!**
