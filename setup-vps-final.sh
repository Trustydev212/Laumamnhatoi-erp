#!/bin/bash

# Final VPS Setup Script for Nhà Tôi ERP
# Complete automated setup for production deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log "🚀 Starting final VPS setup for Nhà Tôi ERP"

# Check if running as deploy user
if [ "$USER" != "deploy" ]; then
    error "This script must be run as 'deploy' user"
fi

# Update system
log "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
log "🔧 Installing essential packages..."
sudo apt install -y curl wget git nginx postgresql postgresql-contrib redis-server

# Install Node.js 18
log "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
log "📦 Installing PM2..."
sudo npm install -g pm2

# Install Docker (optional)
log "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker deploy
rm get-docker.sh

# Install Docker Compose
log "🐳 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Setup PostgreSQL
log "🗄️ Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE USER nhatoi_user WITH PASSWORD '210200';"
sudo -u postgres psql -c "CREATE DATABASE nha_toierp OWNER nhatoi_user;"
sudo -u postgres psql -c "ALTER USER nhatoi_user CREATEDB;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nha_toierp TO nhatoi_user;"

# Setup Redis
log "🔴 Setting up Redis..."
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Clone repository
log "📥 Cloning repository..."
cd /home/deploy
if [ -d "Laumamnhatoi-erp" ]; then
    rm -rf Laumamnhatoi-erp
fi
git clone https://github.com/Trustydev212/Laumamnhatoi-erp.git
cd Laumamnhatoi-erp

# Install dependencies
log "📦 Installing project dependencies..."
npm install

# Setup environment files
log "⚙️ Setting up environment files..."
cp apps/backend/env.production apps/backend/.env
cp apps/frontend/env.production apps/frontend/.env

# Build applications
log "🔨 Building applications..."
npm run build

# Setup database
log "🗄️ Setting up database..."
cd apps/backend
npx prisma generate
npx prisma db push
npx prisma db seed
cd ../..

# Create logs directory
mkdir -p logs

# Setup Nginx
log "🌐 Setting up Nginx..."
sudo cp nginx-production.conf /etc/nginx/sites-available/nhatoi-erp
sudo ln -sf /etc/nginx/sites-available/nhatoi-erp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Setup PM2
log "🔄 Setting up PM2..."
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup | grep -E '^sudo' | bash

# Setup firewall
log "🔥 Setting up firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3001
sudo ufw allow 3002
sudo ufw --force enable

# Create backup directory
mkdir -p /home/deploy/backups

# Make scripts executable
chmod +x deploy.sh
chmod +x quick-deploy.sh

# Health check
log "🏥 Performing health check..."
sleep 10

# Check services
if systemctl is-active --quiet nginx; then
    success "Nginx is running"
else
    error "Nginx is not running"
fi

if systemctl is-active --quiet postgresql; then
    success "PostgreSQL is running"
else
    error "PostgreSQL is not running"
fi

if systemctl is-active --quiet redis-server; then
    success "Redis is running"
else
    error "Redis is not running"
fi

# Check applications
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    success "Backend is running"
else
    error "Backend is not running"
fi

if curl -f http://localhost:3002 > /dev/null 2>&1; then
    success "Frontend is running"
else
    error "Frontend is not running"
fi

# Show final status
success "🎉 VPS setup completed successfully!"
echo ""
echo -e "${GREEN}📋 System Status:${NC}"
pm2 status
echo ""
echo -e "${GREEN}🌐 Application URLs:${NC}"
echo -e "Frontend: ${BLUE}http://36.50.27.82:3002${NC}"
echo -e "Backend API: ${BLUE}http://36.50.27.82:3001${NC}"
echo -e "Admin Dashboard: ${BLUE}http://36.50.27.82:3002/admin${NC}"
echo -e "POS System: ${BLUE}http://36.50.27.82:3002/pos${NC}"
echo ""
echo -e "${GREEN}🔑 Default Login Credentials:${NC}"
echo -e "Admin: ${BLUE}admin / admin123${NC}"
echo -e "Manager: ${BLUE}manager / manager123${NC}"
echo -e "Cashier: ${BLUE}cashier / cashier123${NC}"
echo -e "Kitchen: ${BLUE}kitchen / kitchen123${NC}"
echo ""
echo -e "${GREEN}🛠️ Useful Commands:${NC}"
echo -e "Deploy updates: ${BLUE}./deploy.sh${NC}"
echo -e "Quick deploy: ${BLUE}./quick-deploy.sh${NC}"
echo -e "PM2 status: ${BLUE}pm2 status${NC}"
echo -e "PM2 logs: ${BLUE}pm2 logs${NC}"
echo -e "PM2 restart: ${BLUE}pm2 restart all${NC}"
echo -e "Nginx status: ${BLUE}sudo systemctl status nginx${NC}"
echo -e "Database access: ${BLUE}sudo -u postgres psql nha_toierp${NC}"
echo ""
log "Setup completed at $(date)"
