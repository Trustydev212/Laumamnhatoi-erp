# Test script for Nhà Tôi ERP on local
# Simple version without emojis to avoid encoding issues

$ErrorActionPreference = "Stop"

Write-Host "Starting local test for Nhà Tôi ERP..." -ForegroundColor Cyan

# Navigate to project directory
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Blue

# Clean old builds
Write-Host "Cleaning old builds..." -ForegroundColor Blue
if (Test-Path "apps/backend/dist") { Remove-Item -Recurse -Force "apps/backend/dist" }
if (Test-Path "apps/frontend/.next") { Remove-Item -Recurse -Force "apps/frontend/.next" }

# Build backend
Write-Host "Building backend..." -ForegroundColor Blue
Set-Location "apps/backend"
npm run build

if (-not (Test-Path "dist/src/main.js")) {
    Write-Host "Backend build failed - dist/src/main.js not found" -ForegroundColor Red
    exit 1
}

Write-Host "Backend build completed" -ForegroundColor Green

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Blue
Set-Location "../frontend"
npm run build

if (-not (Test-Path ".next")) {
    Write-Host "Frontend build failed - .next directory not found" -ForegroundColor Red
    exit 1
}

Write-Host "Frontend build completed" -ForegroundColor Green

# Go back to root
Set-Location $projectRoot

# Check if user wants to start services
Write-Host ""
$startServices = Read-Host "Do you want to start the services locally? (y/n)"

if ($startServices -ne "y" -and $startServices -ne "Y") {
    Write-Host "Build test completed successfully!" -ForegroundColor Green
    Write-Host "Builds are ready for deployment." -ForegroundColor Blue
    exit 0
}

# Check if PM2 is installed
try {
    pm2 --version | Out-Null
    Write-Host "PM2 found" -ForegroundColor Green
} catch {
    Write-Host "PM2 not found. Please install PM2 globally:" -ForegroundColor Yellow
    Write-Host "   npm install -g pm2" -ForegroundColor Yellow
    exit 1
}

# Stop any existing PM2 processes for this project
Write-Host "Stopping existing PM2 processes..." -ForegroundColor Blue
pm2 delete laumam-backend laumam-frontend 2>$null

# Create local ecosystem config
Write-Host "Creating local ecosystem config..." -ForegroundColor Blue
$normalizedPath = $projectRoot -replace "\\", "/"
$localEcosystem = "module.exports = {
  apps: [
    {
      name: `"laumam-backend`",
      script: `"apps/backend/dist/src/main.js`",
      cwd: `"$normalizedPath`",
      env: {
        NODE_ENV: `"production`",
        PORT: 3001,
      },
      instances: 1,
      exec_mode: `"fork`",
      watch: false,
      max_memory_restart: `"1G`",
    },
    {
      name: `"laumam-frontend`",
      script: `"npm`",
      args: `"run start`",
      cwd: `"$normalizedPath/apps/frontend`",
      env: {
        NODE_ENV: `"production`",
        PORT: 3002,
      },
      instances: 1,
      exec_mode: `"fork`",
      watch: false,
      max_memory_restart: `"1G`",
    }
  ]
};"

$localEcosystem | Out-File -FilePath "ecosystem.local.js" -Encoding UTF8

# Start services with PM2
Write-Host "Starting services with PM2..." -ForegroundColor Blue
pm2 start ecosystem.local.js

# Wait a moment for services to start
Start-Sleep -Seconds 5

# Check service status
Write-Host "Checking service status..." -ForegroundColor Blue
pm2 status

# Test services
Write-Host "Testing services..." -ForegroundColor Blue

# Test backend
$backendUrl = "http://localhost:3001/api/health"
try {
    $response = Invoke-WebRequest -Uri $backendUrl -Method Get -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "Backend is responding at $backendUrl" -ForegroundColor Green
    }
} catch {
    Write-Host "Backend health check failed at $backendUrl" -ForegroundColor Yellow
    Write-Host "Check logs with: pm2 logs laumam-backend" -ForegroundColor Blue
}

# Test frontend
$frontendUrl = "http://localhost:3002"
try {
    $response = Invoke-WebRequest -Uri $frontendUrl -Method Get -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "Frontend is responding at $frontendUrl" -ForegroundColor Green
    }
} catch {
    Write-Host "Frontend health check failed at $frontendUrl" -ForegroundColor Yellow
    Write-Host "Check logs with: pm2 logs laumam-frontend" -ForegroundColor Blue
}

Write-Host "Local test completed!" -ForegroundColor Green
Write-Host "Backend API: http://localhost:3001" -ForegroundColor Blue
Write-Host "Frontend: http://localhost:3002" -ForegroundColor Blue
Write-Host "API Docs: http://localhost:3001/api/docs" -ForegroundColor Blue
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Blue
Write-Host "  - View logs: pm2 logs" -ForegroundColor Cyan
Write-Host "  - Stop services: pm2 stop all" -ForegroundColor Cyan
Write-Host "  - Delete services: pm2 delete all" -ForegroundColor Cyan
Write-Host "  - Restart services: pm2 restart all" -ForegroundColor Cyan

# Show recent logs
Write-Host ""
Write-Host "Recent logs:" -ForegroundColor Blue
pm2 logs --lines 10 --nostream

