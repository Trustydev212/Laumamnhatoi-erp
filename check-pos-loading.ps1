# Script kiểm tra tại sao POS đang bị quay (loading)
# Dựa trên lỗi ChunkLoadError: page-6752f73ec0053381.js

Write-Host "🔍 Kiểm tra vấn đề POS đang bị quay (ChunkLoadError)..." -ForegroundColor Cyan
Write-Host ""

$GREEN = "Green"
$RED = "Red"
$YELLOW = "Yellow"
$CYAN = "Cyan"

# 1. Kiểm tra file chunk có tồn tại không
Write-Host "1️⃣ Kiểm tra POS chunk file..." -ForegroundColor $CYAN
$frontendDir = "apps\frontend"
$chunkFile = "$frontendDir\.next\static\chunks\app\pos\page-6752f73ec0053381.js"

if (Test-Path $chunkFile) {
    $fileInfo = Get-Item $chunkFile
    Write-Host "   ✅ File chunk tồn tại: $chunkFile" -ForegroundColor $GREEN
    Write-Host "      Size: $($fileInfo.Length) bytes" -ForegroundColor $CYAN
    Write-Host "      Modified: $($fileInfo.LastWriteTime)" -ForegroundColor $CYAN
} else {
    Write-Host "   ❌ File chunk KHÔNG tồn tại: $chunkFile" -ForegroundColor $RED
    Write-Host "   💡 Cần rebuild frontend" -ForegroundColor $YELLOW
}

# Tìm tất cả POS chunks
Write-Host ""
Write-Host "   📋 Tất cả POS chunks:" -ForegroundColor $CYAN
$posChunks = Get-ChildItem -Path "$frontendDir\.next" -Recurse -Filter "*pos*page*.js" -ErrorAction SilentlyContinue
if ($posChunks) {
    $posChunks | ForEach-Object {
        Write-Host "      - $($_.FullName.Replace((Get-Location).Path + '\', '')) ($($_.Length) bytes)" -ForegroundColor $CYAN
    }
} else {
    Write-Host "      ❌ Không tìm thấy POS chunks" -ForegroundColor $RED
}
Write-Host ""

# 2. Kiểm tra backend
Write-Host "2️⃣ Kiểm tra Backend Service..." -ForegroundColor $CYAN
$backendPort = 3001
$backendProcess = Get-NetTCPConnection -LocalPort $backendPort -ErrorAction SilentlyContinue
if ($backendProcess) {
    Write-Host "   ✅ Backend đang chạy trên port $backendPort" -ForegroundColor $GREEN
} else {
    Write-Host "   ❌ Backend KHÔNG chạy trên port $backendPort" -ForegroundColor $RED
}
Write-Host ""

# 3. Kiểm tra frontend
Write-Host "3️⃣ Kiểm tra Frontend Service..." -ForegroundColor $CYAN
$frontendPort = 3002
$frontendProcess = Get-NetTCPConnection -LocalPort $frontendPort -ErrorAction SilentlyContinue
if ($frontendProcess) {
    Write-Host "   ✅ Frontend đang chạy trên port $frontendPort" -ForegroundColor $GREEN
} else {
    Write-Host "   ❌ Frontend KHÔNG chạy trên port $frontendPort" -ForegroundColor $RED
}
Write-Host ""

# 4. Test chunk file accessibility
Write-Host "4️⃣ Test chunk file accessibility..." -ForegroundColor $CYAN
$chunkUrl = "http://36.50.27.82:3002/_next/static/chunks/app/pos/page-6752f73ec0053381.js"
try {
    $response = Invoke-WebRequest -Uri $chunkUrl -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Chunk file accessible (HTTP $($response.StatusCode))" -ForegroundColor $GREEN
    Write-Host "      Content-Type: $($response.Headers['Content-Type'])" -ForegroundColor $CYAN
    
    # Kiểm tra MIME type
    $contentType = $response.Headers['Content-Type']
    if ($contentType -like "*javascript*" -or $contentType -like "*application/javascript*" -or $contentType -like "*text/javascript*") {
        Write-Host "      ✅ MIME type đúng" -ForegroundColor $GREEN
    } else {
        Write-Host "      ⚠️  MIME type có thể sai: $contentType" -ForegroundColor $YELLOW
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "   ❌ Chunk file trả về 400 Bad Request" -ForegroundColor $RED
        Write-Host "      💡 File không tồn tại hoặc server không serve được" -ForegroundColor $YELLOW
    } elseif ($statusCode -eq 404) {
        Write-Host "   ❌ Chunk file không tìm thấy (404)" -ForegroundColor $RED
        Write-Host "      💡 Cần rebuild frontend" -ForegroundColor $YELLOW
    } else {
        Write-Host "   ❌ Lỗi khi test chunk: $($_.Exception.Message)" -ForegroundColor $RED
    }
}
Write-Host ""

# 5. Kiểm tra API endpoints
Write-Host "5️⃣ Kiểm tra API Endpoints..." -ForegroundColor $CYAN
$apiBase = "http://36.50.27.82:3001"
$endpoints = @(
    "/pos/tables",
    "/pos/menu",
    "/pos/categories",
    "/customers"
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "$apiBase$endpoint" -Method GET -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ $endpoint - OK (200)" -ForegroundColor $GREEN
        } elseif ($response.StatusCode -eq 401) {
            Write-Host "   ⚠️  $endpoint - Cần authentication (401)" -ForegroundColor $YELLOW
        } else {
            Write-Host "   ⚠️  $endpoint - Status: $($response.StatusCode)" -ForegroundColor $YELLOW
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401) {
            Write-Host "   ⚠️  $endpoint - Cần authentication (401)" -ForegroundColor $YELLOW
        } elseif ($statusCode -eq 400) {
            Write-Host "   ❌ $endpoint - Bad Request (400)" -ForegroundColor $RED
        } else {
            Write-Host "   ❌ $endpoint - Lỗi: $($_.Exception.Message)" -ForegroundColor $RED
        }
    }
}
Write-Host ""

# 6. Kiểm tra PM2
Write-Host "6️⃣ Kiểm tra PM2 Processes..." -ForegroundColor $CYAN
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    try {
        $pm2List = pm2 list 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ PM2 đang chạy" -ForegroundColor $GREEN
            $pm2List | Select-String -Pattern "laumam|frontend|backend" | ForEach-Object {
                Write-Host "      $_" -ForegroundColor $CYAN
            }
        } else {
            Write-Host "   ⚠️  PM2 không có processes nào" -ForegroundColor $YELLOW
        }
    } catch {
        Write-Host "   ⚠️  Không thể kiểm tra PM2" -ForegroundColor $YELLOW
    }
} else {
    Write-Host "   ℹ️  PM2 không được cài đặt" -ForegroundColor $CYAN
}
Write-Host ""

# 7. Tóm tắt và đề xuất
Write-Host "📊 TÓM TẮT VÀ ĐỀ XUẤT:" -ForegroundColor $CYAN
Write-Host ""
Write-Host "   Vấn đề: ChunkLoadError - page-6752f73ec0053381.js" -ForegroundColor $RED
Write-Host ""
Write-Host "   Nguyên nhân có thể:" -ForegroundColor $CYAN
Write-Host "   1. ❌ File chunk không tồn tại sau khi rebuild" -ForegroundColor $RED
Write-Host "   2. ❌ Next.js build không tạo ra file này" -ForegroundColor $RED
Write-Host "   3. ❌ Server không serve đúng static files" -ForegroundColor $RED
Write-Host "   4. ❌ Browser cache file cũ nhưng server đã xóa" -ForegroundColor $RED
Write-Host ""
Write-Host "   💡 Giải pháp:" -ForegroundColor $CYAN
Write-Host "   1. Rebuild frontend:" -ForegroundColor $YELLOW
Write-Host "      cd apps/frontend" -ForegroundColor $YELLOW
Write-Host "      Remove-Item -Recurse -Force .next" -ForegroundColor $YELLOW
Write-Host "      npm run build" -ForegroundColor $YELLOW
Write-Host ""
Write-Host "   2. Restart frontend:" -ForegroundColor $YELLOW
Write-Host "      pm2 restart laumam-frontend" -ForegroundColor $YELLOW
Write-Host ""
Write-Host "   3. Clear browser cache:" -ForegroundColor $YELLOW
Write-Host "      - Mở DevTools (F12)" -ForegroundColor $YELLOW
Write-Host "      - Right-click nút Reload" -ForegroundColor $YELLOW
Write-Host "      - Chọn 'Empty Cache and Hard Reload'" -ForegroundColor $YELLOW
Write-Host "      - Hoặc Ctrl+Shift+R" -ForegroundColor $YELLOW
Write-Host ""
Write-Host "   4. Kiểm tra trong browser console:" -ForegroundColor $YELLOW
Write-Host "      fetch('http://36.50.27.82:3002/_next/static/chunks/app/pos/page-6752f73ec0053381.js')" -ForegroundColor $YELLOW
Write-Host "        .then(r => console.log('Status:', r.status, 'Type:', r.headers.get('content-type')))" -ForegroundColor $YELLOW
Write-Host "        .catch(err => console.error('Error:', err))" -ForegroundColor $YELLOW
Write-Host ""

Write-Host "✅ Hoàn tất kiểm tra!" -ForegroundColor $GREEN
Write-Host ""

