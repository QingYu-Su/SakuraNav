#!/bin/sh
set -e

# 数据目录
DATA_DIR="/app/data"
CONFIG_FILE="$DATA_DIR/config.yml"
CONFIG_EXAMPLE="/app/config.example.yml"

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
    else
        echo "❌ 错误：找不到配置模板文件"
        exit 1
    fi
else
    echo "✅ 配置文件已存在: $CONFIG_FILE"
fi

# 步骤 3: 创建必要的子目录
echo "📁 创建数据子目录..."
mkdir -p "$DATA_DIR/database"
echo "   ✓ database/ (数据库目录)"
mkdir -p "$DATA_DIR/uploads"
echo "   ✓ uploads/ (上传文件目录)"

# 步骤 4: 创建软链接，让应用能找到配置文件和数据
echo "🔗 创建数据链接..."
# 配置文件链接（强制替换，确保指向 data 目录中的用户配置）
rm -f /app/config.yml
ln -s "$CONFIG_FILE" /app/config.yml
echo "   ✓ config.yml -> $CONFIG_FILE"

# storage 目录链接
if [ ! -L "/app/storage" ]; then
    rm -rf /app/storage
    ln -s "$DATA_DIR" /app/storage
    echo "   ✓ storage -> $DATA_DIR"
fi

# 步骤 5: 设置目录权限
if [ "$(id -u)" = "0" ]; then
    chown -R nextjs:nodejs "$DATA_DIR"
    echo "🔒 设置目录权限完成"
fi

# 读取端口配置
PORT_FROM_CONFIG="8080"
if [ -f "$CONFIG_FILE" ]; then
    port_line=$(grep -E "^\s*port:" "$CONFIG_FILE" | head -n1)
    if [ -n "$port_line" ]; then
        PORT_FROM_CONFIG=$(echo "$port_line" | sed 's/.*port:\s*//' | tr -d '[:space:]' | tr -d '"')
    fi
fi

# 打印 Banner（与 build-and-run.js 统一调用 print-banner.js）
node /app/print-banner.js --port "${PORT:-$PORT_FROM_CONFIG}"

# 设置 PROJECT_ROOT 环境变量，确保应用能正确定位配置文件
export PROJECT_ROOT="/app"

# 启动应用（过滤 Next.js 启动日志）
node server.js 2>&1 | grep -v -E '^\s*▲ Next\.js|^\s*-\s*(Local|Network):|^\s*✓ Ready'
