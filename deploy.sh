#!/bin/bash

# Nhà Tôi ERP - Automated Deployment Script
# Usage: ./deploy.sh [environment]
# Environment: production (default), staging, development

set -e  # Exit on any error

# Configuration
PROJECT_DIR="/home/deploy/Laumamnhatoi-erp"
BACKUP_DIR="/home/deploy/backups"
LOG_FILE="/home/deploy/deploy.log"
ENVIRONMENT=${1:-production}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as deploy user
if [ "$USER" != "deploy" ]; then
    error "This script must be run as 'deploy' user"
fi

log "Starting deployment for environment: $ENVIRONMENT"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup current deployment
log "Creating backup of current deployment..."
BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
if [ -d "$PROJECT_DIR" ]; then
    cp -r "$PROJECT_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    success "Backup created: $BACKUP_DIR/$BACKUP_NAME"
else
    warning "No existing project directory found, skipping backup"
fi

# Navigate to project directory
cd "$PROJECT_DIR" || error "Project directory not found: $PROJECT_DIR"

# Pull latest changes from Git
log "Pulling latest changes from Git..."
git fetch origin
git reset --hard origin/main
success "Git pull completed"

# Install dependencies
log "Installing dependencies..."
npm install
success "Dependencies installed"

# Build backend
log "Building backend..."
cd apps/backend
npm run build
success "Backend build completed"

# Build frontend
log "Building frontend..."
cd ../frontend
npm run build
success "Frontend build completed"

# Go back to project root
cd "$PROJECT_DIR"

# Copy environment files
log "Setting up environment files..."
if [ -f "apps/backend/env.production" ]; then
    cp apps/backend/env.production apps/backend/.env
    success "Backend environment file copied"
fi

if [ -f "apps/frontend/env.production" ]; then
    cp apps/frontend/env.production apps/frontend/.env
    success "Frontend environment file copied"
fi

# Create logs directory
mkdir -p logs

# Stop existing PM2 processes
log "Stopping existing PM2 processes..."
pm2 stop all || warning "No PM2 processes to stop"

# Start applications with PM2
log "Starting applications with PM2..."
pm2 start ecosystem.config.js --env "$ENVIRONMENT"
success "Applications started with PM2"

# Save PM2 configuration
pm2 save
success "PM2 configuration saved"

# Setup PM2 startup script
pm2 startup | grep -E '^sudo' | bash || warning "PM2 startup script setup failed"

# Health check
log "Performing health check..."
sleep 10

# Check backend health
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    success "Backend health check passed"
else
    error "Backend health check failed"
fi

# Check frontend health
if curl -f http://localhost:3002 > /dev/null 2>&1; then
    success "Frontend health check passed"
else
    error "Frontend health check failed"
fi

# Show PM2 status
log "PM2 Status:"
pm2 status

# Show application URLs
success "Deployment completed successfully!"
echo ""
echo -e "${GREEN}Application URLs:${NC}"
echo -e "Frontend: ${BLUE}http://36.50.27.82:3002${NC}"
echo -e "Backend API: ${BLUE}http://36.50.27.82:3001${NC}"
echo -e "Admin Dashboard: ${BLUE}http://36.50.27.82:3002/admin${NC}"
echo -e "POS System: ${BLUE}http://36.50.27.82:3002/pos${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "PM2 Status: ${BLUE}pm2 status${NC}"
echo -e "PM2 Logs: ${BLUE}pm2 logs${NC}"
echo -e "PM2 Restart: ${BLUE}pm2 restart all${NC}"
echo -e "PM2 Stop: ${BLUE}pm2 stop all${NC}"
echo ""

log "Deployment completed at $(date)"