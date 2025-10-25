#!/bin/bash

# Script setup hoàn chỉnh cho VPS
# Usage: ./setup-vps-complete.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

echo "🚀 Setup hoàn chỉnh ERP trên VPS..."
echo "================================================"

# Variables
VPS_IP="36.50.27.82"
DB_USER="nhatoi_user"
DB_PASS="210200"
DB_NAME="nha_toierp"
PROJECT_DIR="~/Laumamnhatoi-erp"

# 1. Update system
print_status "Cập nhật hệ thống..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js
print_status "Cài đặt Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PostgreSQL
print_status "Cài đặt PostgreSQL..."
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 4. Setup Database
print_status "Setup database..."
sudo -u postgres psql << EOF
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
ALTER USER ${DB_USER} CREATEDB;
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\q
EOF

# 5. Install Redis
print_status "Cài đặt Redis..."
sudo apt install redis-server -y
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 6. Install PM2
print_status "Cài đặt PM2..."
sudo npm install -g pm2

# 7. Install Nginx
print_status "Cài đặt Nginx..."
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# 8. Install Certbot for SSL
print_status "Cài đặt Certbot..."
sudo apt install certbot python3-certbot-nginx -y

# 9. Clone project
print_status "Clone project..."
cd ~
if [ -d "Laumamnhatoi-erp" ]; then
    print_warning "Xóa project cũ..."
    rm -rf Laumamnhatoi-erp
fi

git clone https://github.com/Trustydev212/Laumamnhatoi-erp.git
cd Laumamnhatoi-erp

# 10. Install dependencies
print_status "Cài đặt dependencies..."
npm install

# 11. Create .env file
print_status "Tạo file .env..."
cat > .env << EOF
# Database
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="nhatoi-super-secret-jwt-key-$(date +%s)"
JWT_REFRESH_SECRET="nhatoi-super-secret-refresh-key-$(date +%s)"

# API
API_PORT=3001
API_HOST=0.0.0.0
CORS_ORIGIN="http://${VPS_IP}:3002"

# Frontend
NEXT_PUBLIC_API_URL="http://${VPS_IP}:3001"
NEXT_PUBLIC_WS_URL="ws://${VPS_IP}:3001"

# MOMO (optional)
MOMO_PARTNER_CODE=""
MOMO_ACCESS_KEY=""
MOMO_SECRET_KEY=""

# SMS (optional)
SMS_API_KEY=""
SMS_SECRET_KEY=""

# SMTP (optional)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""

# Backup (optional)
BACKUP_S3_BUCKET=""
BACKUP_S3_ACCESS_KEY=""
BACKUP_S3_SECRET_KEY=""

# Bcrypt
BCRYPT_ROUNDS=12

# Rate Limit
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100
EOF

# 12. Setup Prisma
print_status "Setup Prisma..."
cd apps/backend
npx prisma generate
npx prisma db push

# 13. Seed database
print_status "Seed database..."
npx prisma db seed

# 14. Build project
print_status "Build project..."
cd ~/Laumamnhatoi-erp
npm run build

# 15. Create ecosystem.config.js
print_status "Tạo PM2 config..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'nhatoi-erp',
      script: 'npm',
      args: 'run start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# 16. Setup Nginx
print_status "Setup Nginx..."
sudo tee /etc/nginx/sites-available/nhatoi-erp << EOF
server {
    listen 80;
    server_name ${VPS_IP};

    # Frontend
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/nhatoi-erp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 17. Setup firewall
print_status "Setup firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# 18. Start application
print_status "Khởi động ứng dụng..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 19. Setup SSL (optional)
print_info "Bạn có muốn setup SSL với Let's Encrypt không? (y/n)"
read -r setup_ssl
if [ "$setup_ssl" = "y" ]; then
    print_status "Setup SSL..."
    sudo certbot --nginx -d ${VPS_IP}
fi

# 20. Create management scripts
print_status "Tạo script quản lý..."

# Start script
cat > start.sh << 'EOF'
#!/bin/bash
cd ~/Laumamnhatoi-erp
pm2 start ecosystem.config.js
echo "✅ Ứng dụng đã khởi động!"
EOF

# Stop script
cat > stop.sh << 'EOF'
#!/bin/bash
pm2 stop nhatoi-erp
echo "⏹️ Ứng dụng đã dừng!"
EOF

# Restart script
cat > restart.sh << 'EOF'
#!/bin/bash
pm2 restart nhatoi-erp
echo "🔄 Ứng dụng đã khởi động lại!"
EOF

# Logs script
cat > logs.sh << 'EOF'
#!/bin/bash
pm2 logs nhatoi-erp
EOF

# Status script
cat > status.sh << 'EOF'
#!/bin/bash
pm2 status
echo ""
echo "🌐 Frontend: http://36.50.27.82:3002"
echo "🔧 Backend: http://36.50.27.82:3001"
echo "📚 API Docs: http://36.50.27.82:3001/api/docs"
EOF

# Make scripts executable
chmod +x *.sh

# 21. Final checks
print_status "Kiểm tra cuối cùng..."

# Check if services are running
if systemctl is-active --quiet postgresql; then
    print_status "PostgreSQL: ✅ Running"
else
    print_error "PostgreSQL: ❌ Not running"
fi

if systemctl is-active --quiet redis-server; then
    print_status "Redis: ✅ Running"
else
    print_error "Redis: ❌ Not running"
fi

if systemctl is-active --quiet nginx; then
    print_status "Nginx: ✅ Running"
else
    print_error "Nginx: ❌ Not running"
fi

if pm2 list | grep -q "nhatoi-erp.*online"; then
    print_status "Application: ✅ Running"
else
    print_error "Application: ❌ Not running"
fi

# 22. Display final information
echo ""
echo "🎉 Setup hoàn tất!"
echo "================================================"
echo "🌐 Frontend: http://${VPS_IP}:3002"
echo "🔧 Backend: http://${VPS_IP}:3001"
echo "📚 API Docs: http://${VPS_IP}:3001/api/docs"
echo "🗄️ Database: PostgreSQL (localhost:5432)"
echo "📊 Redis: localhost:6379"
echo ""
echo "📋 Scripts quản lý:"
echo "• ./start.sh - Khởi động ứng dụng"
echo "• ./stop.sh - Dừng ứng dụng"
echo "• ./restart.sh - Khởi động lại ứng dụng"
echo "• ./logs.sh - Xem logs"
echo "• ./status.sh - Kiểm tra trạng thái"
echo ""
echo "🔧 Quản lý database:"
echo "• cd apps/backend && npx prisma studio"
echo "• cd apps/backend && npx prisma db push"
echo "• cd apps/backend && npx prisma db seed"
echo ""
print_warning "⚠️ Lưu ý:"
echo "• Đảm bảo firewall đã mở port 80, 443"
echo "• Kiểm tra logs nếu có lỗi: pm2 logs nhatoi-erp"
echo "• Backup database thường xuyên"
echo ""
print_info "🎯 Truy cập ứng dụng: http://${VPS_IP}:3002"
