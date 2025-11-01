# 🤖 Hướng Dẫn Cấu Hình Chatbot AI

## Cấu hình OPENAI_API_KEY

### 1. Lấy API Key từ OpenAI
- Truy cập: https://platform.openai.com/api-keys
- Đăng nhập và tạo API key mới
- Copy API key (bắt đầu bằng `sk-`)

### 2. Thêm vào Backend

#### Trên Local (Development):
Tạo hoặc chỉnh sửa file `.env` trong thư mục `apps/backend/`:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

#### Trên VPS (Production) - Hướng dẫn từng bước:

**Bước 1: SSH vào VPS**
```bash
ssh root@your-vps-ip
# hoặc
ssh deploy@your-vps-ip
```

**Bước 2: Di chuyển đến thư mục project**
```bash
cd /home/deploy/Laumamnhatoi-erp
# hoặc thư mục bạn đã deploy
```

**Bước 3: Kiểm tra xem file .env đã tồn tại chưa**
```bash
# Xem file .env có tồn tại không
ls -la apps/backend/.env

# Xem nội dung file .env (nếu có)
cat apps/backend/.env | grep OPENAI_API_KEY
```

**Bước 4: Thêm OPENAI_API_KEY vào file .env**

**Nếu file .env chưa tồn tại:**
```bash
# Tạo file .env mới
echo "OPENAI_API_KEY=sk-your-api-key-here" > apps/backend/.env
chmod 600 apps/backend/.env
```

**Nếu file .env đã tồn tại:**
```bash
# Thêm key vào cuối file
echo "" >> apps/backend/.env
echo "OPENAI_API_KEY=sk-your-api-key-here" >> apps/backend/.env
```

**Hoặc dùng nano/vim để chỉnh sửa:**
```bash
# Dùng nano
nano apps/backend/.env

# Thêm dòng này vào file:
# OPENAI_API_KEY=sk-your-api-key-here

# Lưu: Ctrl+O, Enter, Ctrl+X
```

**Bước 5: Kiểm tra lại**
```bash
# Xem lại nội dung
cat apps/backend/.env | grep OPENAI_API_KEY

# Kết quả mong đợi:
# OPENAI_API_KEY=sk-your-api-key-here
```

**Bước 6: Restart backend service**
```bash
# File .env trong apps/backend/
OPENAI_API_KEY=sk-your-api-key-here

# Tìm dòng này trong log:
# ✅ OpenAI client initialized successfully

# Nếu thấy dòng trên, chatbot đã sẵn sàng!
```

**Lệnh nhanh (copy/paste):**
```bash
# Thay YOUR_API_KEY_HERE bằng API key thực của bạn
cd /home/deploy/Laumamnhatoi-erp
echo "" >> apps/backend/.env
echo "OPENAI_API_KEY=YOUR_API_KEY_HERE" >> apps/backend/.env
pm2 restart laumam-backend
pm2 logs laumam-backend --lines 20
```

### 3. Kiểm tra cấu hình

Sau khi thêm API key, **BẮT BUỘC phải restart backend**:

```bash
# Nếu dùng PM2
pm2 restart laumam-backend

# Hoặc nếu chạy trực tiếp
# Dừng process cũ và chạy lại
npm run start:prod
```

### 4. Kiểm tra status

Sau khi restart, kiểm tra log backend xem có dòng:
```
✅ OpenAI client initialized successfully
```

Nếu thấy dòng này, chatbot đã sẵn sàng.

### 5. Test trong Admin Page

1. Đăng nhập vào Admin page: `http://your-domain/admin`
2. Click vào nút chat ở góc dưới bên phải
3. Thử hỏi: "Doanh thu hôm nay như thế nào?"

### 6. Troubleshooting

**Vấn đề: "Chatbot chưa được cấu hình"**

**Giải pháp:**
1. ✅ Kiểm tra API key đã được thêm vào `.env` file
2. ✅ Kiểm tra API key không có khoảng trắng thừa
3. ✅ Kiểm tra API key bắt đầu bằng `sk-`
4. ✅ **Restart backend service** (QUAN TRỌNG!)
5. ✅ Kiểm tra log backend để xem có lỗi gì không

**Kiểm tra trên VPS - Các lệnh cụ thể:**

**1. Kiểm tra API key đã được thêm chưa:**
```bash
cd /home/deploy/Laumamnhatoi-erp
cat apps/backend/.env | grep OPENAI_API_KEY
```

**2. Kiểm tra format API key (phải bắt đầu bằng sk-):**
```bash
cat apps/backend/.env | grep OPENAI_API_KEY | grep "^OPENAI_API_KEY=sk-"
```

**3. Kiểm tra log backend để xem có lỗi không:**
```bash
pm2 logs laumam-backend --lines 100 | grep -i openai
```

**4. Kiểm tra status chatbot qua API:**
```bash
# Sau khi đã login và có token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/admin/chatbot/status

# Hoặc qua Nginx
curl -H "Authorization: Bearer YOUR_TOKEN" http://your-domain/api/admin/chatbot/status
```

**5. Nếu cần sửa lại API key:**
```bash
# Xóa dòng cũ
sed -i '/^OPENAI_API_KEY=/d' apps/backend/.env

# Thêm dòng mới
echo "OPENAI_API_KEY=sk-your-new-api-key" >> apps/backend/.env

# Restart
pm2 restart laumam-backend
```

**6. Xem toàn bộ file .env (để kiểm tra):**
```bash
cat apps/backend/.env
```

**7. Kiểm tra PM2 process đang chạy:**
```bash
pm2 list
pm2 info laumam-backend
```

**8. Kiểm tra log khởi động để xem có thông báo OpenAI:**
```bash
# Xem log khi khởi động
pm2 logs laumam-backend --lines 50 | grep -i "openai\|chatbot"

# Hoặc xem toàn bộ log gần đây
pm2 logs laumam-backend --lines 100
```

**Tìm dòng này trong log để xác nhận chatbot đã được cấu hình:**
```
✅ OpenAI client initialized successfully
```

**Nếu thấy dòng này, có nghĩa là có vấn đề:**
```
⚠️  OPENAI_API_KEY not found in environment variables.
```

**9. Kiểm tra backend có đọc được biến môi trường không:**
```bash
# SSH vào VPS
cd /home/deploy/Laumamnhatoi-erp/apps/backend

# Kiểm tra file .env có tồn tại
ls -la .env

# Kiểm tra quyền file (nên là 600)
stat -c "%a %n" .env

# Xem nội dung (ẩn API key)
cat .env | sed 's/OPENAI_API_KEY=.*/OPENAI_API_KEY=***HIDDEN***/'
```

**10. Nếu API key đã có trong .env nhưng vẫn không hoạt động:**

**Giải pháp 1: Đảm bảo backend được restart đúng cách**
```bash
# Stop backend
pm2 stop laumam-backend

# Wait 5 giây
sleep 5

# Start lại
pm2 start laumam-backend

# Hoặc restart
pm2 restart laumam-backend

# Kiểm tra log ngay sau khi restart
pm2 logs laumam-backend --lines 30
```

**Giải pháp 2: Kiểm tra xem file .env có ở đúng vị trí không**
```bash
# PM2 chạy từ thư mục này (theo ecosystem.config.js)
cd /home/deploy/Laumamnhatoi-erp/apps/backend

# File .env PHẢI ở đây
pwd
# Kết quả phải là: /home/deploy/Laumamnhatoi-erp/apps/backend

ls -la .env
# File phải tồn tại ở đây
```

**Giải pháp 3: Set biến môi trường trực tiếp trong PM2 (nếu .env không hoạt động)**
```bash
# Chỉnh sửa ecosystem.config.js
nano /home/deploy/Laumamnhatoi-erp/ecosystem.config.js

# Thêm vào phần env của laumam-backend:
env: {
  NODE_ENV: "production",
  PORT: 3001,
  OPENAI_API_KEY: "sk-your-api-key-here",  # Thêm dòng này
},

# Sau đó reload PM2
pm2 delete laumam-backend
cd /home/deploy/Laumamnhatoi-erp
pm2 start ecosystem.config.js
pm2 save
```

**Kiểm tra API key có hợp lệ:**
- API key phải bắt đầu bằng `sk-`
- Không có khoảng trắng ở đầu/cuối
- Đảm bảo đã được save vào file `.env`
- File `.env` phải ở đúng vị trí: `apps/backend/.env`

### 7. Model được sử dụng

Chatbot đang sử dụng model **o1-mini** của OpenAI để tối ưu chi phí và hiệu suất.

**Lưu ý:** Model `o1-mini` không hỗ trợ `system` role trong messages, nên system prompt được gộp vào user message. Điều này không ảnh hưởng đến chất lượng phản hồi.

### 8. Chi phí

- Model `o1-mini` có giá rẻ hơn GPT-4
- Chỉ tính phí khi có request chat
- Xem giá chi tiết tại: https://openai.com/pricing

