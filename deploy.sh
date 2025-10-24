#!/bin/bash

# Nhà Tôi ERP - Production Deployment Script
# Usage: ./deploy.sh [domain] [email]

set -e

DOMAIN=${1:-"yourdomain.com"}
EMAIL=${2:-"admin@yourdomain.com"}
PROJECT_NAME="nha-toi-erp"

echo "🚀 Starting deployment for $DOMAIN..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    print_status "Installing Nginx..."
    sudo apt install -y nginx
fi

# Install Certbot for SSL
if ! command -v certbot &> /dev/null; then
    print_status "Installing Certbot..."
    sudo apt install -y certbot python3-certbot-nginx
fi

# Create project directory
PROJECT_DIR="/opt/$PROJECT_NAME"
print_status "Creating project directory at $PROJECT_DIR..."
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Copy project files
print_status "Copying project files..."
cp -r . $PROJECT_DIR/
cd $PROJECT_DIR

# Update docker-compose.prod.yml with domain
print_status "Updating production configuration..."
sed -i "s/yourdomain.com/$DOMAIN/g" docker-compose.prod.yml
sed -i "s/yourdomain.com/$DOMAIN/g" nginx.conf
sed -i "s/yourdomain.com/$DOMAIN/g" env.production

# Generate secure passwords
print_status "Generating secure passwords..."
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)

# Update environment variables
sed -i "s/your_secure_password/$DB_PASSWORD/g" env.production
sed -i "s/your-super-secret-jwt-key-change-in-production-.*/$JWT_SECRET/g" env.production
sed -i "s/your-super-secret-refresh-key-change-in-production-.*/$JWT_REFRESH_SECRET/g" env.production

# Create .env file
cp env.production .env

# Build and start services
print_status "Building and starting services..."
docker-compose -f docker-compose.prod.yml down --remove-orphans
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Setup Nginx
print_status "Configuring Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/$PROJECT_NAME
sudo ln -sf /etc/nginx/sites-available/$PROJECT_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with Let's Encrypt
print_status "Setting up SSL certificate..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive

# Setup automatic renewal
print_status "Setting up SSL auto-renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Setup log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/$PROJECT_NAME > /dev/null <<EOF
/var/log/$PROJECT_NAME/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF

# Create systemd service for auto-start
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/$PROJECT_NAME.service > /dev/null <<EOF
[Unit]
Description=Nhà Tôi ERP Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable $PROJECT_NAME

# Setup firewall
print_status "Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Create backup script
print_status "Creating backup script..."
tee backup.sh > /dev/null <<EOF
#!/bin/bash
BACKUP_DIR="/opt/backups/$PROJECT_NAME"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

# Database backup
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres nha_toi_erp > \$BACKUP_DIR/db_\$DATE.sql

# Keep only last 7 days of backups
find \$BACKUP_DIR -name "db_*.sql" -mtime +7 -delete

echo "Backup completed: \$BACKUP_DIR/db_\$DATE.sql"
EOF

chmod +x backup.sh

# Setup daily backup
(crontab -l 2>/dev/null; echo "0 2 * * * $PROJECT_DIR/backup.sh") | crontab -

# Create monitoring script
print_status "Creating monitoring script..."
tee monitor.sh > /dev/null <<EOF
#!/bin/bash
# Simple health check script

# Check if containers are running
if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "ERROR: Some containers are not running"
    docker-compose -f docker-compose.prod.yml ps
    exit 1
fi

# Check if services are responding
if ! curl -f http://localhost/health > /dev/null 2>&1; then
    echo "ERROR: Health check failed"
    exit 1
fi

echo "All services are healthy"
EOF

chmod +x monitor.sh

# Final status check
print_status "Performing final health check..."
sleep 10

if curl -f https://$DOMAIN/health > /dev/null 2>&1; then
    print_status "✅ Deployment completed successfully!"
    print_status "🌐 Your application is available at: https://$DOMAIN"
    print_status "📊 Monitor logs with: docker-compose -f docker-compose.prod.yml logs -f"
    print_status "🔄 Restart services with: sudo systemctl restart $PROJECT_NAME"
    print_status "💾 Backup database with: ./backup.sh"
else
    print_warning "⚠️  Deployment completed but health check failed"
    print_status "Check logs with: docker-compose -f docker-compose.prod.yml logs"
fi

print_status "🔐 Important: Update your environment variables in $PROJECT_DIR/.env"
print_status "📝 Don't forget to configure your payment and email settings!"
