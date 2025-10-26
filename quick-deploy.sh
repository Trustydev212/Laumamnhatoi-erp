#!/bin/bash

# Quick Deploy Script for Nhà Tôi ERP
# Simple one-command deployment

set -e

echo "🚀 Quick Deploy - Nhà Tôi ERP"
echo "================================"

# Navigate to project
cd ~/Laumamnhatoi-erp

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build applications
echo "🔨 Building applications..."
npm run build

# Restart PM2
echo "🔄 Restarting applications..."
pm2 restart all

# Show status
echo "✅ Deployment completed!"
pm2 status

echo ""
echo "🌐 Application URLs:"
echo "Frontend: http://36.50.27.82:3002"
echo "Backend: http://36.50.27.82:3001"
echo "Admin: http://36.50.27.82:3002/admin"
echo "POS: http://36.50.27.82:3002/pos"
