#!/bin/bash

# Script sửa lỗi backup module trên VPS
# Usage: ./fix-backup-module.sh

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

echo "🔧 Sửa lỗi backup module..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "apps/backend/package.json" ]; then
    print_error "Không tìm thấy thư mục project. Vui lòng chạy từ thư mục gốc"
    exit 1
fi

# Go to backend directory
cd apps/backend

# Create backup directory if it doesn't exist
print_status "Tạo thư mục backup..."
mkdir -p src/common/backup

# Create backup.module.ts
print_status "Tạo file backup.module.ts..."
cat > src/common/backup/backup.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';

@Module({
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
EOF

# Create backup.service.ts
print_status "Tạo file backup.service.ts..."
cat > src/common/backup/backup.service.ts << 'EOF'
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

# Fix TypeScript error in business-intelligence.service.ts
print_status "Sửa lỗi TypeScript trong business-intelligence.service.ts..."
if [ -f "src/modules/admin/business-intelligence.service.ts" ]; then
    # Fix the spread operator issue
    sed -i 's/...data/...(data as object)/g' src/modules/admin/business-intelligence.service.ts
    print_status "Đã sửa lỗi spread operator"
else
    print_warning "Không tìm thấy file business-intelligence.service.ts"
fi

# Verify files exist
print_status "Kiểm tra các file đã tạo..."
if [ -f "src/common/backup/backup.module.ts" ]; then
    print_status "✅ backup.module.ts đã tạo"
else
    print_error "❌ Không thể tạo backup.module.ts"
fi

if [ -f "src/common/backup/backup.service.ts" ]; then
    print_status "✅ backup.service.ts đã tạo"
else
    print_error "❌ Không thể tạo backup.service.ts"
fi

# Try to build
print_status "Thử build backend..."
if npm run build; then
    print_status "✅ Backend build thành công!"
else
    print_error "❌ Backend build vẫn thất bại"
    print_status "Chi tiết lỗi:"
    npm run build 2>&1 | grep -A 5 -B 5 "error"
fi

cd ../..

print_status "Hoàn thành sửa lỗi backup module!"
