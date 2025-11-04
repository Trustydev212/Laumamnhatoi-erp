#!/bin/bash

# Script để kiểm tra và fix lỗi POS page build

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Get project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

print_status "🔍 Kiểm tra POS Page Build"
print_status "================================"

cd apps/frontend

# Check if build exists
if [ ! -d ".next" ]; then
    print_error "❌ Folder .next không tồn tại - cần rebuild!"
    exit 1
fi

print_status "📂 BƯỚC 1: Kiểm tra build output..."

# Find all POS-related files
POS_FILES=$(find .next -name "*pos*" -type f 2>/dev/null)
if [ -n "$POS_FILES" ]; then
    print_success "✅ Tìm thấy các file POS:"
    echo "$POS_FILES" | while read -r file; do
        print_status "   - $file ($(du -h "$file" | cut -f1))"
    done
else
    print_warning "⚠️  Không tìm thấy file POS trong build"
fi

# Check for page chunks
print_status ""
print_status "📦 BƯỚC 2: Kiểm tra page chunks..."
POS_CHUNKS=$(find .next/static/chunks/app/pos -type f 2>/dev/null | head -10)
if [ -n "$POS_CHUNKS" ]; then
    print_success "✅ Tìm thấy page chunks:"
    echo "$POS_CHUNKS" | while read -r file; do
        print_status "   - $file"
        print_status "      Hash: $(basename "$file" | grep -oP 'page-\K[^.]*' || echo 'N/A')"
    done
else
    print_error "❌ Không tìm thấy page chunks cho POS!"
    print_status "   Đường dẫn kiểm tra: .next/static/chunks/app/pos/"
fi

# Check for specific file that browser is requesting
print_status ""
print_status "🔍 BƯỚC 3: Kiểm tra file cụ thể mà browser đang yêu cầu..."
BROWSER_FILE=".next/static/chunks/app/pos/page-6752f73ec0053381.js"
if [ -f "$BROWSER_FILE" ]; then
    print_success "✅ File $BROWSER_FILE tồn tại!"
    print_status "   Kích thước: $(du -h "$BROWSER_FILE" | cut -f1)"
    print_status "   MIME type: $(file -b --mime-type "$BROWSER_FILE")"
else
    print_error "❌ File $BROWSER_FILE KHÔNG tồn tại!"
    print_status "   Đây là lý do tại sao browser nhận được HTML (404 page)"
    
    # Find actual POS page files
    print_status "   Đang tìm file POS page thực tế..."
    ACTUAL_FILES=$(find .next/static/chunks/app/pos -name "page-*.js" -type f 2>/dev/null)
    if [ -n "$ACTUAL_FILES" ]; then
        print_warning "   ⚠️  Hash đã thay đổi! File thực tế:"
        echo "$ACTUAL_FILES" | while read -r file; do
            print_status "      - $file"
            print_status "         Hash mới: $(basename "$file" | grep -oP 'page-\K[^.]*' || echo 'N/A')"
        done
        print_warning ""
        print_warning "   💡 Giải pháp: Cần rebuild lại frontend để tạo hash mới"
    fi
fi

# Check if Next.js can serve the file
print_status ""
print_status "🌐 BƯỚC 4: Kiểm tra Next.js có thể serve file..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/_next/static/chunks/app/pos/page-6752f73ec0053381.js 2>/dev/null | grep -q "200"; then
    print_success "✅ Next.js có thể serve file (status 200)"
    CONTENT_TYPE=$(curl -s -I http://localhost:3002/_next/static/chunks/app/pos/page-6752f73ec0053381.js 2>/dev/null | grep -i "content-type" | cut -d: -f2 | tr -d ' \r\n')
    print_status "   Content-Type: $CONTENT_TYPE"
    if [[ "$CONTENT_TYPE" == *"javascript"* ]]; then
        print_success "✅ Content-Type đúng (JavaScript)"
    else
        print_warning "⚠️  Content-Type không đúng: $CONTENT_TYPE"
    fi
else
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/_next/static/chunks/app/pos/page-6752f73ec0053381.js 2>/dev/null)
    print_error "❌ Next.js không thể serve file (status: $HTTP_CODE)"
    if [ "$HTTP_CODE" = "404" ]; then
        print_error "   File không tồn tại - cần rebuild!"
    elif [ "$HTTP_CODE" = "400" ]; then
        print_error "   Bad Request - có thể do nginx config"
    fi
fi

print_status ""
print_status "📋 TÓM TẮT:"
print_status "   - Nếu file không tồn tại: Chạy ./fix-pos-page.sh để rebuild"
print_status "   - Nếu hash đã thay đổi: Xóa cache browser (Ctrl+Shift+R)"
print_status "   - Nếu vẫn lỗi: Kiểm tra nginx config và reload nginx"

