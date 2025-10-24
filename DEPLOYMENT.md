# Hướng dẫn Deploy Nhà Tôi ERP lên VPS

## Yêu cầu hệ thống

- Ubuntu 20.04+ hoặc CentOS 8+
- RAM: Tối thiểu 2GB, khuyến nghị 4GB+
- CPU: 2 cores trở lên
- Disk: 20GB trống
- Domain name (tùy chọn)

## Các bước deploy

### 1. Chuẩn bị VPS

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Tạo user mới (khuyến nghị)
sudo adduser deploy
sudo usermod -aG sudo deploy
su - deploy
```

### 2. Upload code lên VPS

```bash
# Clone repository
git clone <your-repo-url> /opt/nha-toi-erp
cd /opt/nha-toi-erp

# Hoặc upload qua SCP
scp -r . user@your-vps:/opt/nha-toi-erp
```

### 3. Chạy script deploy tự động

```bash
# Cấp quyền thực thi
chmod +x deploy.sh

# Chạy deploy (thay yourdomain.com và email của bạn)
./deploy.sh yourdomain.com admin@yourdomain.com
```

### 4. Cấu hình thủ công (nếu cần)

#### Cấu hình environment variables

```bash
# Chỉnh sửa file .env
nano /opt/nha-toi-erp/.env

# Cập nhật các thông tin sau:
# - DATABASE_URL: URL kết nối database
# - JWT_SECRET: Secret key cho JWT (tạo mới)
# - JWT_REFRESH_SECRET: Secret key cho refresh token
# - MOMO_*: Cấu hình thanh toán MoMo
# - SMTP_*: Cấu hình email
```

#### Cấu hình domain

```bash
# Cập nhật domain trong các file:
# - docker-compose.prod.yml
# - nginx.conf
# - env.production
```

### 5. Khởi động services

```bash
# Sử dụng script quản lý
./manage.sh start

# Hoặc sử dụng docker-compose trực tiếp
docker-compose -f docker-compose.prod.yml up -d
```

## Quản lý ứng dụng

### Sử dụng script quản lý

```bash
# Xem trạng thái services
./manage.sh status

# Xem logs
./manage.sh logs

# Theo dõi logs real-time
./manage.sh logs-f

# Khởi động lại services
./manage.sh restart

# Backup database
./manage.sh backup

# Restore database
./manage.sh restore /path/to/backup.sql

# Cập nhật ứng dụng
./manage.sh update

# Kiểm tra sức khỏe hệ thống
./manage.sh health
```

### Quản lý thủ công

```bash
# Xem trạng thái containers
docker-compose -f docker-compose.prod.yml ps

# Xem logs của service cụ thể
docker-compose -f docker-compose.prod.yml logs backend

# Restart service cụ thể
docker-compose -f docker-compose.prod.yml restart backend

# Vào shell của container
docker-compose -f docker-compose.prod.yml exec backend sh

# Vào database shell
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d nha_toi_erp
```

## Monitoring và Logging

### Khởi động monitoring stack

```bash
# Khởi động Prometheus và Grafana
docker-compose -f monitoring.yml up -d

# Truy cập:
# - Prometheus: http://yourdomain.com:9090
# - Grafana: http://yourdomain.com:3001 (admin/admin123)
```

### Xem logs

```bash
# Logs của tất cả services
docker-compose -f docker-compose.prod.yml logs

# Logs của service cụ thể
docker-compose -f docker-compose.prod.yml logs backend

# Logs với timestamp
docker-compose -f docker-compose.prod.yml logs -t

# Theo dõi logs real-time
docker-compose -f docker-compose.prod.yml logs -f
```

## Backup và Restore

### Backup tự động

```bash
# Backup được tạo tự động hàng ngày lúc 2:00 AM
# Backup được lưu tại: /opt/backups/nha-toi-erp/
```

### Backup thủ công

```bash
# Tạo backup ngay lập tức
./manage.sh backup

# Hoặc tạo backup thủ công
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres nha_toi_erp > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore

```bash
# Restore từ backup
./manage.sh restore /path/to/backup.sql

# Hoặc restore thủ công
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d nha_toi_erp < backup.sql
```

## Troubleshooting

### Kiểm tra trạng thái services

```bash
# Kiểm tra health check
curl -f http://localhost/health

# Kiểm tra từng service
curl -f http://localhost:3001/health  # Backend
curl -f http://localhost:3000/health    # Frontend
```

### Xem logs lỗi

```bash
# Logs của tất cả services
docker-compose -f docker-compose.prod.yml logs

# Logs của service cụ thể
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs postgres
```

### Restart services

```bash
# Restart tất cả
./manage.sh restart

# Restart service cụ thể
docker-compose -f docker-compose.prod.yml restart backend
```

### Kiểm tra tài nguyên

```bash
# Xem sử dụng disk
df -h

# Xem sử dụng RAM
free -h

# Xem processes
htop
```

## Cập nhật ứng dụng

### Cập nhật tự động

```bash
# Sử dụng script quản lý
./manage.sh update
```

### Cập nhật thủ công

```bash
# Pull code mới
git pull origin main

# Rebuild và restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

## Bảo mật

### Firewall

```bash
# Kiểm tra firewall
sudo ufw status

# Mở port cần thiết
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
```

### SSL Certificate

```bash
# Renew certificate
sudo certbot renew

# Kiểm tra auto-renewal
sudo crontab -l
```

### Backup security

```bash
# Backup được mã hóa (nếu cần)
gpg --symmetric --cipher-algo AES256 backup.sql
```

## Liên hệ hỗ trợ

Nếu gặp vấn đề trong quá trình deploy, vui lòng:

1. Kiểm tra logs: `./manage.sh logs`
2. Kiểm tra health: `./manage.sh health`
3. Tạo issue trên GitHub với thông tin lỗi chi tiết
