# 🐳 Docker 部署指南

本文档详细介绍如何使用 Docker 部署 SakuraNav。

## 目录

- [快速开始](#快速开始)
- [部署方式](#部署方式)
- [配置说明](#配置说明)
- [数据持久化](#数据持久化)
- [常用命令](#常用命令)
- [常见问题](#常见问题)
- [安全建议](#安全建议)
- [性能优化](#性能优化)
- [反向代理配置](#反向代理配置)
- [更新策略](#更新策略)

---

## 快速开始

### 前置要求

| 依赖 | 版本 |
|:-----|:-----|
| Docker | `>= 20.10` |
| Docker Compose | `>= 2.0`（可选） |

### 一键部署

#### 1. 创建 `docker-compose.yml`

```yaml
services:
  sakuranav:
    image: sqingyu/sakuranav:latest
    container_name: sakuranav
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data   # 数据目录，首次运行自动创建
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
```

#### 2. 启动服务

```bash
docker compose up -d
```

首次运行会自动：

- ✅ 创建 `./data` 目录（Docker 自动创建）
- ✅ 生成默认配置文件 `./data/config.yml`
- ✅ 创建数据库目录 `./data/database`
- ✅ 创建上传目录 `./data/uploads`
- ✅ 创建数据库文件 `./data/database/sakuranav.sqlite`

#### 3. 访问应用

| 页面 | 地址 |
|:-----|:-----|
| 🌐 主页 | http://localhost:8080 |
| 🔐 Login page | http://localhost:8080/login |

---

## 部署方式

### 方式一：从 Docker Hub 拉取

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

---

## 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|:-------|:-------|:-----|
| `NODE_ENV` | `production` | 运行环境 |
| `PORT` | `8080` | 容器内服务端口 |
| `TZ` | `Asia/Shanghai` | 时区设置 |

### 端口配置

默认使用 `8080` 端口，可在 `docker-compose.yml` 中修改：

```yaml
ports:
  - "9000:8080"  # 将宿主机 9000 端口映射到容器 8080 端口
```

### 配置文件说明

配置文件位于 `./data/config.yml`，首次运行会自动生成。

```yaml
# 服务器配置
server:
  port: 8080  # 容器内端口，通常不需要修改
```

> 💡 管理员账户通过首次访问时的引导页创建，无需在配置文件中设置。

---

## 数据持久化

### 目录结构

所有用户数据存储在 `./data` 目录：

```
data/
├── config.yml           # 配置文件（自动生成，含数据库类型配置）
├── .secret              # 自动生成的会话密钥（未配置 server.secret 时自动创建）
├── database/
│   ├── sakuranav.sqlite     # SQLite 数据库文件（type 为 sqlite 时，首次运行自动创建）
│   ├── sakuranav.sqlite-shm # SQLite 共享内存文件
│   └── sakuranav.sqlite-wal # SQLite 预写日志文件
└── uploads/             # 上传文件目录（自动创建）
    └── *.png/jpg/...    # 用户上传的壁纸等文件
```

> 💡 `data` 目录无需手动创建，Docker 会自动创建。所有文件会在首次启动时自动生成。
>
> 💡 如需使用 MySQL 或 PostgreSQL，在 `config.yml` 中将 `database.type` 设为 `mysql` 或 `postgresql` 并填写连接信息即可。SQLite 文件仅在 `type: sqlite` 时创建。

### 数据备份

```bash
# 方式一：备份整个 data 目录
tar -czf sakuranav-backup-$(date +%Y%m%d).tar.gz data/

# 方式二：只备份数据库（SQLite 模式）
sqlite3 data/database/sakuranav.sqlite ".backup 'data/database/backup.sqlite'"
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
# 2. 复制备份文件到新服务器
scp sakuranav-backup-20260330.tar.gz user@new-server:/path/to/app/
tar -xzf sakuranav-backup-20260330.tar.gz

# 3. 启动服务
docker compose up -d
```

---

## 常用命令

### 容器管理

| 命令 | 说明 |
|:-----|:-----|
| `docker compose up -d` | 启动服务 |
| `docker compose down` | 停止服务 |
| `docker compose restart` | 重启服务 |
| `docker compose logs -f` | 查看实时日志 |
| `docker compose ps` | 查看容器状态 |

### 进入容器

```bash
# 进入容器 shell
docker exec -it sakuranav sh

# 查看数据库
docker exec -it sakuranav sqlite3 /app/storage/database/sakuranav.sqlite
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

---

## 常见问题

### 1. 首次运行后无法登录

> 首次访问时会自动进入管理员初始化引导页，请按提示创建管理员账户

```bash
# 查看容器启动日志
docker compose logs

# 如需修改端口等配置，编辑配置文件后重启容器
vim ./data/config.yml
docker compose restart
```

### 2. 权限错误

容器启动失败，日志显示权限错误：

```bash
# 确保 data 目录权限正确
chmod -R 755 data/

# 如果使用 Linux，可能需要设置所有者
sudo chown -R 1001:1001 data/
```

### 3. 端口冲突

端口 `8080` 已被占用：

```yaml
# 修改 docker-compose.yml 中的端口映射
ports:
  - "9000:8080"  # 使用其他端口
```

### 4. 数据库锁定错误（仅 SQLite 模式）

> 可能同时运行了多个容器实例

```bash
# 确保只有一个容器实例
docker compose ps

# 重启容器
docker compose restart
```

### 5. 配置文件未生效

```bash
# 重启容器
docker compose restart

# 查看容器日志确认
docker compose logs -f
```

### 6. 镜像拉取失败

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

```bash
# 查看容器日志
docker compose logs -f

# 检查应用是否正常启动
docker exec -it sakuranav wget -q -O- http://localhost:8080
```

### 8. 上传的图片无法访问

> uploads 目录权限问题

```bash
# 检查 uploads 目录
ls -la ./data/uploads/

# 修复权限
chmod -R 755 ./data/uploads/

# 重启容器
docker compose restart
```

---

## 安全建议

| 建议 | 说明 |
|:-----|:-----|
| 🔑 设置管理员密码 | 首次访问时通过引导页创建管理员账户，请设置强密码 |
| 🔒 使用 HTTPS | 在反向代理（如 Nginx）中配置 SSL 证书 |
| 🛡️ 限制访问 | 使用防火墙规则限制访问来源 |
| 💾 定期备份 | 定期备份 `data` 目录 |
| 🔄 更新镜像 | 定期更新到最新版本 |
| 🚫 不暴露敏感端口 | 只暴露必要的端口 |

---

## 性能优化

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

---

## 反向代理配置

<details>
<summary><strong>Nginx 配置</strong></summary>

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

</details>

<details>
<summary><strong>Caddy 配置</strong>（自动 HTTPS）</summary>

```
your-domain.com {
    reverse_proxy localhost:8080
}
```

Caddy 会自动配置 HTTPS。

</details>

<details>
<summary><strong>Traefik 配置</strong></summary>

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

</details>

---

## 更新策略

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

---

## 更多资源

| 资源 | 链接 |
|:-----|:-----|
| 📖 开发文档 | [DEVELOPMENT.md](./DEVELOPMENT.md) |
| 📋 更新日志 | [CHANGELOG.md](CHANGELOG.md) |
| 🐛 问题反馈 | [GitHub Issues](https://github.com/QingYu-Su/SakuraNav/issues) |

> 💡 **提示**: 首次访问时会自动进入管理员初始化引导页，请设置管理员账户和密码。请定期备份 `data` 目录以防数据丢失。如遇问题请查看日志：`docker compose logs -f`
