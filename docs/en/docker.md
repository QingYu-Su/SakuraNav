# 🐳 Docker Deployment Guide

This guide covers how to deploy SakuraNav using Docker.

## Quick Start

### Prerequisites

| Dependency | Version |
|:-----------|:--------|
| Docker | `>= 20.10` |
| Docker Compose | `>= 2.0` (optional) |

### One-Click Deploy

#### 1. Create `docker-compose.yml`

```yaml
services:
  sakuranav:
    image: sqingyu/sakuranav:latest
    container_name: sakuranav
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
```

#### 2. Start Service

```bash
docker compose up -d
```

On first run, the following will be created automatically:

- ✅ `./data` directory
- ✅ Default config file `./data/config.yml`
- ✅ Database directory `./data/database`
- ✅ Upload directory `./data/uploads`
- ✅ Database file `./data/database/sakuranav.sqlite`

#### 3. Access Application

| Page | URL |
|:-----|:----|
| 🌐 Homepage | http://localhost:8080 |
| 🔐 Login page | http://localhost:8080/login |

---

## Deployment Methods

### Option 1: Pull from Docker Hub

```bash
docker compose up -d
```

### Option 2: Build Image Locally

```bash
git clone https://github.com/QingYu-Su/SakuraNav.git
cd SakuraNav
docker build -t sakuranav:latest .
# Update image in docker-compose.yml to: image: sakuranav:latest
docker compose up -d
```

### Option 3: Specify Version

```bash
docker pull sqingyu/sakuranav:v1.0.0
# Update image in docker-compose.yml to: image: sqingyu/sakuranav:v1.0.0
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|:---------|:--------|:------------|
| `NODE_ENV` | `production` | Runtime environment |
| `PORT` | `8080` | Container service port |
| `TZ` | `Asia/Shanghai` | Timezone |

### Port Configuration

```yaml
ports:
  - "9000:8080"  # Map host 9000 to container 8080
```

### Config File

The config file is at `./data/config.yml`, auto-generated on first run.

```yaml
server:
  port: 8080

database:
  type: sqlite  # sqlite / mysql / postgresql
```

> 💡 Admin account is created via the setup wizard on first visit.

---

## Data Persistence

### Directory Structure

```
data/
├── config.yml
├── .secret
├── database/
│   ├── sakuranav.sqlite
│   ├── sakuranav.sqlite-shm
│   └── sakuranav.sqlite-wal
└── uploads/
```

### Data Backup

```bash
tar -czf sakuranav-backup-$(date +%Y%m%d).tar.gz data/
```

### Data Restore

```bash
tar -xzf sakuranav-backup-20260330.tar.gz
docker compose restart
```

---

## Common Commands

| Command | Description |
|:--------|:------------|
| `docker compose up -d` | Start service |
| `docker compose down` | Stop service |
| `docker compose restart` | Restart service |
| `docker compose logs -f` | View live logs |
| `docker compose ps` | View container status |

### Update Image

```bash
docker pull sqingyu/sakuranav:latest
docker compose down
docker compose up -d
docker image prune -a
```

---

## Troubleshooting

### 1. Cannot Login After First Run

> First visit will show admin setup wizard

```bash
docker compose logs
```

### 2. Permission Errors

```bash
chmod -R 755 data/
sudo chown -R 1001:1001 data/
```

### 3. Port Conflict

```yaml
ports:
  - "9000:8080"
```

### 4. Database Lock (SQLite only)

```bash
docker compose ps   # Ensure only one container instance
docker compose restart
```

---

## Security Recommendations

| Recommendation | Description |
|:---------------|:------------|
| 🔑 Set admin password | Use setup wizard to create admin with strong password |
| 🔒 Use HTTPS | Configure SSL in reverse proxy (e.g., Nginx) |
| 🛡️ Restrict access | Use firewall rules |
| 💾 Regular backups | Backup `data` directory regularly |
| 🔄 Update image | Keep up to date with latest version |

---

## Reverse Proxy Configuration

<details>
<summary><strong>Nginx</strong></summary>

```nginx
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
    }
}
```

</details>

<details>
<summary><strong>Caddy</strong> (Auto HTTPS)</summary>

```
your-domain.com {
    reverse_proxy localhost:8080
}
```

</details>

---

## Update Strategy

```bash
# 1. Backup
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# 2. Pull latest
docker pull sqingyu/sakuranav:latest

# 3. Recreate container
docker compose down
docker compose up -d

# 4. Verify
docker compose logs -f
```

---

> 💡 **Tip**: First visit will show the admin setup wizard. Please regularly backup the `data` directory. For issues, check logs: `docker compose logs -f`
