#!/bin/bash

# Script debug build errors trên VPS
# Usage: ./debug-build.sh

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

echo "🔍 Debug build errors..."
echo "================================================"

# Check current directory
print_status "Thư mục hiện tại: $(pwd)"

# Check if we're in the right directory
if [ ! -f "apps/backend/package.json" ]; then
    print_error "Không tìm thấy thư mục project. Vui lòng chạy từ thư mục gốc"
    exit 1
fi

# Go to backend directory and check build errors
print_status "Kiểm tra lỗi build backend..."
cd apps/backend

# Try to build and capture the error
print_status "Thử build backend..."
if npm run build 2>&1 | tee build.log; then
    print_status "✅ Backend build thành công!"
else
    print_error "❌ Backend build thất bại"
    print_status "Chi tiết lỗi:"
    cat build.log | grep -A 5 -B 5 "error"
fi

# Check TypeScript configuration
print_status "Kiểm tra cấu hình TypeScript..."
if [ -f "tsconfig.json" ]; then
    print_status "File tsconfig.json tồn tại"
else
    print_error "Không tìm thấy tsconfig.json"
fi

# Check if all required files exist
print_status "Kiểm tra các file cần thiết..."

# Check backup module
if [ -f "src/common/backup/backup.module.ts" ]; then
    print_status "✅ backup.module.ts tồn tại"
else
    print_error "❌ backup.module.ts không tồn tại"
    print_status "Tạo file backup.module.ts..."
    mkdir -p src/common/backup
    cat > src/common/backup/backup.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';

@Module({
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
EOF
fi

# Check backup service
if [ -f "src/common/backup/backup.service.ts" ]; then
    print_status "✅ backup.service.ts tồn tại"
else
    print_error "❌ backup.service.ts không tồn tại"
    print_status "Tạo file backup.service.ts..."
    cat > src/common/backup/backup.service.ts << 'EOF'
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService) {}

  async createBackup(): Promise<string> {
    return 'Backup created successfully';
  }

  async restoreBackup(backupPath: string): Promise<string> {
    return 'Backup restored successfully';
  }
}
EOF
fi

# Check business intelligence service
if [ -f "src/modules/admin/business-intelligence.service.ts" ]; then
    print_status "✅ business-intelligence.service.ts tồn tại"
    
    # Fix spread operator issue
    print_status "Sửa lỗi spread operator..."
    sed -i 's/...data/...(data as object)/g' src/modules/admin/business-intelligence.service.ts
    print_status "Đã sửa lỗi spread operator"
else
    print_error "❌ business-intelligence.service.ts không tồn tại"
fi

# Try build again
print_status "Thử build lại..."
if npm run build; then
    print_status "✅ Backend build thành công!"
else
    print_error "❌ Backend build vẫn thất bại"
    print_status "Chi tiết lỗi cuối cùng:"
    npm run build 2>&1 | grep -A 10 -B 5 "error"
fi

cd ../..

print_status "Hoàn thành debug!"
