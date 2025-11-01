# 🚀 Hướng Dẫn Deploy Chatbot Fix Lên VPS

## Tổng Quan

Các thay đổi đã được thực hiện để cải thiện cách chatbot đọc `OPENAI_API_KEY`:
1. ✅ ConfigModule tìm `.env` ở nhiều vị trí
2. ✅ Chatbot service có logging chi tiết hơn để debug
3. ✅ Script kiểm tra cấu hình chatbot

## Các Bước Deploy

### Bước 1: Commit và Push Code Lên GitHub

```bash
# Trên máy local (Windows)
cd "D:\Projects\Nhà Tôi ERP"

# Kiểm tra các file đã thay đổi
git status

# Add các file đã thay đổi
git add apps/backend/src/app.module.ts
git add apps/backend/src/modules/admin/chatbot.service.ts
git add CHATBOT-SETUP.md
git add check-chatbot-config.sh

# Commit
git commit -m "fix: Improve chatbot OpenAI API key configuration and error handling

- Update ConfigModule to search .env in multiple locations
- Add detailed logging for OpenAI client initialization
- Improve error messages and troubleshooting guides
- Add check-chatbot-config.sh diagnostic script"

# Push lên GitHub
git push origin main
```

### Bước 2: SSH Vào VPS

```bash
ssh root@your-vps-ip
# hoặc
ssh deploy@your-vps-ip
```

### Bước 3: Pull Code Mới và Deploy

```bash
# Di chuyển đến thư mục project
cd /home/deploy/Laumamnhatoi-erp

# Pull code mới từ GitHub
git pull origin main

# Chạy script deploy (sẽ tự động build và restart)
./deploy.sh
```

**Hoặc deploy thủ công:**

```bash
cd /home/deploy/Laumamnhatoi-erp

# Pull code
git pull origin main

# Install dependencies
npm install
cd apps/backend && npm install && cd ../..
cd apps/frontend && npm install && cd ../..

# Build backend
cd apps/backend
npm run build
cd ../..

# Build frontend
cd apps/frontend
npm run build
cd ../..

# Restart PM2 services
pm2 restart all
pm2 save
```

### Bước 4: Kiểm Tra Cấu Hình Chatbot

Sau khi deploy, kiểm tra xem chatbot có được cấu hình đúng không:

```bash
# Chạy script kiểm tra (nếu đã có trên VPS)
cd /home/deploy/Laumamnhatoi-erp
chmod +x check-chatbot-config.sh
./check-chatbot-config.sh
```

**Hoặc kiểm tra thủ công:**

```bash
# 1. Kiểm tra API key có trong .env không
cat apps/backend/.env | grep OPENAI_API_KEY

# 2. Kiểm tra log backend sau khi restart
pm2 logs laumam-backend --lines 30

# Tìm các dòng này:
# ✅ OpenAI client initialized successfully  <- Tốt!
# ⚠️  OPENAI_API_KEY not found              <- Có vấn đề!
```

### Bước 5: Đảm Bảo OPENAI_API_KEY Đã Được Cấu Hình

Nếu API key chưa có trong `.env`:

```bash
cd /home/deploy/Laumamnhatoi-erp/apps/backend

# Thêm API key vào .env (nếu chưa có)
echo "" >> .env
echo "OPENAI_API_KEY=sk-your-api-key-here" >> .env

# Hoặc dùng script setup
cd ../..
./setup-openai-key.sh sk-your-api-key-here
```

**Sau đó restart lại backend:**

```bash
pm2 restart laumam-backend
pm2 logs laumam-backend --lines 20
```

## Kiểm Tra Chatbot Hoạt Động

### 1. Qua Log Backend

```bash
pm2 logs laumam-backend | grep -i openai
```

Bạn sẽ thấy một trong các thông báo sau:

**✅ Thành công:**
```
✅ OpenAI client initialized successfully
   API Key loaded from: ConfigService
```

**❌ Có vấn đề:**
```
⚠️  OPENAI_API_KEY not found in environment variables.
   ConfigService has key: false
   process.env has key: false
```

### 2. Qua API Status Endpoint

```bash
# Sau khi đã login và có token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/admin/chatbot/status
```

Response sẽ có dạng:
```json
{
  "success": true,
  "configured": true,
  "message": "Chatbot đã được cấu hình và sẵn sàng sử dụng."
}
```

### 3. Test Trong Admin Page

1. Truy cập: `http://laumamnhatoi.vn/admin`
2. Đăng nhập với tài khoản admin
3. Click vào nút chat ở góc dưới bên phải
4. Thử hỏi: "Doanh thu hôm nay như thế nào?"

## Troubleshooting Nếu Vẫn Không Hoạt Động

### Vấn đề 1: API Key Có Nhưng Backend Không Đọc Được

**Giải pháp:**
```bash
# Kiểm tra file .env có ở đúng vị trí không
cd /home/deploy/Laumamnhatoi-erp/apps/backend
ls -la .env

# Kiểm tra PM2 working directory
pm2 info laumam-backend | grep cwd

# Nếu khác, có thể set trực tiếp trong ecosystem.config.js
nano /home/deploy/Laumamnhatoi-erp/ecosystem.config.js

# Thêm vào phần env:
env: {
  NODE_ENV: "production",
  PORT: 3001,
  OPENAI_API_KEY: "sk-your-api-key-here",
}
```

### Vấn đề 2: Backend Không Restart Sau Khi Thêm API Key

**Giải pháp:**
```bash
# Stop hoàn toàn
pm2 stop laumam-backend

# Đợi 5 giây
sleep 5

# Start lại
pm2 start laumam-backend

# Kiểm tra log ngay
pm2 logs laumam-backend --lines 20
```

### Vấn đề 3: Log Không Hiển Thị Thông Báo OpenAI

**Giải pháp:**
Có thể code cũ vẫn đang chạy. Đảm bảo đã:
1. ✅ Pull code mới
2. ✅ Build lại backend: `cd apps/backend && npm run build`
3. ✅ Restart PM2: `pm2 restart laumam-backend`

## Checklist Trước Khi Deploy

- [ ] Code đã được commit và push lên GitHub
- [ ] Đã SSH vào VPS
- [ ] Đã pull code mới: `git pull origin main`
- [ ] Đã build lại backend: `npm run build` trong `apps/backend`
- [ ] Đã restart PM2: `pm2 restart all`
- [ ] Đã kiểm tra log: `pm2 logs laumam-backend --lines 30`
- [ ] Đã thấy dòng: `✅ OpenAI client initialized successfully`
- [ ] Đã test chatbot trong admin page

## Tài Liệu Tham Khảo

- Chi tiết về cấu hình chatbot: `CHATBOT-SETUP.md`
- Script kiểm tra: `./check-chatbot-config.sh`
- Script setup API key: `./setup-openai-key.sh`

