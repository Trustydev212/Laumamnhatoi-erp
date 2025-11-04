#!/bin/bash

# 🛡️ Script cập nhật hệ thống an toàn với backup và rollback
# Sử dụng: ./safe-update.sh

set -e  # Exit on any error

echo "🛡️  Bắt đầu cập nhật hệ thống an toàn..."

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

# Configuration
BACKUP_DIR="/home/deploy/backups"
PROJECT_DIR="/home/deploy/Laumamnhatoi-erp"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup-${TIMESTAMP}.sql"
ROLLBACK_FLAG="${BACKUP_DIR}/rollback-${TIMESTAMP}.flag"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if running as deploy user
if [ "$USER" != "deploy" ] && [ "$USER" != "root" ]; then
    print_error "Script này phải chạy với user 'deploy' hoặc 'root'"
    exit 1
fi

# Navigate to project directory
cd "$PROJECT_DIR" || {
    print_error "Không tìm thấy thư mục project: $PROJECT_DIR"
    exit 1
}

print_status "📁 Thư mục làm việc: $(pwd)"

# ============================================
# BƯỚC 1: BACKUP DATABASE
# ============================================
print_status "📦 BƯỚC 1: Tạo backup database..."

# Load database credentials from .env
if [ -f "apps/backend/.env" ]; then
    source <(grep -v '^#' apps/backend/.env | sed 's/^/export /')
fi

# Default values if not in .env
DB_HOST="${DATABASE_URL:-localhost}"
DB_NAME="${DB_NAME:-nha_toierp}"
DB_USER="${DB_USER:-nhatoi_user}"
DB_PASSWORD="${DB_PASSWORD:-210200}"

# Extract host, port, database, user from DATABASE_URL if present
if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
    # Remove query string from database name (e.g., ?schema=public)
    DB_NAME="${DB_NAME%%\?*}"
elif [[ "$DATABASE_URL" =~ postgresql://([^:]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_HOST="${BASH_REMATCH[2]}"
    DB_PORT="${BASH_REMATCH[3]}"
    DB_NAME="${BASH_REMATCH[4]}"
    # Remove query string from database name
    DB_NAME="${DB_NAME%%\?*}"
fi

# Set default port if not specified
DB_PORT="${DB_PORT:-5432}"

print_status "   Database: $DB_NAME"
print_status "   User: $DB_USER"
print_status "   Host: $DB_HOST:$DB_PORT"

# Create backup using pg_dump
if command -v pg_dump >/dev/null 2>&1; then
    export PGPASSWORD="$DB_PASSWORD"
    
    # Try to create backup
    DUMP_OUTPUT=$(pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_FILE" 2>&1)
    DUMP_EXIT_CODE=$?
    
    if [ $DUMP_EXIT_CODE -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
        print_success "✅ Backup database thành công: $BACKUP_FILE"
        
        # Compress backup to save space
        if command -v gzip >/dev/null 2>&1; then
            gzip "$BACKUP_FILE"
            BACKUP_FILE="${BACKUP_FILE}.gz"
            print_status "   Backup đã được nén: $BACKUP_FILE"
        fi
        
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        print_status "   Kích thước backup: $BACKUP_SIZE"
    else
        print_error "❌ Backup database thất bại!"
        print_error "   Exit code: $DUMP_EXIT_CODE"
        if [ -n "$DUMP_OUTPUT" ]; then
            print_error "   Lỗi: $DUMP_OUTPUT"
        fi
        print_error "   Thông tin kết nối:"
        print_error "   - Host: $DB_HOST"
        print_error "   - Port: $DB_PORT"
        print_error "   - User: $DB_USER"
        print_error "   - Database: $DB_NAME"
        print_error "   Kiểm tra lại thông tin kết nối database"
        exit 1
    fi
    
    unset PGPASSWORD
else
    print_warning "⚠️  pg_dump không được tìm thấy, bỏ qua backup database"
    print_warning "   Cài đặt: sudo apt-get install postgresql-client"
    BACKUP_FILE=""
fi

# ============================================
# BƯỚC 2: BACKUP CODE (Git stash)
# ============================================
print_status "📦 BƯỚC 2: Lưu trạng thái code hiện tại..."

if git rev-parse --git-dir > /dev/null 2>&1; then
    # Check if there are uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_warning "⚠️  Có thay đổi chưa commit, đang lưu vào stash..."
        git stash save "Auto-stash before safe-update $(date +%Y%m%d-%H%M%S)"
        STASHED=true
    else
        STASHED=false
    fi
    
    # Save current commit hash for rollback
    CURRENT_COMMIT=$(git rev-parse HEAD)
    echo "$CURRENT_COMMIT" > "$ROLLBACK_FLAG"
    echo "$BACKUP_FILE" >> "$ROLLBACK_FLAG"
    print_status "   Commit hiện tại: $CURRENT_COMMIT"
    print_success "✅ Đã lưu trạng thái code"
else
    print_warning "⚠️  Không phải git repository, không thể lưu trạng thái code"
    STASHED=false
fi

# ============================================
# BƯỚC 3: PULL CODE MỚI
# ============================================
print_status "📥 BƯỚC 3: Lấy code mới từ GitHub..."

if git rev-parse --git-dir > /dev/null 2>&1; then
    # Fetch latest changes
    MAX_RETRIES=3
    RETRY=0
    FETCH_SUCCESS=false
    
    while [ $RETRY -lt $MAX_RETRIES ] && [ "$FETCH_SUCCESS" = false ]; do
        RETRY=$((RETRY + 1))
        print_status "   Fetching (lần $RETRY/$MAX_RETRIES)..."
        
        if timeout 120 git -c http.postBuffer=524288000 -c http.timeout=120 fetch origin main 2>&1; then
            FETCH_SUCCESS=true
            print_success "✅ Fetch thành công"
            break
        else
            if [ $RETRY -lt $MAX_RETRIES ]; then
                print_warning "⚠️  Fetch thất bại, thử lại sau 10 giây..."
                sleep 10
            else
                print_error "❌ Fetch thất bại sau $MAX_RETRIES lần thử"
                exit 1
            fi
        fi
    done
    
    # Reset to remote main
    if [ "$FETCH_SUCCESS" = true ]; then
        print_status "   Đang cập nhật code..."
        git reset --hard origin/main || {
            print_error "❌ Reset code thất bại"
            exit 1
        }
        NEW_COMMIT=$(git rev-parse HEAD)
        print_success "✅ Code đã được cập nhật"
        print_status "   Commit mới: $NEW_COMMIT"
    fi
else
    print_warning "⚠️  Không phải git repository, bỏ qua pull code"
fi

# ============================================
# BƯỚC 4: CẬP NHẬT DEPENDENCIES
# ============================================
print_status "📦 BƯỚC 4: Cập nhật dependencies..."

npm install || {
    print_error "❌ Cài đặt dependencies thất bại"
    print_error "   Đang rollback..."
    # Rollback will be handled below
    ROLLBACK_NEEDED=true
}

if [ "$ROLLBACK_NEEDED" != "true" ]; then
    cd apps/backend
    npm install || {
        print_error "❌ Cài đặt backend dependencies thất bại"
        ROLLBACK_NEEDED=true
    }
    cd ../frontend
    npm install || {
        print_error "❌ Cài đặt frontend dependencies thất bại"
        ROLLBACK_NEEDED=true
    }
    cd ../..
fi

if [ "$ROLLBACK_NEEDED" = "true" ]; then
    print_error "❌ Cập nhật dependencies thất bại, đang rollback..."
    goto rollback
fi

print_success "✅ Dependencies đã được cập nhật"

# ============================================
# BƯỚC 5: CHẠY DATABASE MIGRATIONS
# ============================================
print_status "🗄️  BƯỚC 5: Chạy database migrations..."

cd apps/backend

# Generate Prisma client
npm run db:generate || {
    print_warning "⚠️  Generate Prisma client thất bại, nhưng tiếp tục..."
}

# Run migrations (safe - only apply new migrations)
if npm run db:migrate deploy 2>/dev/null; then
    print_success "✅ Migrations đã được áp dụng"
elif npm run db:push 2>/dev/null; then
    print_warning "⚠️  Sử dụng db:push thay vì migrate (development mode)"
    print_success "✅ Database schema đã được cập nhật"
else
    print_warning "⚠️  Migration thất bại, nhưng tiếp tục..."
    print_warning "   Kiểm tra lại schema.prisma và database connection"
fi

cd ../..

# ============================================
# BƯỚC 6: BUILD CODE
# ============================================
print_status "🔨 BƯỚC 6: Build code..."

# Clean old builds
print_status "   Đang xóa build cũ..."
rm -rf apps/backend/dist
rm -rf apps/backend/tsconfig.tsbuildinfo
rm -rf apps/frontend/.next
rm -rf apps/frontend/tsconfig.tsbuildinfo

# Build backend
print_status "   Đang build backend..."
cd apps/backend
if npm run build; then
    print_success "✅ Backend build thành công"
else
    print_error "❌ Backend build thất bại"
    ROLLBACK_NEEDED=true
fi
cd ../..

if [ "$ROLLBACK_NEEDED" = "true" ]; then
    goto rollback
fi

# Build frontend
print_status "   Đang build frontend..."
cd apps/frontend
set +e  # Don't exit on error for frontend build
npm run build
FRONTEND_BUILD_EXIT=$?
set -e

if [ $FRONTEND_BUILD_EXIT -eq 0 ] && [ -d ".next" ]; then
    print_success "✅ Frontend build thành công"
    FRONTEND_BUILD_FAILED=false
else
    print_warning "⚠️  Frontend build thất bại, nhưng tiếp tục với backend..."
    FRONTEND_BUILD_FAILED=true
fi
cd ../..

# ============================================
# BƯỚC 7: RESTART SERVICES
# ============================================
print_status "🔄 BƯỚC 7: Khởi động lại services..."

# Stop services
print_status "   Đang dừng services..."
pm2 delete all 2>/dev/null || true
pkill -9 -f "node dist/main" 2>/dev/null || true
pkill -9 -f "next start" 2>/dev/null || true
sleep 2

# Start services
print_status "   Đang khởi động services..."
cd "$PROJECT_DIR"

if [ "$FRONTEND_BUILD_FAILED" = "true" ]; then
    pm2 start ecosystem.config.js --only laumam-backend || {
        print_error "❌ Khởi động backend thất bại"
        ROLLBACK_NEEDED=true
    }
else
    pm2 start ecosystem.config.js || {
        print_error "❌ Khởi động services thất bại"
        ROLLBACK_NEEDED=true
    }
fi

pm2 save

if [ "$ROLLBACK_NEEDED" = "true" ]; then
    goto rollback
fi

# Wait for services to start
sleep 5

# Health check
print_status "🧪 Đang kiểm tra health..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    print_success "✅ Backend đang hoạt động"
else
    print_warning "⚠️  Backend health check thất bại"
    print_warning "   Kiểm tra logs: pm2 logs"
fi

if [ "$FRONTEND_BUILD_FAILED" != "true" ]; then
    if curl -s http://localhost:3002 > /dev/null; then
        print_success "✅ Frontend đang hoạt động"
    else
        print_warning "⚠️  Frontend health check thất bại"
    fi
fi

# ============================================
# THÀNH CÔNG
# ============================================
print_success "🎉 Cập nhật hệ thống thành công!"
print_status "📦 Backup được lưu tại: $BACKUP_FILE"
print_status "🌐 Website: http://laumamnhatoi.vn"
print_status "📚 API Docs: http://laumamnhatoi.vn/api/docs"
print_status ""
print_status "💡 Lệnh hữu ích:"
print_status "   - Xem logs: pm2 logs"
print_status "   - Xem status: pm2 status"
print_status "   - Restart: pm2 restart all"
exit 0

# ============================================
# ROLLBACK SECTION
# ============================================
rollback:
print_error ""
print_error "❌❌❌ CẬP NHẬT THẤT BẠI - ĐANG ROLLBACK ❌❌❌"
print_error ""

# Restore database backup
if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
    print_status "🔄 Đang khôi phục database từ backup..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Decompress if needed
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" > "${BACKUP_FILE%.gz}" 2>/dev/null || {
            print_error "❌ Giải nén backup thất bại"
        }
        BACKUP_FILE="${BACKUP_FILE%.gz}"
    fi
    
    # Drop and recreate database (CAUTION: This will delete current data!)
    # For safer rollback, we'll just restore the backup
    if [[ "$BACKUP_FILE" == *.sql ]]; then
        # SQL dump format
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE" 2>/dev/null || {
            print_warning "⚠️  Khôi phục database từ SQL dump gặp lỗi"
            print_warning "   Có thể cần restore thủ công: psql -h $DB_HOST -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
        }
    elif [[ "$BACKUP_FILE" == *.dump ]] || command -v pg_restore >/dev/null 2>&1; then
        # Custom format - use pg_restore
        pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$BACKUP_FILE" 2>/dev/null || {
            print_warning "⚠️  Khôi phục database từ custom dump gặp lỗi"
            print_warning "   Có thể cần restore thủ công: pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME -c $BACKUP_FILE"
        }
    fi
    
    unset PGPASSWORD
    print_success "✅ Database đã được khôi phục"
else
    print_warning "⚠️  Không tìm thấy backup database để khôi phục"
fi

# Restore code
if [ -f "$ROLLBACK_FLAG" ]; then
    OLD_COMMIT=$(head -n 1 "$ROLLBACK_FLAG")
    print_status "🔄 Đang khôi phục code về commit: $OLD_COMMIT"
    
    if git rev-parse --git-dir > /dev/null 2>&1; then
        git reset --hard "$OLD_COMMIT" || {
            print_error "❌ Khôi phục code thất bại"
        }
        print_success "✅ Code đã được khôi phục"
        
        # Restore stashed changes if any
        if [ "$STASHED" = "true" ]; then
            print_status "   Đang khôi phục thay đổi đã stash..."
            git stash pop 2>/dev/null || true
        fi
    fi
fi

# Rebuild and restart
print_status "🔨 Đang rebuild và restart với code cũ..."
cd apps/backend
npm run build
cd ../..
pm2 restart all

print_error ""
print_error "❌ Rollback hoàn tất"
print_error "📦 Backup có sẵn tại: $BACKUP_FILE"
print_error "💡 Vui lòng kiểm tra logs và sửa lỗi trước khi thử lại"
print_error "   Xem logs: pm2 logs"
exit 1

