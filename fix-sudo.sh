#!/bin/bash

# Script để cấp quyền sudo cho user deploy
# Chạy với quyền root

echo "Cấp quyền sudo cho user deploy..."

# Thêm user deploy vào group sudo
usermod -aG sudo deploy

# Tạo file sudoers cho user deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy

# Cấp quyền cho file
chmod 440 /etc/sudoers.d/deploy

echo "✅ Đã cấp quyền sudo cho user deploy"
echo "Bây giờ bạn có thể chuyển sang user deploy và tiếp tục deploy"
