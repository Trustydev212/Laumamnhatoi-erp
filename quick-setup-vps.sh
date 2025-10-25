#!/bin/bash

# Script setup nhanh cho VPS
# Usage: ./quick-setup-vps.sh

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

echo "⚡ Quick Setup ERP trên VPS..."
echo "================================================"

# Variables
VPS_IP="36.50.27.82"
DB_USER="nhatoi_user"
DB_PASS="210200"
DB_NAME="nha_toierp"

# 1. Update system
print_status "Cập nhật hệ thống..."
sudo apt update

# 2. Install essential packages
print_status "Cài đặt packages cần thiết..."
sudo apt install -y curl wget git nginx postgresql postgresql-contrib redis-server

# 3. Install Node.js
print_status "Cài đặt Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Install PM2
print_status "Cài đặt PM2..."
sudo npm install -g pm2

# 5. Start services
print_status "Khởi động services..."
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl start redis-server
sudo systemctl enable redis-server
sudo systemctl start nginx
sudo systemctl enable nginx

# 6. Setup database
print_status "Setup database..."
sudo -u postgres psql << EOF
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
ALTER USER ${DB_USER} CREATEDB;
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\q
EOF

# 7. Clone and setup project
print_status "Setup project..."
cd ~
if [ -d "Laumamnhatoi-erp" ]; then
    print_warning "Xóa project cũ..."
    rm -rf Laumamnhatoi-erp
fi

git clone https://github.com/Trustydev212/Laumamnhatoi-erp.git
cd Laumamnhatoi-erp

# 8. Install dependencies
print_status "Cài đặt dependencies..."
npm install

# 9. Create .env
print_status "Tạo file .env..."
cat > .env << EOF
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="nhatoi-super-secret-jwt-key-$(date +%s)"
JWT_REFRESH_SECRET="nhatoi-super-secret-refresh-key-$(date +%s)"
API_PORT=3001
API_HOST=0.0.0.0
CORS_ORIGIN="http://${VPS_IP}:3002"
NEXT_PUBLIC_API_URL="http://${VPS_IP}:3001"
NEXT_PUBLIC_WS_URL="ws://${VPS_IP}:3001"
BCRYPT_ROUNDS=12
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100
EOF

# 10. Setup Prisma
print_status "Setup Prisma..."
cd apps/backend
npx prisma generate
npx prisma db push
npx prisma db seed

# 11. Build project
print_status "Build project..."
cd ~/Laumamnhatoi-erp
npm run build

# 12. Create PM2 config
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

# 13. Setup Nginx
print_status "Setup Nginx..."
sudo tee /etc/nginx/sites-available/nhatoi-erp << EOF
server {
    listen 80;
    server_name ${VPS_IP};

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

sudo ln -sf /etc/nginx/sites-available/nhatoi-erp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 14. Setup firewall
print_status "Setup firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# 15. Start application
print_status "Khởi động ứng dụng..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 16. Create management scripts
print_status "Tạo scripts quản lý..."

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

# Database management script
cat > manage-db.sh << 'EOF'
#!/bin/bash
cd ~/Laumamnhatoi-erp/apps/backend
case "$1" in
    "studio")
        npx prisma studio
        ;;
    "seed")
        npx prisma db seed
        ;;
    "push")
        npx prisma db push
        ;;
    "reset")
        npx prisma db push --force-reset
        npx prisma db seed
        ;;
    *)
        echo "Database Management:"
        echo "  ./manage-db.sh studio - Open Prisma Studio"
        echo "  ./manage-db.sh seed - Seed database"
        echo "  ./manage-db.sh push - Push schema"
        echo "  ./manage-db.sh reset - Reset database"
        ;;
esac
EOF

# Make scripts executable
chmod +x *.sh

# 17. Final checks
print_status "Kiểm tra cuối cùng..."

# Check services
if systemctl is-active --quiet postgresql; then
    print_status "PostgreSQL: ✅"
else
    print_error "PostgreSQL: ❌"
fi

if systemctl is-active --quiet redis-server; then
    print_status "Redis: ✅"
else
    print_error "Redis: ❌"
fi

if systemctl is-active --quiet nginx; then
    print_status "Nginx: ✅"
else
    print_error "Nginx: ❌"
fi

if pm2 list | grep -q "nhatoi-erp.*online"; then
    print_status "Application: ✅"
else
    print_error "Application: ❌"
fi

# 18. Display final information
echo ""
echo "🎉 Quick Setup hoàn tất!"
echo "================================================"
echo "🌐 Frontend: http://${VPS_IP}:3002"
echo "🔧 Backend: http://${VPS_IP}:3001"
echo "📚 API Docs: http://${VPS_IP}:3001/api/docs"
echo ""
echo "📋 Scripts quản lý:"
echo "• ./start.sh - Khởi động"
echo "• ./stop.sh - Dừng"
echo "• ./restart.sh - Khởi động lại"
echo "• ./logs.sh - Xem logs"
echo "• ./status.sh - Trạng thái"
echo "• ./manage-db.sh studio - Prisma Studio"
echo ""
print_info "🎯 Truy cập: http://${VPS_IP}:3002"
