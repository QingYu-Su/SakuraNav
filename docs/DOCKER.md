# 🐳 Docker 部署指南

本文档详细介绍如何使用 Docker 部署 SakuraNav。

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
| 🔐 登录页 | http://localhost:8080/login |

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
│   ├── sakuranav.sqlite     # SQLite 数据库文件
│   ├── sakuranav.sqlite-shm # SQLite 共享内存文件
│   └── sakuranav.sqlite-wal # SQLite 预写日志文件
└── uploads/             # 上传文件目录
    └── *.png/jpg/...    # 用户上传的壁纸等文件
```

> 💡 `data` 目录无需手动创建，Docker 会自动创建。所有文件会在首次启动时自动生成。
>
> 💡 如需使用 MySQL 或 PostgreSQL，在 `config.yml` 中将 `database.type` 设为 `mysql` 或 `postgresql`，并配置对应的连接信息。

### 备份数据

```bash
# 备份整个数据目录
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# 恢复备份
tar -xzf backup-20260401.tar.gz
docker compose restart
```

---

## 常用命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 查看容器状态
docker compose ps

# 进入容器
docker exec -it sakuranav sh
```

---

## 常见问题

### 端口被占用

修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "9000:8080"  # 使用 9000 端口
```

### 数据库权限问题

```bash
# 确保 data 目录权限正确
chmod -R 755 data/
```

### 容器无法启动

```bash
# 查看详细日志
docker compose logs sakuranav

# 重新构建
docker compose down
docker compose up -d --build
```

---

## 安全建议

### 1. 不要暴露数据库端口

```yaml
# ❌ 错误：暴露数据库端口到宿主机
ports:
  - "3306:3306"

# ✅ 正确：仅暴露应用端口
ports:
  - "8080:8080"
```

### 2. 使用非 root 用户运行

SakuraNav 的 Docker 镜像默认以非 root 用户运行，无需额外配置。

### 3. 定期更新镜像

```bash
docker pull sqingyu/sakuranav:latest
docker compose down && docker compose up -d
```

### 4. 启用 HTTPS

建议在生产环境中使用 Nginx 或 Caddy 反向代理并启用 HTTPS。

---

## 性能优化

### 资源限制

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

### Nginx

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

### Caddy（自动 HTTPS）

```
your-domain.com {
    reverse_proxy localhost:8080
}
```

Caddy 会自动配置 HTTPS。

### Traefik

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

> 💡 **提示**: 首次访问时会自动进入管理员初始化引导页，请设置管理员账户和密码。请定期备份 `data` 目录以防数据丢失。如遇问题请查看日志：`docker compose logs -f`
