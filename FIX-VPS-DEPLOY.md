# 🔧 Fix VPS Deploy Issues

## Vấn đề 1: Git Conflict - Local Changes

### Giải pháp A: Stash local changes (khuyến nghị)

```bash
# Stash local changes tạm thời
git stash

# Pull code mới
git pull origin main

# Apply lại local changes (nếu cần)
git stash pop
```

### Giải pháp B: Discard local changes (nếu không quan trọng)

```bash
# Xóa local changes
git reset --hard origin/main

# Pull lại
git pull origin main
```

### Giải pháp C: Commit local changes trước

```bash
# Commit local changes
git add .
git commit -m "Local changes on VPS"

# Pull với merge
git pull origin main

# Fix conflicts nếu có
```

## Vấn đề 2: Permission Denied cho deploy.sh

```bash
# Cho quyền thực thi
chmod +x deploy.sh

# Kiểm tra
ls -la deploy.sh
# Phải thấy: -rwxr-xr-x (có x)
```

## Hướng dẫn đầy đủ:

```bash
# 1. Vào thư mục project
cd /home/deploy/Laumamnhatoi-erp

# 2. Stash local changes
git stash

# 3. Pull code mới
git pull origin main

# 4. Cho quyền thực thi deploy.sh
chmod +x deploy.sh

# 5. Deploy
./deploy.sh
```

## Nếu vẫn có conflict sau khi stash:

```bash
# Xem các file conflict
git status

# Reset hard về remote
git fetch origin
git reset --hard origin/main

# Sau đó deploy
./deploy.sh
```

