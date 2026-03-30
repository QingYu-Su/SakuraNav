#!/bin/sh
set -e

# 配置文件路径
CONFIG_FILE="/app/config.yml"
CONFIG_EXAMPLE="/app/config.example.yml"

# 检查并创建配置文件
if [ ! -f "$CONFIG_FILE" ]; then
    echo "⚠️  配置文件不存在，正在创建默认配置..."
    if [ -f "$CONFIG_EXAMPLE" ]; then
        cp "$CONFIG_EXAMPLE" "$CONFIG_FILE"
        echo "✅ 已创建默认配置文件: $CONFIG_FILE"
        echo "⚠️  请修改挂载目录中的 config.yml 文件，设置管理员密码后重启容器！"
    else
        echo "❌ 错误：找不到配置模板文件 config.example.yml"
        exit 1
    fi
fi

# 创建必要的目录
mkdir -p /app/storage/uploads

# 设置目录权限
chown -R nextjs:nodejs /app/storage
chown nextjs:nodejs /app/config.yml

echo "🚀 启动 SakuraNav..."
echo "📍 访问地址: http://localhost:${PORT:-8080}"
echo "🔐 登录地址: http://localhost:${PORT:-8080}/sakura-entry"
echo ""

# 使用 su-exec 切换到 nextjs 用户并启动应用
exec su-exec nextjs node server.js
