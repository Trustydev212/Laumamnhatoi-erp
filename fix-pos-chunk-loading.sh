#!/bin/bash

# Script để fix lỗi ChunkLoadError của POS page
# Lỗi: page-6752f73ec0053381.js trả về 400 Bad Request và MIME type sai

set -e

echo "🔧 Fixing POS ChunkLoadError..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
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

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/apps/frontend"

if [ ! -d "$FRONTEND_DIR" ]; then
    print_error "Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

cd "$FRONTEND_DIR"

# Step 1: Stop frontend process
print_info "Stopping frontend process..."
pm2 delete laumam-frontend 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
sleep 2
print_status "Frontend stopped"

# Step 2: Clean build artifacts
print_info "Cleaning build artifacts..."
rm -rf .next
rm -rf .next/cache
rm -rf tsconfig.tsbuildinfo
rm -rf node_modules/.cache
rm -rf .turbo
print_status "Build artifacts cleaned"

# Step 3: Verify POS page exists
print_info "Checking POS page source..."
if [ ! -f "src/app/pos/page.tsx" ]; then
    print_error "POS page not found: src/app/pos/page.tsx"
    exit 1
fi
print_status "POS page source exists"

# Step 4: Rebuild frontend
print_info "Rebuilding frontend (this may take a few minutes)..."
npm run build

# Check if build was successful
if [ ! -d ".next" ]; then
    print_error "Build failed - .next directory not found"
    exit 1
fi

# Step 5: Verify POS page chunk exists
print_info "Verifying POS page chunks..."
POS_CHUNKS=$(find .next -name "*pos*page*.js" -type f 2>/dev/null || true)

if [ -z "$POS_CHUNKS" ]; then
    print_warning "POS page chunks not found in build output"
    print_warning "Checking all chunks..."
    find .next -name "*.js" -type f | head -20
    print_error "Build may have failed - POS chunks not generated"
    exit 1
else
    print_status "POS page chunks found:"
    echo "$POS_CHUNKS" | head -5 | while read chunk; do
        echo "  - $chunk ($(du -h "$chunk" | cut -f1))"
    done
fi

# Step 6: Check chunk file integrity
print_info "Checking chunk file integrity..."
for chunk in $(echo "$POS_CHUNKS" | head -3); do
    if [ -f "$chunk" ]; then
        # Check if file is valid JavaScript (starts with valid JS)
        if head -1 "$chunk" | grep -qE "(^\/\*|^\/\/|^\(function|^!function|^var |^const |^let |^export)" || file "$chunk" | grep -q "JavaScript"; then
            print_status "Chunk file is valid: $(basename $chunk)"
        else
            print_warning "Chunk file may be corrupted: $(basename $chunk)"
            print_warning "File type: $(file "$chunk")"
        fi
    fi
done

# Step 7: Restart frontend
print_info "Starting frontend with PM2..."
cd "$PROJECT_ROOT"
pm2 start ecosystem.config.js --only laumam-frontend
pm2 save

# Wait for frontend to start
sleep 5

# Step 8: Check if frontend is running
print_info "Checking frontend status..."
if pm2 list | grep -q "laumam-frontend.*online"; then
    print_status "Frontend is running"
else
    print_error "Frontend failed to start"
    print_error "Check logs: pm2 logs laumam-frontend"
    exit 1
fi

# Step 9: Test chunk accessibility
print_info "Testing chunk accessibility..."
sleep 3

# Try to find a POS chunk and test it
CHUNK_FILE=$(find "$FRONTEND_DIR/.next" -name "*pos*page*.js" -type f | head -1)
if [ -n "$CHUNK_FILE" ]; then
    # Get relative path from .next
    CHUNK_REL_PATH=$(echo "$CHUNK_FILE" | sed "s|$FRONTEND_DIR/.next|_next|")
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3002$CHUNK_REL_PATH" || echo "000")
    CONTENT_TYPE=$(curl -s -I "http://localhost:3002$CHUNK_REL_PATH" 2>/dev/null | grep -i "content-type" | cut -d: -f2 | tr -d ' \r\n' || echo "unknown")
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_status "Chunk is accessible (HTTP $HTTP_CODE)"
        if echo "$CONTENT_TYPE" | grep -qi "javascript\|application/javascript\|text/javascript"; then
            print_status "Content-Type is correct: $CONTENT_TYPE"
        else
            print_warning "Content-Type may be wrong: $CONTENT_TYPE (expected JavaScript)"
        fi
    else
        print_error "Chunk accessibility test returned HTTP $HTTP_CODE"
        print_error "Content-Type: $CONTENT_TYPE"
        print_warning "This may indicate a server configuration issue"
    fi
fi

print_status "✅ Fix completed!"
echo ""
print_info "📋 Next steps:"
echo "  1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "  2. Visit: http://36.50.27.82:3002/pos"
echo "  3. Open browser DevTools (F12) → Console tab"
echo "  4. Check if ChunkLoadError is gone"
echo "  5. If still error, check Network tab for failed requests"
echo ""
print_info "📊 Check logs: pm2 logs laumam-frontend"
print_info "🔍 Check build output: ls -lh apps/frontend/.next/static/chunks/app/pos/"

