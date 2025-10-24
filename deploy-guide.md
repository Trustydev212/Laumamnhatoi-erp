# Hướng dẫn Deploy từng bước

## Bước 1: Chuyển sang user deploy và cài đặt Docker

```bash
# Chuyển sang user deploy
su - deploy

# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker deploy
rm get-docker.sh

# Cài đặt Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Cài đặt Nginx
sudo apt update
sudo apt install -y nginx

# Cài đặt Certbot
sudo apt install -y certbot python3-certbot-nginx
```

## Bước 2: Upload code lên VPS

### Cách 1: Sử dụng Git (khuyến nghị)
```bash
# Clone repository
cd /home/deploy
git clone <your-repo-url> nha-toi-erp
cd nha-toi-erp
```

### Cách 2: Upload qua SCP (từ máy local)
```bash
# Từ máy Windows, chạy PowerShell:
scp -r "D:\Projects\Nhà Tôi ERP\*" deploy@your-vps-ip:/home/deploy/nha-toi-erp/
```

## Bước 3: Cấu hình và chạy deploy

```bash
# Di chuyển vào thư mục project
cd /home/deploy/nha-toi-erp

# Cấp quyền thực thi cho script
chmod +x deploy.sh
chmod +x manage.sh

# Chạy script deploy (thay yourdomain.com bằng domain của bạn)
./deploy.sh yourdomain.com admin@yourdomain.com
```

## Bước 4: Kiểm tra sau khi deploy

```bash
# Kiểm tra trạng thái services
./manage.sh status

# Xem logs
./manage.sh logs

# Kiểm tra health
./manage.sh health
```

## Lưu ý quan trọng:

1. **Thay đổi domain**: Thay `yourdomain.com` bằng domain thực tế của bạn
2. **Cấu hình DNS**: Trỏ domain về IP của VPS
3. **Firewall**: Đảm bảo mở port 80, 443, 22
4. **Backup**: Script sẽ tự động tạo backup hàng ngày
