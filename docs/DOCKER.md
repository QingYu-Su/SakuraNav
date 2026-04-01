# Docker 部署指南

本文档详细介绍如何使用 Docker 部署 SakuraNav。

## 📋 目录

- [快速开始](#快速开始)
- [部署方式](#部署方式)
- [配置说明](#配置说明)
- [数据持久化](#数据持久化)
- [常用命令](#常用命令)
- [常见问题](#常见问题)

## 🚀 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+ (可选)

### 一键部署

#### 1. 创建 docker-compose.yml

```yaml
services:
  sakuranav:
    image: sqingyu/sakuranav:latest
    container_name: sakuranav
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      # 数据目录：存储数据库、配置文件和上传文件
      # 首次运行会自动创建，无需手动准备
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
```

#### 2. 启动服务

```bash
docker compose up -d
```

首次运行会自动：
- 创建 `./data` 目录（Docker 自动创建）
- 生成默认配置文件 `./data/config.yml`
- 创建上传目录 `./data/uploads`
- 创建数据库文件 `./data/sakuranav.sqlite`

#### 3. 修改管理员密码

**重要**: 首次部署后请务必修改管理员密码！

```bash
# 编辑配置文件
vim ./data/config.yml

# 修改 admin.password 后重启容器
docker compose restart
```

#### 4. 访问应用

打开浏览器访问：
- 主页: http://localhost:8080
- 登录页: http://localhost:8080/login （默认，可在配置文件中自定义）

## 📦 部署方式

### 方式一：从 Docker Hub 拉取（推荐）

```bash
# 创建 docker-compose.yml 文件（内容同上）
# 直接启动，镜像会自动拉取
docker compose up -d
```

### 方式二：本地构建镜像

```bash
# 克隆项目
git clone https://github.com/QingYu-Su/SakuraNav.git
cd SakuraNav

# 构建镜像
docker build -t sakuranav:latest .

# 修改 docker-compose.yml 中的 image 为本地镜像
# image: sakuranav:latest

# 启动服务
docker compose up -d
```

### 方式三：指定版本

```bash
# 拉取特定版本
docker pull sqingyu/sakuranav:v1.0.0

# 在 docker-compose.yml 中指定版本
# image: sqingyu/sakuranav:v1.0.0
```

## ⚙️ 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | `production` | 运行环境 |
| `PORT` | `8080` | 容器内服务端口 |
| `TZ` | `Asia/Shanghai` | 时区设置 |

### 端口配置

默认使用 8080 端口，可在 `docker-compose.yml` 中修改：

```yaml
ports:
  - "9000:8080"  # 将宿主机 9000 端口映射到容器 8080 端口
```

### 配置文件说明

配置文件位于 `./data/config.yml`，首次运行会自动生成。

**重要配置项**：

```yaml
# 服务器配置
server:
  port: 8080  # 容器内端口，通常不需要修改

# 管理员账号配置
admin:
  username: admin
  password: sakura  # ⚠️ 建议修改为强密码
  path: login  # 登录入口路径，访问地址为 /login
```

## 💾 数据持久化

### 目录结构

所有用户数据存储在 `./data` 目录：

```
data/
├── config.yml           # 配置文件（自动生成）
├── sakuranav.sqlite     # 数据库文件（首次运行自动创建）
├── sakuranav.sqlite-shm # SQLite 共享内存文件
├── sakuranav.sqlite-wal # SQLite 预写日志文件
└── uploads/             # 上传文件目录（自动创建）
    └── *.png/jpg/...    # 用户上传的壁纸等文件
```

**说明**：
- `data` 目录无需手动创建，Docker 会自动创建
- 所有文件会在首次启动时自动生成
- 配置文件使用默认配置，请务必修改管理员密码

### 数据备份

```bash
# 方式一：备份整个 data 目录
tar -czf sakuranav-backup-$(date +%Y%m%d).tar.gz data/

# 方式二：只备份数据库
sqlite3 data/sakuranav.sqlite ".backup 'data/backup.sqlite'"
```

### 数据恢复

```bash
# 解压备份文件
tar -xzf sakuranav-backup-20260330.tar.gz

# 重启容器
docker compose restart
```

### 迁移数据

```bash
# 在新服务器上
# 1. 创建 docker-compose.yml
# 2. 创建 data 目录
mkdir -p data

# 3. 复制备份文件到新服务器
scp sakuranav-backup-20260330.tar.gz user@new-server:/path/to/app/
tar -xzf sakuranav-backup-20260330.tar.gz

# 4. 启动服务
docker compose up -d
```

## 🔧 常用命令

### 容器管理

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看日志
docker compose logs -f

# 查看容器状态
docker compose ps
```

### 进入容器

```bash
# 进入容器 shell
docker exec -it sakuranav sh

# 查看数据库
docker exec -it sakuranav sqlite3 /app/storage/sakuranav.sqlite
```

### 更新镜像

```bash
# 1. 拉取最新镜像
docker pull sqingyu/sakuranav:latest

# 2. 重新创建容器
docker compose down
docker compose up -d

# 3. 清理旧镜像
docker image prune -a
```

### 清理资源

```bash
# 停止并删除容器
docker compose down

# 删除镜像
docker rmi sqingyu/sakuranav:latest

# 清理未使用的资源
docker system prune -a
```

## ❓ 常见问题

### 1. 首次运行后无法登录

**问题**: 使用默认密码无法登录

**原因**: 默认管理员密码为 `sakura`

**解决方案**:

```bash
# 查看容器启动日志
docker compose logs

# 编辑配置文件
vim ./data/config.yml

# 确认 admin.password 为 sakura，或修改为新密码
# 可以自定义登录路径 admin.path（可选）
admin:
  username: admin
  password: sakura
  path: login

# 重启容器
docker compose restart
```

### 2. 权限错误

**问题**: 容器启动失败，日志显示权限错误

**解决方案**:

```bash
# 确保 data 目录权限正确
chmod -R 755 data/

# 如果使用 Linux，可能需要设置所有者
sudo chown -R 1001:1001 data/
```

### 3. 端口冲突

**问题**: 端口 8080 已被占用

**解决方案**:

```bash
# 修改 docker-compose.yml 中的端口映射
ports:
  - "9000:8080"  # 使用其他端口
```

### 4. 数据库锁定错误

**问题**: SQLite 数据库锁定，无法写入

**原因**: 可能同时运行了多个容器实例

**解决方案**:

```bash
# 确保只有一个容器实例
docker compose ps

# 重启容器
docker compose restart
```

### 5. 配置文件未生效

**问题**: 修改配置文件后未生效

**解决方案**:

```bash
# 重启容器
docker compose restart

# 查看容器日志确认
docker compose logs -f
```

### 6. 镜像拉取失败

**问题**: 无法从 Docker Hub 拉取镜像

**解决方案**:

```bash
# 配置 Docker 镜像加速器
# 编辑 /etc/docker/daemon.json (Linux)
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn"
  ]
}

# 或使用本地构建
docker build -t sakuranav:latest .
```

### 7. 容器健康检查失败

**问题**: 容器健康检查失败

**解决方案**:

```bash
# 查看容器日志
docker compose logs -f

# 检查应用是否正常启动
docker exec -it sakuranav wget -q -O- http://localhost:8080
```

### 8. 上传的图片无法访问

**问题**: 上传壁纸后无法显示

**原因**: uploads 目录权限问题

**解决方案**:

```bash
# 检查 uploads 目录
ls -la ./data/uploads/

# 修复权限
chmod -R 755 ./data/uploads/

# 重启容器
docker compose restart
```

## 🔐 安全建议

1. **修改默认密码**: 首次部署后立即修改 `config.yml` 中的管理员密码
2. **使用 HTTPS**: 建议在反向代理（如 Nginx）中配置 SSL 证书
3. **限制访问**: 使用防火墙规则限制访问来源
4. **定期备份**: 定期备份 `data` 目录
5. **更新镜像**: 定期更新到最新版本
6. **不要暴露敏感端口**: 只暴露必要的端口

## 📊 性能优化

### 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  sakuranav:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 日志管理

限制日志大小：

```yaml
services:
  sakuranav:
    # ... 其他配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 🌐 反向代理配置

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Caddy 配置示例

```
your-domain.com {
    reverse_proxy localhost:8080
}
```

Caddy 会自动配置 HTTPS。

### Traefik 配置示例

在 `docker-compose.yml` 中添加 Traefik 标签：

```yaml
services:
  sakuranav:
    # ... 其他配置
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.sakuranav.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.sakuranav.tls.certresolver=letsencrypt"
      - "traefik.http.services.sakuranav.loadbalancer.server.port=8080"
```

## 🔄 更新策略

### 安全更新流程

```bash
# 1. 备份数据
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# 2. 拉取最新镜像
docker pull sqingyu/sakuranav:latest

# 3. 停止旧容器
docker compose down

# 4. 启动新容器
docker compose up -d

# 5. 验证服务
docker compose logs -f
```

### 回滚到旧版本

```bash
# 1. 停止当前容器
docker compose down

# 2. 修改 docker-compose.yml 指定旧版本
# image: sqingyu/sakuranav:v1.0.0

# 3. 启动容器
docker compose up -d

# 4. 如有需要，恢复数据备份
tar -xzf backup-20260330.tar.gz
docker compose restart
```

## 📚 更多资源

- [开发文档](./DEVELOPMENT.md)
- [更新日志](../CHANGELOG.md)
- [问题反馈](https://github.com/QingYu-Su/SakuraNav/issues)

## 💡 提示

- 首次运行后，请立即修改 `./data/config.yml` 中的管理员密码
- 定期备份 `data` 目录以防数据丢失
- 如果遇到问题，请查看容器日志：`docker compose logs -f`
