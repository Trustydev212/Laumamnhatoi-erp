# 🚀 DEPLOYMENT GUIDE - Nhà Tôi ERP với VietQR Printer

## 📋 Tổng quan

Hệ thống ERP đã được tích hợp hoàn chỉnh với VietQR Printer, sẵn sàng deploy lên VPS.

## ✅ Kiểm tra trước deploy

### 1. Build thành công
- ✅ Backend build: `npm run build` (apps/backend)
- ✅ Frontend build: `npm run build` (apps/frontend)
- ✅ TypeScript errors đã được sửa
- ✅ VietQR integration hoàn chỉnh

### 2. Cấu hình production
- ✅ `apps/backend/env.production` - CORS domain, database
- ✅ `apps/frontend/env.production` - API URL qua Nginx proxy
- ✅ `nginx-production.conf` - Reverse proxy setup
- ✅ `ecosystem.config.js` - PM2 configuration

## 🖥️ VPS Requirements

### Hệ thống
- Ubuntu 20.04+ / Debian 11+
- Node.js 18+ (recommend 20+)
- npm 8+
- PM2 globally installed
- Nginx
- PostgreSQL 13+

### Dependencies
```bash
# Node.js & npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# Nginx
sudo apt install nginx

# PostgreSQL
sudo apt install postgresql postgresql-contrib

# ESC/POS USB support
sudo apt install -y libusb-1.0-0 libusb-1.0-0-dev
```

## 🚀 Deploy Commands

### 1. Setup VPS (chỉ chạy lần đầu)
```bash
# Clone repository
cd /home/deploy
git clone https://github.com/your-repo/Laumamnhatoi-erp.git
cd Laumamnhatoi-erp

# Install dependencies
npm install
cd apps/backend && npm install
cd ../frontend && npm install
cd ../..

# Setup environment
cp apps/backend/env.production apps/backend/.env
cp apps/frontend/env.production apps/frontend/.env

# Setup Nginx
sudo cp nginx-production.conf /etc/nginx/sites-available/nhatoi-erp
sudo ln -s /etc/nginx/sites-available/nhatoi-erp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Setup database
sudo -u postgres createdb nha_toierp
sudo -u postgres createuser nhatoi_user
sudo -u postgres psql -c "ALTER USER nhatoi_user PASSWORD '210200';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nha_toierp TO nhatoi_user;"

# Run migrations
cd apps/backend
npm run db:push
npm run db:seed
cd ../..
```

### 2. Deploy (mỗi lần update)
```bash
# Chạy script deploy tự động
chmod +x quick-deploy.sh
./quick-deploy.sh
```

### 3. Manual Deploy
```bash
# Pull latest code
git pull origin main

# Build
npm run build

# Restart services
pm2 restart all
```

## 🔧 Cấu hình quan trọng

### Domain & SSL
- Domain: `laumamnhatoi.vn`
- IP: `36.50.27.82`
- SSL: Cần cấu hình Let's Encrypt sau khi deploy

### Database
- Host: localhost
- Port: 5432
- Database: nha_toierp
- User: nhatoi_user
- Password: 210200

### VietQR Configuration
- Bank: Vietcombank (970436)
- Account: 0123456789
- Name: LAU MAM NHA TOI

## 🧪 Testing sau deploy

### 1. Health Checks
```bash
# Backend health
curl http://laumamnhatoi.vn/api/health

# Frontend
curl http://laumamnhatoi.vn

# VietQR test
curl http://laumamnhatoi.vn/api/printer/vietqr/test
```

### 2. Web Testing
- Website: http://laumamnhatoi.vn
- POS: http://laumamnhatoi.vn/pos
- VietQR Test: http://laumamnhatoi.vn/vietqr-test
- API Docs: http://laumamnhatoi.vn/api/docs

### 3. VietQR Printer Test
1. Truy cập POS
2. Tạo đơn hàng test
3. Click "🧾 In VietQR (QR Bank)"
4. Kiểm tra máy in Xprinter T80L

## 🖨️ Máy in Xprinter T80L

### USB Connection
```bash
# Check USB device
lsusb | grep printer

# Check permissions
ls -la /dev/usb/

# Add user to printer group
sudo usermod -a -G lp deploy
```

### LAN Connection
- IP: 192.168.1.100 (example)
- Port: 9100
- Update `apps/backend/src/services/vietqr-printer.service.ts`

## 📊 Monitoring

### PM2 Commands
```bash
pm2 status          # Check status
pm2 logs            # View logs
pm2 monit           # Monitor dashboard
pm2 restart all     # Restart all
pm2 stop all        # Stop all
```

### Nginx Commands
```bash
sudo nginx -t       # Test config
sudo systemctl reload nginx
sudo systemctl status nginx
```

### Database Commands
```bash
sudo -u postgres psql nha_toierp
\dt                 # List tables
\q                  # Quit
```

## 🚨 Troubleshooting

### Common Issues

1. **CORS Error**
   - Check `CORS_ORIGIN` in backend .env
   - Ensure frontend uses `/api` baseURL

2. **Database Connection**
   - Check PostgreSQL service: `sudo systemctl status postgresql`
   - Verify credentials in .env

3. **Printer Not Working**
   - Check USB permissions
   - Test with LAN connection
   - Verify ESC/POS commands

4. **Build Failures**
   - Check Node.js version
   - Clear node_modules and reinstall
   - Check TypeScript errors

### Logs Location
- PM2 logs: `~/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`
- System logs: `journalctl -u nginx`

## 🔐 Security

### Firewall
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### SSL Setup (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d laumamnhatoi.vn -d www.laumamnhatoi.vn
```

## 📈 Performance

### Optimization
- Enable Nginx gzip
- Use PM2 cluster mode
- Database indexing
- Redis caching (optional)

### Monitoring
- PM2 monitoring
- Nginx access logs
- Database performance
- Memory usage

---

## 🎉 Kết quả cuối cùng

Sau khi deploy thành công, bạn sẽ có:

✅ **Website hoàn chỉnh**: http://laumamnhatoi.vn
✅ **POS System**: Tạo đơn hàng, quản lý bàn
✅ **VietQR Printer**: In hóa đơn với QR thanh toán động
✅ **Admin Panel**: Quản lý menu, khách hàng, báo cáo
✅ **API Documentation**: Swagger UI
✅ **Real-time Updates**: WebSocket integration

**Hệ thống sẵn sàng phục vụ khách hàng!** 🚀
