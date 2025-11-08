#!/bin/bash

# Script to fix POS page chunk loading errors
# This script will:
# 1. Clean build artifacts
# 2. Rebuild frontend completely
# 3. Restart frontend service

set -e

echo "🔧 Fixing POS page chunk loading errors..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Get project root directory
PROJECT_ROOT="/home/deploy/Laumamnhatoi-erp"
FRONTEND_DIR="$PROJECT_ROOT/apps/frontend"

if [ ! -d "$PROJECT_ROOT" ]; then
    print_error "Project directory not found: $PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT"

# Step 1: Clean build artifacts
print_status "Cleaning build artifacts..."
cd "$FRONTEND_DIR"

# Remove Next.js build output
rm -rf .next
rm -rf .next/cache
rm -rf tsconfig.tsbuildinfo
rm -rf node_modules/.cache

print_status "Build artifacts cleaned"

# Step 2: Ensure dependencies are installed
print_status "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found, installing dependencies..."
    npm install
else
    print_status "Dependencies already installed"
fi

# Step 3: Rebuild frontend
print_status "Rebuilding frontend..."
npm run build

# Check if build was successful
if [ ! -d ".next" ]; then
    print_error "Build failed - .next directory not found"
    exit 1
fi

# Step 4: Verify POS page chunk exists
print_status "Verifying POS page chunks..."
POS_CHUNKS=$(find .next -name "*pos*page*.js" -type f 2>/dev/null || true)

if [ -z "$POS_CHUNKS" ]; then
    print_warning "POS page chunks not found in build output"
    print_warning "Checking all chunks..."
    find .next -name "*.js" -type f | head -20
else
    print_status "POS page chunks found:"
    echo "$POS_CHUNKS" | head -5
fi

# Step 5: Kill existing frontend process
print_status "Stopping existing frontend process..."
cd "$PROJECT_ROOT"

# Kill process on port 3002
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

# Stop PM2 process
pm2 delete laumam-frontend 2>/dev/null || true

# Wait a moment
sleep 2

# Step 6: Restart frontend with PM2
print_status "Starting frontend with PM2..."
pm2 start ecosystem.config.js --only laumam-frontend
pm2 save

# Wait for frontend to start
sleep 5

# Step 7: Check if frontend is running
print_status "Checking frontend status..."
if pm2 list | grep -q "laumam-frontend.*online"; then
    print_status "Frontend is running"
else
    print_error "Frontend failed to start"
    print_error "Check logs: pm2 logs laumam-frontend"
    exit 1
fi

# Step 8: Test if chunks are accessible
print_status "Testing chunk accessibility..."
sleep 3

# Try to curl a chunk file (if we can find one)
CHUNK_FILE=$(find "$FRONTEND_DIR/.next" -name "*.js" -type f | head -1)
if [ -n "$CHUNK_FILE" ]; then
    CHUNK_PATH=$(echo "$CHUNK_FILE" | sed "s|$FRONTEND_DIR/.next|_next|")
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3002$CHUNK_PATH" || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_status "Chunks are accessible (HTTP $HTTP_CODE)"
    else
        print_warning "Chunk accessibility test returned HTTP $HTTP_CODE"
    fi
fi

print_status "✅ Fix completed!"
print_status "📋 Next steps:"
echo "  1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "  2. Visit: http://36.50.27.82:3002/pos"
echo "  3. Check browser console for any remaining errors"
echo ""
print_status "📊 Check logs: pm2 logs laumam-frontend"

