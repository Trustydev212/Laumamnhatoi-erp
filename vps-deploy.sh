#!/bin/bash
# Script deploy POS fix lên VPS - Copy và chạy trực tiếp trên VPS

cd /home/deploy/Laumamnhatoi-erp && \
git pull origin main && \
cd apps/frontend && \
rm -rf .next .next/cache tsconfig.tsbuildinfo node_modules/.cache && \
npm run build && \
cd /home/deploy/Laumamnhatoi-erp && \
pm2 restart laumam-frontend && \
pm2 save && \
echo "✅ Deploy completed! Database is safe."

