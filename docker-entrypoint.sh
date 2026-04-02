#!/bin/sh
set -e

# 数据目录
DATA_DIR="/app/data"
CONFIG_FILE="$DATA_DIR/config.yml"
CONFIG_EXAMPLE="/app/config.example.yml"

# ANSI 颜色代码
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
RESET='\033[0m'
BOLD='\033[1m'

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

# 读取管理员配置
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="sakura"
ADMIN_PATH="login"
if [ -f "$CONFIG_FILE" ]; then
    # 提取 username
    username_line=$(grep -E "^\s*username:" "$CONFIG_FILE" | head -n1)
    if [ -n "$username_line" ]; then
        ADMIN_USERNAME=$(echo "$username_line" | sed 's/.*username:\s*//' | tr -d '[:space:]' | tr -d '"')
    fi
    # 提取 password
    password_line=$(grep -E "^\s*password:" "$CONFIG_FILE" | head -n1)
    if [ -n "$password_line" ]; then
        ADMIN_PASSWORD=$(echo "$password_line" | sed 's/.*password:\s*//' | tr -d '[:space:]' | tr -d '"')
    fi
    # 提取 path
    path_line=$(grep -E "^\s*path:" "$CONFIG_FILE" | head -n1)
    if [ -n "$path_line" ]; then
        ADMIN_PATH=$(echo "$path_line" | sed 's/.*path:\s*//' | tr -d '[:space:]' | tr -d '"')
    fi
fi

# 打印 Banner（与 build-and-run.js 一致）
echo ""
printf "${MAGENTA}  ╔══════════════════════════════════════╗${RESET}\n"
printf "${MAGENTA}  ║           S a k u r a N a v          ║${RESET}\n"
printf "${MAGENTA}  ╚══════════════════════════════════════╝${RESET}\n"
echo ""
printf "${GREEN}  ✨ 优雅的个人导航页${RESET}\n"
printf "${CYAN}  📦 Next.js 16 + React 19 + TypeScript + SQLite${RESET}\n"
printf "${YELLOW}  🎨 响应式设计 | 明暗主题 | 拖拽排序 | 渐进式加载${RESET}\n"
echo ""

# 启动项目
printf "${YELLOW}  🚀 正在启动项目...${RESET}\n"
printf "${GREEN}  ✅ 启动成功${RESET}\n"
echo ""
printf "${YELLOW}  ▶ 服务端口: ${CYAN}http://localhost:${PORT:-8080}${RESET}\n"
printf "${YELLOW}  ▶ 启动时间: ${CYAN}$(date '+%Y/%m/%d %H:%M:%S')${RESET}\n"
printf "${YELLOW}  ▶ 登录入口: ${CYAN}http://localhost:${PORT:-8080}/${ADMIN_PATH}${RESET}\n"
printf "${YELLOW}  ▶ 管理账号: ${CYAN}${ADMIN_USERNAME}${RESET}\n"
printf "${YELLOW}  ▶ 管理密码: ${CYAN}${ADMIN_PASSWORD}${RESET}\n"
echo ""
printf "${CYAN}  📋 服务日志输出:${RESET}\n"
echo ""

# 启动应用（过滤 Next.js 启动日志）
node server.js 2>&1 | grep -v -E '^\s*▲ Next\.js|^\s*-\s*(Local|Network):|^\s*✓ Ready'
