#!/bin/bash

# Script kiểm tra hệ thống trước khi deploy
# Usage: ./check-system.sh

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

echo "🔍 Kiểm tra hệ thống trước khi deploy..."
echo "================================================"

# Check if running as deploy user
if [ "$USER" != "deploy" ]; then
    print_error "Vui lòng chạy script này với user 'deploy'"
    exit 1
fi

print_status "Đang chạy với user: $USER"

# Check system requirements
echo ""
print_info "1. Kiểm tra yêu cầu hệ thống..."

# Check OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    print_status "OS: $PRETTY_NAME"
else
    print_warning "Không thể xác định OS"
fi

# Check memory
MEMORY_GB=$(free -g | awk 'NR==2{print $2}')
if [ "$MEMORY_GB" -ge 2 ]; then
    print_status "RAM: ${MEMORY_GB}GB (✓ Đủ)"
else
    print_warning "RAM: ${MEMORY_GB}GB (⚠️ Khuyến nghị ít nhất 2GB)"
fi

# Check disk space
DISK_GB=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
if [ "$DISK_GB" -ge 20 ]; then
    print_status "Disk: ${DISK_GB}GB trống (✓ Đủ)"
else
    print_warning "Disk: ${DISK_GB}GB trống (⚠️ Khuyến nghị ít nhất 20GB)"
fi

# Check CPU cores
CPU_CORES=$(nproc)
print_status "CPU: ${CPU_CORES} cores"

# Check network connectivity
echo ""
print_info "2. Kiểm tra kết nối mạng..."

if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    print_status "Kết nối internet: OK"
else
    print_error "Không có kết nối internet"
    exit 1
fi

# Check required packages
echo ""
print_info "3. Kiểm tra các package cần thiết..."

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    print_status "Docker: $DOCKER_VERSION"
    
    # Check if user is in docker group
    if groups | grep -q docker; then
        print_status "User trong docker group: OK"
    else
        print_warning "User chưa trong docker group. Cần logout/login lại"
    fi
else
    print_error "Docker chưa được cài đặt"
    exit 1
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
    print_status "Docker Compose: $COMPOSE_VERSION"
else
    print_error "Docker Compose chưa được cài đặt"
    exit 1
fi

# Check Nginx
if command -v nginx &> /dev/null; then
    NGINX_VERSION=$(nginx -v 2>&1 | cut -d' ' -f3)
    print_status "Nginx: $NGINX_VERSION"
else
    print_error "Nginx chưa được cài đặt"
    exit 1
fi

# Check Certbot
if command -v certbot &> /dev/null; then
    CERTBOT_VERSION=$(certbot --version | cut -d' ' -f2)
    print_status "Certbot: $CERTBOT_VERSION"
else
    print_error "Certbot chưa được cài đặt"
    exit 1
fi

# Check Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    print_status "Git: $GIT_VERSION"
else
    print_warning "Git chưa được cài đặt (cần thiết để clone code)"
fi

# Check curl
if command -v curl &> /dev/null; then
    print_status "curl: OK"
else
    print_error "curl chưa được cài đặt"
    exit 1
fi

# Check sudo access
echo ""
print_info "4. Kiểm tra quyền sudo..."

if sudo -n true 2>/dev/null; then
    print_status "Quyền sudo: OK (không cần password)"
else
    print_warning "Quyền sudo: Cần kiểm tra lại"
fi

# Check firewall
echo ""
print_info "5. Kiểm tra firewall..."

if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status | head -1)
    print_status "UFW: $UFW_STATUS"
else
    print_warning "UFW chưa được cài đặt"
fi

# Check ports
echo ""
print_info "6. Kiểm tra ports..."

# Check if ports are available
for port in 80 443 3000 3001; do
    if netstat -tuln | grep -q ":$port "; then
        print_warning "Port $port đang được sử dụng"
    else
        print_status "Port $port: Available"
    fi
done

# Check project directory
echo ""
print_info "7. Kiểm tra thư mục project..."

if [ -d "/home/deploy/nha-toi-erp" ]; then
    print_status "Thư mục project: /home/deploy/nha-toi-erp (✓ Tồn tại)"
    
    # Check if deploy script exists
    if [ -f "/home/deploy/nha-toi-erp/deploy.sh" ]; then
        print_status "Script deploy: OK"
    else
        print_error "Script deploy.sh không tồn tại"
    fi
    
    # Check if manage script exists
    if [ -f "/home/deploy/nha-toi-erp/manage.sh" ]; then
        print_status "Script manage: OK"
    else
        print_error "Script manage.sh không tồn tại"
    fi
    
    # Check if docker-compose.prod.yml exists
    if [ -f "/home/deploy/nha-toi-erp/docker-compose.prod.yml" ]; then
        print_status "Docker Compose config: OK"
    else
        print_error "docker-compose.prod.yml không tồn tại"
    fi
    
else
    print_warning "Thư mục project chưa tồn tại. Cần upload code trước"
fi

# Check Docker daemon
echo ""
print_info "8. Kiểm tra Docker daemon..."

if sudo systemctl is-active --quiet docker; then
    print_status "Docker daemon: Running"
else
    print_error "Docker daemon không chạy"
    exit 1
fi

# Check Nginx service
if sudo systemctl is-active --quiet nginx; then
    print_status "Nginx service: Running"
else
    print_warning "Nginx service không chạy (sẽ được khởi động khi deploy)"
fi

# Final summary
echo ""
echo "================================================"
print_info "TÓM TẮT KIỂM TRA:"

# Count issues
ISSUES=0

# Check critical issues
if ! command -v docker &> /dev/null; then
    print_error "❌ Docker chưa được cài đặt"
    ISSUES=$((ISSUES + 1))
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "❌ Docker Compose chưa được cài đặt"
    ISSUES=$((ISSUES + 1))
fi

if ! command -v nginx &> /dev/null; then
    print_error "❌ Nginx chưa được cài đặt"
    ISSUES=$((ISSUES + 1))
fi

if ! command -v certbot &> /dev/null; then
    print_error "❌ Certbot chưa được cài đặt"
    ISSUES=$((ISSUES + 1))
fi

if [ ! -d "/home/deploy/nha-toi-erp" ]; then
    print_error "❌ Thư mục project chưa tồn tại"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    print_status "🎉 Hệ thống đã sẵn sàng để deploy!"
    echo ""
    print_info "Bước tiếp theo:"
    echo "1. cd /home/deploy/nha-toi-erp"
    echo "2. chmod +x deploy.sh manage.sh"
    echo "3. ./deploy.sh yourdomain.com admin@yourdomain.com"
else
    print_error "❌ Có $ISSUES vấn đề cần khắc phục trước khi deploy"
    echo ""
    print_info "Các bước cần thực hiện:"
    echo "1. Cài đặt các package còn thiếu"
    echo "2. Upload code lên VPS"
    echo "3. Chạy lại script kiểm tra"
fi

echo ""
print_info "Để chạy script này: ./check-system.sh"
