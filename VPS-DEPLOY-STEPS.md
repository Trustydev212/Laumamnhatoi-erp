# 🚀 Lệnh chạy trên VPS (Copy từng bước)

## Bước 1: Xử lý Git conflict

```bash
# Xóa local changes trên deploy.sh (giữ lại code từ git)
git checkout -- deploy.sh
```

## Bước 2: Pull code mới

```bash
git pull origin main
```

## Bước 3: Cho quyền thực thi

```bash
chmod +x deploy.sh
```

## Bước 4: Deploy

```bash
./deploy.sh
```

---

## HOẶC: Reset hoàn toàn về remote (nếu local changes không quan trọng)

```bash
# Reset hard về remote
git fetch origin
git reset --hard origin/main

# Cho quyền và deploy
chmod +x deploy.sh
./deploy.sh
```

---

## Full command sequence (copy tất cả):

```bash
cd /home/deploy/Laumamnhatoi-erp
git checkout -- deploy.sh
git pull origin main
chmod +x deploy.sh
./deploy.sh
```

