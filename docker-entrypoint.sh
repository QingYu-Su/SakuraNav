#!/bin/sh
set -e

# 数据目录
DATA_DIR="/app/data"
CONFIG_FILE="$DATA_DIR/config.yml"
CONFIG_EXAMPLE="/app/config.example.yml"

echo "========================================="
echo "   SakuraNav 容器启动中..."
echo "========================================="
echo ""

# 步骤 1: 确保 data 目录存在（Docker 会自动创建，但以防万一）
if [ ! -d "$DATA_DIR" ]; then
    echo "📁 创建数据目录: $DATA_DIR"
    mkdir -p "$DATA_DIR"
fi

# 步骤 2: 检查并创建配置文件
if [ ! -f "$CONFIG_FILE" ]; then
    echo "⚙️  配置文件不存在，正在创建默认配置..."
    if [ -f "$CONFIG_EXAMPLE" ]; then
        cp "$CONFIG_EXAMPLE" "$CONFIG_FILE"
        echo "✅ 已创建默认配置文件: $CONFIG_FILE"
        echo "⚠️  重要提示："
        echo "   请修改 ./data/config.yml 文件设置管理员密码"
        echo "   然后重启容器：docker compose restart"
        echo ""
    else
        echo "❌ 错误：找不到配置模板文件"
        exit 1
    fi
else
    echo "✅ 配置文件已存在: $CONFIG_FILE"
fi

# 步骤 3: 创建必要的子目录
echo "📁 创建数据子目录..."
mkdir -p "$DATA_DIR/uploads"
echo "   ✓ uploads/ (上传文件目录)"

# 步骤 4: 创建软链接，让应用能找到配置文件和数据
echo "🔗 创建数据链接..."
# 配置文件链接
if [ ! -L "/app/config.yml" ] && [ ! -f "/app/config.yml" ]; then
    ln -s "$CONFIG_FILE" /app/config.yml
    echo "   ✓ config.yml -> $CONFIG_FILE"
fi

# storage 目录链接
if [ ! -L "/app/storage" ] && [ ! -d "/app/storage" ]; then
    ln -s "$DATA_DIR" /app/storage
    echo "   ✓ storage -> $DATA_DIR"
fi

# 步骤 5: 设置目录权限
if [ "$(id -u)" = "0" ]; then
    chown -R nextjs:nodejs "$DATA_DIR"
    echo "🔒 设置目录权限完成"
fi

echo ""
echo "========================================="
echo "   启动信息"
echo "========================================="
echo "📍 访问地址: http://localhost:${PORT:-8080}"
echo "🔐 登录地址: http://localhost:${PORT:-8080}/sakura-entry"
echo "📂 数据目录: $DATA_DIR"
echo "⚙️  配置文件: $CONFIG_FILE"
echo "========================================="
echo ""

# 启动应用
exec node server.js
