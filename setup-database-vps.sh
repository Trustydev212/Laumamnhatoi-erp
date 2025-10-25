#!/bin/bash

# Script setup database cho VPS
# Usage: ./setup-database-vps.sh

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

echo "🗄️ Setup Database cho ERP..."
echo "================================================"

# Variables
DB_USER="nhatoi_user"
DB_PASS="210200"
DB_NAME="nha_toierp"

# 1. Check if PostgreSQL is running
print_status "Kiểm tra PostgreSQL..."
if ! systemctl is-active --quiet postgresql; then
    print_error "PostgreSQL không chạy. Hãy chạy: sudo systemctl start postgresql"
    exit 1
fi

# 2. Create user and database
print_status "Tạo user và database..."
sudo -u postgres psql << EOF
-- Drop if exists
DROP DATABASE IF EXISTS ${DB_NAME};
DROP USER IF EXISTS ${DB_USER};

-- Create user
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
ALTER USER ${DB_USER} CREATEDB;

-- Create database
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect to database and grant schema privileges
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};

\q
EOF

# 3. Test connection
print_status "Test kết nối database..."
if PGPASSWORD=${DB_PASS} psql -h localhost -U ${DB_USER} -d ${DB_NAME} -c "SELECT 1;" > /dev/null 2>&1; then
    print_status "Kết nối database thành công!"
else
    print_error "Không thể kết nối database!"
    exit 1
fi

# 4. Setup Prisma
print_status "Setup Prisma..."
cd ~/Laumamnhatoi-erp/apps/backend

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# 5. Seed database
print_status "Seed database với dữ liệu mẫu..."
npx prisma db seed

# 6. Verify data
print_status "Kiểm tra dữ liệu đã seed..."
PGPASSWORD=${DB_PASS} psql -h localhost -U ${DB_USER} -d ${DB_NAME} -c "
SELECT 
    'Users' as table_name, COUNT(*) as count FROM \"User\"
UNION ALL
SELECT 
    'Roles' as table_name, COUNT(*) as count FROM \"Role\"
UNION ALL
SELECT 
    'Tables' as table_name, COUNT(*) as count FROM \"Table\"
UNION ALL
SELECT 
    'Categories' as table_name, COUNT(*) as count FROM \"Category\"
UNION ALL
SELECT 
    'Menu Items' as table_name, COUNT(*) as count FROM \"Menu\"
UNION ALL
SELECT 
    'Ingredients' as table_name, COUNT(*) as count FROM \"Ingredient\"
UNION ALL
SELECT 
    'Suppliers' as table_name, COUNT(*) as count FROM \"Supplier\"
UNION ALL
SELECT 
    'Customers' as table_name, COUNT(*) as count FROM \"Customer\";
"

# 7. Create backup script
print_status "Tạo script backup database..."
cat > ~/backup-database.sh << 'EOF'
#!/bin/bash

# Database backup script
DB_USER="nhatoi_user"
DB_PASS="210200"
DB_NAME="nha_toierp"
BACKUP_DIR="~/database-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
PGPASSWORD=$DB_PASS pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

echo "✅ Database backup created: $BACKUP_DIR/backup_$DATE.sql"

# Keep only last 7 backups
cd $BACKUP_DIR
ls -t backup_*.sql | tail -n +8 | xargs -r rm

echo "🗑️ Old backups cleaned up (keeping last 7)"
EOF

chmod +x ~/backup-database.sh

# 8. Create restore script
print_status "Tạo script restore database..."
cat > ~/restore-database.sh << 'EOF'
#!/bin/bash

# Database restore script
if [ -z "$1" ]; then
    echo "Usage: ./restore-database.sh <backup_file.sql>"
    echo "Available backups:"
    ls -la ~/database-backups/backup_*.sql 2>/dev/null || echo "No backups found"
    exit 1
fi

DB_USER="nhatoi_user"
DB_PASS="210200"
DB_NAME="nha_toierp"
BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Restoring database from: $BACKUP_FILE"
PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d $DB_NAME < "$BACKUP_FILE"

echo "✅ Database restored successfully!"
EOF

chmod +x ~/restore-database.sh

# 9. Create database management script
print_status "Tạo script quản lý database..."
cat > ~/manage-database.sh << 'EOF'
#!/bin/bash

# Database management script
DB_USER="nhatoi_user"
DB_PASS="210200"
DB_NAME="nha_toierp"

case "$1" in
    "status")
        echo "📊 Database Status:"
        PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d $DB_NAME -c "
        SELECT 
            'Users' as table_name, COUNT(*) as count FROM \"User\"
        UNION ALL
        SELECT 
            'Roles' as table_name, COUNT(*) as count FROM \"Role\"
        UNION ALL
        SELECT 
            'Tables' as table_name, COUNT(*) as count FROM \"Table\"
        UNION ALL
        SELECT 
            'Categories' as table_name, COUNT(*) as count FROM \"Category\"
        UNION ALL
        SELECT 
            'Menu Items' as table_name, COUNT(*) as count FROM \"Menu\"
        UNION ALL
        SELECT 
            'Ingredients' as table_name, COUNT(*) as count FROM \"Ingredient\"
        UNION ALL
        SELECT 
            'Suppliers' as table_name, COUNT(*) as count FROM \"Supplier\"
        UNION ALL
        SELECT 
            'Customers' as table_name, COUNT(*) as count FROM \"Customer\";
        "
        ;;
    "backup")
        ~/backup-database.sh
        ;;
    "restore")
        if [ -z "$2" ]; then
            echo "Usage: ./manage-database.sh restore <backup_file>"
            exit 1
        fi
        ~/restore-database.sh "$2"
        ;;
    "studio")
        cd ~/Laumamnhatoi-erp/apps/backend
        npx prisma studio
        ;;
    "reset")
        echo "⚠️ This will reset the database. Are you sure? (y/N)"
        read -r confirm
        if [ "$confirm" = "y" ]; then
            cd ~/Laumamnhatoi-erp/apps/backend
            npx prisma db push --force-reset
            npx prisma db seed
            echo "✅ Database reset and seeded!"
        else
            echo "❌ Database reset cancelled"
        fi
        ;;
    *)
        echo "Database Management Script"
        echo "Usage: ./manage-database.sh <command>"
        echo ""
        echo "Commands:"
        echo "  status    - Show database status"
        echo "  backup    - Create database backup"
        echo "  restore   - Restore from backup"
        echo "  studio    - Open Prisma Studio"
        echo "  reset     - Reset database (WARNING: destroys data)"
        ;;
esac
EOF

chmod +x ~/manage-database.sh

# 10. Final information
echo ""
echo "🎉 Database setup hoàn tất!"
echo "================================================"
echo "🗄️ Database: PostgreSQL"
echo "👤 User: ${DB_USER}"
echo "🔐 Password: ${DB_PASS}"
echo "📊 Database: ${DB_NAME}"
echo ""
echo "📋 Scripts quản lý database:"
echo "• ~/manage-database.sh status - Xem trạng thái"
echo "• ~/manage-database.sh backup - Tạo backup"
echo "• ~/manage-database.sh restore <file> - Restore từ backup"
echo "• ~/manage-database.sh studio - Mở Prisma Studio"
echo "• ~/manage-database.sh reset - Reset database"
echo ""
echo "🔧 Prisma commands:"
echo "• cd ~/Laumamnhatoi-erp/apps/backend && npx prisma studio"
echo "• cd ~/Laumamnhatoi-erp/apps/backend && npx prisma db push"
echo "• cd ~/Laumamnhatoi-erp/apps/backend && npx prisma db seed"
echo ""
print_warning "⚠️ Lưu ý:"
echo "• Backup database thường xuyên"
echo "• Không reset database trong production"
echo "• Kiểm tra logs nếu có lỗi"
