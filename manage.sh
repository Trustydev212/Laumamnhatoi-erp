#!/bin/bash

# Nhà Tôi ERP - Management Script
# Usage: ./manage.sh [command]

set -e

PROJECT_NAME="nha-toi-erp"
PROJECT_DIR="/opt/$PROJECT_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

show_help() {
    echo "Nhà Tôi ERP Management Script"
    echo ""
    echo "Usage: ./manage.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start       Start all services"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  status      Show service status"
    echo "  logs        Show service logs"
    echo "  logs-f      Follow service logs"
    echo "  backup      Create database backup"
    echo "  restore     Restore database from backup"
    echo "  update      Update application"
    echo "  health      Check service health"
    echo "  shell       Open shell in backend container"
    echo "  db-shell    Open database shell"
    echo "  clean       Clean up unused Docker resources"
    echo "  help        Show this help message"
}

start_services() {
    print_status "Starting services..."
    cd $PROJECT_DIR
    docker-compose -f docker-compose.prod.yml up -d
    print_status "Services started successfully!"
}

stop_services() {
    print_status "Stopping services..."
    cd $PROJECT_DIR
    docker-compose -f docker-compose.prod.yml down
    print_status "Services stopped successfully!"
}

restart_services() {
    print_status "Restarting services..."
    cd $PROJECT_DIR
    docker-compose -f docker-compose.prod.yml restart
    print_status "Services restarted successfully!"
}

show_status() {
    print_info "Service Status:"
    cd $PROJECT_DIR
    docker-compose -f docker-compose.prod.yml ps
}

show_logs() {
    cd $PROJECT_DIR
    docker-compose -f docker-compose.prod.yml logs "$@"
}

follow_logs() {
    cd $PROJECT_DIR
    docker-compose -f docker-compose.prod.yml logs -f "$@"
}

create_backup() {
    print_status "Creating database backup..."
    cd $PROJECT_DIR
    ./backup.sh
    print_status "Backup completed!"
}

restore_backup() {
    if [ -z "$1" ]; then
        print_error "Please specify backup file: ./manage.sh restore /path/to/backup.sql"
        exit 1
    fi
    
    print_warning "This will replace the current database. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_status "Restoring database from $1..."
        cd $PROJECT_DIR
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d nha_toi_erp < "$1"
        print_status "Database restored successfully!"
    else
        print_info "Restore cancelled."
    fi
}

update_application() {
    print_status "Updating application..."
    cd $PROJECT_DIR
    
    # Pull latest changes
    git pull origin main
    
    # Rebuild and restart services
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml build --no-cache
    docker-compose -f docker-compose.prod.yml up -d
    
    print_status "Application updated successfully!"
}

check_health() {
    print_info "Checking service health..."
    cd $PROJECT_DIR
    
    # Check if containers are running
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        print_status "✅ All containers are running"
    else
        print_error "❌ Some containers are not running"
        docker-compose -f docker-compose.prod.yml ps
        exit 1
    fi
    
    # Check health endpoints
    if curl -f http://localhost/health > /dev/null 2>&1; then
        print_status "✅ Health check passed"
    else
        print_error "❌ Health check failed"
        exit 1
    fi
    
    print_status "All services are healthy!"
}

open_shell() {
    print_status "Opening shell in backend container..."
    cd $PROJECT_DIR
    docker-compose -f docker-compose.prod.yml exec backend sh
}

open_db_shell() {
    print_status "Opening database shell..."
    cd $PROJECT_DIR
    docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d nha_toi_erp
}

clean_docker() {
    print_status "Cleaning up unused Docker resources..."
    docker system prune -f
    docker volume prune -f
    print_status "Cleanup completed!"
}

# Main script logic
case "${1:-help}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        shift
        show_logs "$@"
        ;;
    logs-f)
        shift
        follow_logs "$@"
        ;;
    backup)
        create_backup
        ;;
    restore)
        restore_backup "$2"
        ;;
    update)
        update_application
        ;;
    health)
        check_health
        ;;
    shell)
        open_shell
        ;;
    db-shell)
        open_db_shell
        ;;
    clean)
        clean_docker
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
