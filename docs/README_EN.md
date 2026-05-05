<p align="center">
  <img src="../public/browser-tab-logo.png" alt="SakuraNav Logo" width="96">
</p>

<h1 align="center">🌸 SakuraNav</h1>

<p align="center">
  <strong>An Elegant Personal Navigation Page</strong> — Manage your bookmarks in one place
</p>

<p align="center">
  A full-stack navigation page based on Next.js + TypeScript, supporting public browsing and login management
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/SQLite/MySQL/PostgreSQL-003B57?logo=sqlite" alt="Multi-DB">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

<p align="center">
  <a href="DEVELOPMENT.md">Development Docs</a> ·
  <a href="../README.md">中文</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

---

## ✨ Core Features

- 🎨 **Refined Interface** — Light/dark themes, sakura/star dynamic backgrounds, responsive design, customizable wallpaper & frosted glass, tag switch animations
- 🤖 **AI-Powered** — Smart site analysis, keyword recommendations, intelligent browser bookmark import, related site suggestions
- 📝 **Note Cards** — Markdown editing & preview, image/file upload, `sakura-site://` reference syncs site Todo items
- 🏷️ **Flexible Management** — Drag & drop sorting, multi-tag association, online detection, memo notes, alternate URLs, context menu
- 📱 **Social Cards** — 12 social platform card types with dedicated detail pages showing account info and QR codes
- 👥 **Multi-user** — Independent data spaces, OAuth login (GitHub/WeChat/Feishu/DingTalk), setup wizard, version snapshots & restore
- 💾 **Multi-Database** — SQLite / MySQL / PostgreSQL, one-click switch; ZIP import/export, browser bookmark import
- 🔐 **Security** — CSRF/SSRF/XSS protection, rate limiting, JWT + HttpOnly Cookie, token revocation

---

## 🛠 Tech Stack

| Category | Technology |
|:---------|:-----------|
| Frontend Framework | Next.js 16 · React 19 · TypeScript |
| Backend Architecture | Next.js App Router Route Handlers |
| Database | SQLite / MySQL / PostgreSQL (DatabaseAdapter unified API) |
| Drag & Drop | @dnd-kit |
| Authentication | jose + HttpOnly Cookie + OAuth 2.0 |
| Styling | Tailwind CSS 4 |
| AI Capabilities | Vercel AI SDK + Multi-provider OpenAI-compatible API |
| Performance | React Compiler |
| Validation | Zod |
| Config Files | YAML |

---

## 📋 Requirements

| Dependency | Minimum Version |
|:-----------|:----------------|
| Node.js | `>= 20` |
| npm | `>= 10` |

---

## 🚀 Quick Start

### Option 1: Source Code Deployment

```bash
# 1. Install dependencies
npm install

# 2. Copy config template
cp config.example.yml config.yml

# 3. Build and start
node build-and-run.js
```

This command will automatically run code linting (ESLint), build the project, and start the server.

> The admin account is created via the setup wizard on first visit, no need to configure in the file.

### Option 2: Docker Compose

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

```bash
docker compose up -d
```

The `./data` directory and default configuration files will be created automatically on first run. Visit http://localhost:8080 to enter the setup wizard.

> 📖 For more deployment options (building Docker image from source, etc.), see [Docker Deployment Guide](DOCKER.md)

---

## ⚙️ Configuration

The configuration file is located at `config.yml` in the project root. First-time users need to copy it from the template:

```bash
cp config.example.yml config.yml
```

### Configuration Details

```yaml
server:
  port: 8080                    # Service port (default 8080)

database:
  type: sqlite                  # Database type: sqlite / mysql / postgresql
```

> 💡 **Admin Account**: Created via the setup wizard on first visit, no need to configure in the file.
>
> 💡 **AI Model Configuration**: Configure in the admin panel under "Settings → Site → AI Model", no need to modify the config file.

### First Run

The following initialization will be automatically completed on first run:

- 📦 Create database file (SQLite default path: `storage/database/sakuranav.sqlite`)
- 📁 Create upload directory: `storage/uploads`
- 🔄 Automatically execute database schema migrations
- 🔐 First visit will show the admin setup wizard

No manual table creation or migration execution needed.

---

## 🤖 AI-Assisted Development

The `.context/` directory provides context files for AI-assisted development:

| File | Purpose |
|:-----|:--------|
| [`init.md`](../.context/init.md) | Project context entry point, read this first in a new AI conversation |
| [`develop.md`](../.context/develop.md) | Development rules that AI must follow when coding |
| [`check.md`](../.context/check.md) | Pre-commit checklist, run scoring after code changes |
| [`update.md`](../.context/update.md) | Version release workflow, updates CHANGELOG and README |

---

## 📄 License

This project is released under the [MIT License](../LICENSE).

---

## 👥 Contributors

Thanks to all the contributors who have helped with this project!

<table>
  <tr>
    <td align="center"><a href="https://github.com/QingYu-Su"><img src="https://avatars.githubusercontent.com/u/79574594?v=4&s=64" width="64" style="border-radius:50%;"><br><b>QingYu-Su</b></a></td>
  </tr>
</table>
