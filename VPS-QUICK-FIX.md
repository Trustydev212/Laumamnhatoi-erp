# ⚡ Quick Fix cho VPS

## Lỗi "Permission denied"

Nếu gặp lỗi `-bash: ./deploy.sh: Permission denied`, chạy:

```bash
chmod +x deploy.sh
```

## Quy trình deploy đầy đủ

```bash
# 1. Reset về remote (nếu có conflicts)
git fetch origin
git reset --hard origin/main

# 2. Cho quyền thực thi (lần đầu hoặc sau khi reset)
chmod +x deploy.sh

# 3. Deploy
./deploy.sh
```

## Từ lần deploy sau

Chỉ cần:

```bash
./deploy.sh
```

Script sẽ tự động:
- Stash local changes (nếu có)
- Pull code mới
- Install dependencies
- Build và deploy

---

## Lưu ý

- `chmod +x deploy.sh` chỉ cần chạy 1 lần, hoặc sau khi `git reset --hard`
- Sau khi reset, quyền file có thể bị mất, nên cần chmod lại

