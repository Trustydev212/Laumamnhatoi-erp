# PowerShell script to start development servers
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   NHA TOI ERP - RESTAURANT MANAGEMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting development environment (without Docker)..." -ForegroundColor Yellow
Write-Host ""

Write-Host "[1/3] Checking dependencies..." -ForegroundColor Green

# Check if node_modules exist
if (-not (Test-Path "apps\backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location "apps\backend"
    cmd /c "npm install"
    Set-Location "..\.."
}

if (-not (Test-Path "apps\frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location "apps\frontend"
    cmd /c "npm install"
    Set-Location "..\.."
}

Write-Host ""
Write-Host "[2/3] Starting Backend API..." -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd apps\backend && npm run start:dev" -WindowStyle Normal

Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "[3/3] Starting Frontend..." -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd apps\frontend && npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Development servers are starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3001" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "API Docs: http://localhost:3001/api/docs" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
