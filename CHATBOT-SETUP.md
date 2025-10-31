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

#### Trên VPS (Production):
Thêm vào file `.env` hoặc set biến môi trường:

```bash
# File .env trong apps/backend/
OPENAI_API_KEY=sk-your-api-key-here

# Hoặc export trực tiếp:
export OPENAI_API_KEY=sk-your-api-key-here
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

**Kiểm tra trên VPS:**
```bash
# Kiểm tra file .env
cat apps/backend/.env | grep OPENAI_API_KEY

# Kiểm tra log PM2
pm2 logs laumam-backend --lines 50

# Restart service
pm2 restart laumam-backend
```

**Kiểm tra API key có hợp lệ:**
- API key phải bắt đầu bằng `sk-`
- Không có khoảng trắng ở đầu/cuối
- Đảm bảo đã được save vào file `.env`

### 7. Model được sử dụng

Chatbot đang sử dụng model **o1-mini** của OpenAI để tối ưu chi phí và hiệu suất.

### 8. Chi phí

- Model `o1-mini` có giá rẻ hơn GPT-4
- Chỉ tính phí khi có request chat
- Xem giá chi tiết tại: https://openai.com/pricing

