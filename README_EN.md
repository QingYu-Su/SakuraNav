<p align="center">
  <img src="public/browser-tab-logo.png" alt="SakuraNav Logo" width="96">
</p>

<h1 align="center">🌸 SakuraNav</h1>

<p align="center">
  <strong>Elegant Personal Navigation Page</strong> — Manage your web bookmarks in one place · <a href="README.md">中文</a>
</p>

<p align="center">
  A full-stack navigation page built with Next.js + TypeScript, supporting public browsing and authenticated management
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
  <a href="https://sakura.suqingyu.com/">🚀 Live Demo</a> ·
  <a href="https://qingyu-su.github.io/SakuraNav/en/">📖 Documentation</a> ·
  <a href="https://qingyu-su.github.io/SakuraNav/en/changelog.html">📋 Changelog</a> ·
  <a href="README.md">🌐 中文</a>
</p>

---

## ✨ Key Features

- 🎨 **Beautiful UI** — Light/dark theme, cherry blossom/starry sky dynamic backgrounds, responsive design, wallpaper & glassmorphism customization, tab switch animations
- 🤖 **AI-Powered** — Smart website analysis, keyword suggestions, browser bookmark smart import, related site recommendations
- 📝 **Note Cards** — Markdown editing & preview, image/file uploads, `sakura-site://` reference sync with website todos
- 🏷️ **Flexible Management** — Drag & drop sorting, multi-tag association, online detection, sticky notes, alternate URLs, context menu
- 📱 **Social Cards** — 12 social platform cards with dedicated detail pages for account info and QR codes
- 👥 **Multi-User** — Independent data spaces, OAuth login (GitHub/WeChat/Feishu/DingTalk), onboarding page, version snapshots & restore
- 💾 **Multi-Database** — SQLite / MySQL / PostgreSQL one-click switch; ZIP import/export, browser bookmark import
- 🔔 **Offline Notifications** — Webhook notification channels with automatic alerts on site offline events
- 🔐 **Security** — CSRF/SSRF/XSS protection, rate limiting, JWT + HttpOnly Cookie, token revocation

---

## 🛠 Tech Stack

| Category | Technologies |
|:---------|:-------------|
| Frontend | Next.js 16 · React 19 · TypeScript |
| Backend | Next.js App Router Route Handlers |
| Database | SQLite / MySQL / PostgreSQL (DatabaseAdapter unified API) |
| Drag & Drop | @dnd-kit |
| Auth | jose + HttpOnly Cookie + OAuth 2.0 |
| Styling | Tailwind CSS 4 |
| AI | Vercel AI SDK + multi-provider OpenAI-compatible API |
| Performance | React Compiler |
| Validation | Zod |
| Config | YAML |

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

# 2. Copy config file
cp config.example.yml config.yml

# 3. Build and start
node build-and-run.js
```

This command automatically runs linting (ESLint), project build, and starts the server.

> The admin account is created through the onboarding page on first visit — no configuration needed.

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
      - TZ:Asia/Shanghai
```

```bash
docker compose up -d
```

On first run, the `./data` directory and default config file will be created automatically. Visit http://localhost:8080 to enter the onboarding page.

> 📖 For more deployment options (building Docker image from source, etc.), see the [Docker Deployment Guide](https://qingyu-su.github.io/SakuraNav/en/docker.html)

---

## ⚙️ Configuration

The config file is located at `config.yml` in the project root. Copy from the template on first use:

```bash
cp config.example.yml config.yml
```

### Configuration Options

```yaml
server:
  port: 8080                    # Server port (default: 8080)

database:
  type: sqlite                  # Database type: sqlite / mysql / postgresql
```

> 💡 **Admin Account**: Created through the onboarding page on first visit — no config file setup needed.
>
> 💡 **AI Model Configuration**: Configure in the admin panel under "Settings → Site → AI Model" — no config file changes needed.

### First Run

On first startup, the following initialization happens automatically:

- 📦 Creates database file (SQLite default path: `storage/database/sakuranav.sqlite`)
- 📁 Creates upload directory: `storage/uploads`
- 🔄 Runs database schema migrations automatically
- 🔐 Enters admin onboarding page on first visit

No manual table creation or migration needed.

---

## 🤖 AI-Assisted Development

The project includes a `.context/` directory for AI-assisted development to quickly establish project context:

| File | Purpose |
|:-----|:--------|
| [`init.md`](.context/init.md) | Project context entry point — read this first in a new AI conversation |
| [`develop.md`](.context/develop.md) | Development standards — constraints AI must follow when coding |
| [`check.md`](.context/check.md) | Pre-commit checklist — scoring after code changes are complete |
| [`update.md`](.context/update.md) | Version release workflow — updating CHANGELOG and README |

---

## 📄 License

This project is released under the [MIT License](LICENSE).

---

## 👥 Contributors

Thanks to all developers who have contributed to this project!

<table>
  <tr>
    <td align="center"><a href="https://github.com/QingYu-Su"><img src="https://avatars.githubusercontent.com/u/79574594?v=4&s=64" width="64" style="border-radius:50%;"><br><b>QingYu Su</b></a></td>
  </tr>
</table>
