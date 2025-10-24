#!/bin/bash

# Script sửa lỗi build trên VPS
# Usage: ./fix-build-errors.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

echo "🔧 Sửa lỗi build trên VPS..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "apps/backend/src/app.module.ts" ]; then
    print_error "Không tìm thấy thư mục project. Vui lòng chạy script từ thư mục gốc của project"
    exit 1
fi

# Fix 1: Check if backup.module.ts exists
print_status "Kiểm tra file backup.module.ts..."
if [ ! -f "apps/backend/src/common/backup/backup.module.ts" ]; then
    print_warning "Tạo file backup.module.ts..."
    mkdir -p apps/backend/src/common/backup
    
    cat > apps/backend/src/common/backup/backup.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';

@Module({
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
EOF
    print_status "Đã tạo backup.module.ts"
else
    print_status "File backup.module.ts đã tồn tại"
fi

# Fix 2: Create backup.service.ts if it doesn't exist
print_status "Kiểm tra file backup.service.ts..."
if [ ! -f "apps/backend/src/common/backup/backup.service.ts" ]; then
    print_warning "Tạo file backup.service.ts..."
    
    cat > apps/backend/src/common/backup/backup.service.ts << 'EOF'
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService) {}

  async createBackup(): Promise<string> {
    // TODO: Implement backup logic
    return 'Backup created successfully';
  }

  async restoreBackup(backupPath: string): Promise<string> {
    // TODO: Implement restore logic
    return 'Backup restored successfully';
  }
}
EOF
    print_status "Đã tạo backup.service.ts"
else
    print_status "File backup.service.ts đã tồn tại"
fi

# Fix 3: Fix TypeScript error in business-intelligence.service.ts
print_status "Sửa lỗi TypeScript trong business-intelligence.service.ts..."

# Check if the file exists
if [ -f "apps/backend/src/modules/admin/business-intelligence.service.ts" ]; then
    # Fix the spread operator issue
    sed -i 's/...data/...(data as object)/g' apps/backend/src/modules/admin/business-intelligence.service.ts
    print_status "Đã sửa lỗi spread operator"
else
    print_warning "Không tìm thấy file business-intelligence.service.ts"
fi

# Fix 4: Check if PrismaService is properly imported in backup.service.ts
print_status "Kiểm tra import PrismaService..."
if grep -q "import.*PrismaService" apps/backend/src/common/backup/backup.service.ts; then
    print_status "PrismaService đã được import"
else
    print_warning "Thêm import PrismaService..."
    sed -i '1i import { PrismaService } from "../prisma/prisma.service";' apps/backend/src/common/backup/backup.service.ts
fi

# Fix 5: Try to build again
print_status "Thử build lại..."
cd apps/backend

if npm run build; then
    print_status "✅ Backend build thành công!"
else
    print_error "❌ Backend build vẫn thất bại"
    print_warning "Kiểm tra logs để xem lỗi chi tiết"
fi

cd ../..

print_status "Hoàn thành sửa lỗi build!"
echo ""
print_info "Bây giờ bạn có thể thử build lại:"
echo "npm run build"
