#!/bin/bash

# 🧪 Test script cho Nhà Tôi ERP trên local
# Kiểm tra build và khởi động services trước khi deploy lên VPS

set -e  # Exit on any error

echo "🧪 Starting local test for Nhà Tôi ERP..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Navigate to project directory
cd "$(dirname "$0")"
print_status "📁 Working directory: $(pwd)"

# Clean old builds
print_status "🧹 Cleaning old builds..."
rm -rf apps/backend/dist
rm -rf apps/frontend/.next

# Build backend
print_status "🔨 Building backend..."
cd apps/backend
npm run build

if [ ! -f "dist/src/main.js" ]; then
    print_error "Backend build failed - dist/src/main.js not found"
    exit 1
fi

print_success "✅ Backend build completed"

# Build frontend
print_status "🔨 Building frontend..."
cd ../frontend
npm run build

if [ ! -d ".next" ]; then
    print_error "Frontend build failed - .next directory not found"
    exit 1
fi

print_success "✅ Frontend build completed"

# Go back to root
cd "$(dirname "$0")"

# Check if user wants to start services
echo ""
print_status "Do you want to start the services locally? (y/n)"
read -r START_SERVICES

if [ "$START_SERVICES" != "y" ] && [ "$START_SERVICES" != "Y" ]; then
    print_success "🎉 Build test completed successfully!"
    print_status "Builds are ready for deployment."
    exit 0
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warning "⚠️  PM2 not found. Installing PM2 globally..."
    npm install -g pm2
fi

# Stop any existing PM2 processes for this project
print_status "🛑 Stopping existing PM2 processes..."
pm2 delete laumam-backend laumam-frontend 2>/dev/null || true

# Create local ecosystem config
print_status "📝 Creating local ecosystem config..."
LOCAL_ECOSYSTEM=$(cat <<EOF
module.exports = {
  apps: [
    {
      name: "laumam-backend",
      script: "apps/backend/dist/src/main.js",
      cwd: "$(pwd)",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
    },
    {
      name: "laumam-frontend",
      script: "npm",
      args: "run start",
      cwd: "$(pwd)/apps/frontend",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
    }
  ]
};
EOF
)

echo "$LOCAL_ECOSYSTEM" > ecosystem.local.js

# Start services with PM2
print_status "🚀 Starting services with PM2..."
pm2 start ecosystem.local.js

# Wait a moment for services to start
sleep 5

# Check service status
print_status "📊 Checking service status..."
pm2 status

# Test services
print_status "🧪 Testing services..."

# Test backend
BACKEND_URL="http://localhost:3001/api/health"
if curl -s "$BACKEND_URL" > /dev/null; then
    print_success "✅ Backend is responding at $BACKEND_URL"
else
    print_warning "⚠️  Backend health check failed at $BACKEND_URL"
    print_status "Check logs with: pm2 logs laumam-backend"
fi

# Test frontend
FRONTEND_URL="http://localhost:3002"
if curl -s "$FRONTEND_URL" > /dev/null; then
    print_success "✅ Frontend is responding at $FRONTEND_URL"
else
    print_warning "⚠️  Frontend health check failed at $FRONTEND_URL"
    print_status "Check logs with: pm2 logs laumam-frontend"
fi

print_success "🎉 Local test completed!"
print_status "🌐 Backend API: http://localhost:3001"
print_status "🌐 Frontend: http://localhost:3002"
print_status "📚 API Docs: http://localhost:3001/api/docs"
print_status ""
print_status "📋 Useful commands:"
print_status "  - View logs: pm2 logs"
print_status "  - Stop services: pm2 stop all"
print_status "  - Delete services: pm2 delete all"
print_status "  - Restart services: pm2 restart all"

# Show recent logs
print_status ""
print_status "📋 Recent logs:"
pm2 logs --lines 10 --nostream

