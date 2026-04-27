<p align="center">
  <img src="../public/browser-tab-logo.png" alt="SakuraNav Logo" width="96">
</p>

<h1 align="center">🌸 SakuraNav</h1>

<p align="center">
  <strong>An Elegant Personal Navigation Page</strong> — Manage your bookmarks in one place
</p>

<p align="center">
  A full-stack navigation page based on Next.js + TypeScript + SQLite, supporting public browsing and login management
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite" alt="SQLite">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

<p align="center">
  <a href="DEVELOPMENT.md">Development Docs</a> ·
  <a href="../README.md">中文</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

---

## ✨ Features

<details>
<summary><strong>🎨 User Interface</strong></summary>

- **Responsive Design** — Perfectly adapts to desktop and mobile devices
- **Unified Settings Dialog** — Appearance management and system settings merged into one panel
- **Configurable Floating Buttons** — Customize floating action buttons in the bottom-right corner
- **Light/Dark Themes** — Support for light/dark theme switching, with system preference detection
- **Theme Customization** — Separate configuration for wallpaper, font, opacity, and text color for each theme
- **Dynamic Background** — Falling sakura petals in light mode, twinkling stars in dark mode
- **Frosted Glass Cards** — Independent toggle for frosted glass card effect on desktop and mobile, works without wallpaper
- **Separate Desktop/Mobile Wallpapers** — Different wallpapers for desktop and mobile devices
- **Three Font Presets** — Space Grotesk (tech), Noto Serif SC (editorial), Noto Sans SC (daily)
- **Custom Logo / Favicon** — Upload custom Logo and Favicon
- **Custom Site Name** — Customize the navigation site name, real-time update of browser tab title
- **Progressive Loading** — Infinite scroll pagination
- **Desktop Independent Scrolling** — Fixed header and sidebar with independent scroll on desktop
- **Tag Switch Animation** — pjax-like transition effect, cards animate in sequence

</details>

<details>
<summary><strong>🔐 Authentication</strong></summary>

- **Multi-user Registration & Login** — Support for multiple user accounts, each with independent data spaces
- **Admin Setup Wizard** — Create admin account via guided setup page on first visit
- **30-day Remember Login** — Supports persistent login sessions
- **Admin Re-authentication** — Password confirmation required for sensitive operations
- **Switch User** — Quick switch between logged-in users without password, with add/remove support
- **Account Deletion** — Users can self-delete their accounts and all associated data
- **Permission Control** — Hidden tags and sites are visible after login
- **Editor Console** — Dedicated `/editor` admin dashboard with batch management
- **Session Expiry Detection** — Automatic popup notification when session expires

</details>

<details>
<summary><strong>🏷️ Tag Management</strong></summary>

- **Tag Classification** — Websites displayed by tag categories, with Logo and description support
- **Drag & Drop Sorting** — Supports drag-to-reorder tags after login
- **Hidden Tags** — Can set hidden tags visible only after login
- **Custom Tag Logo** — Set independent Logo and background color for each tag
- **Tag Deletion Confirmation** — Confirmation dialog before deleting tags, auto-restore affected site order

</details>

<details>
<summary><strong>🌐 Website Management</strong></summary>

- **Website CRUD** — Manage website information after login
- **Drag & Drop Sorting** — Drag to reorder websites within a single tag after login
- **Pinned Sites** — Support for pinning websites to the top
- **Batch Management** — Supports associating websites with multiple tags
- **Text Icons** — Auto-generate icons from the first character of site name, with custom background color
- **Official Icons** — Dynamically load website Favicon, with auto-fallback on failure
- **Icon Background Color** — Custom background color for website icons
- **Site Online Detection** — Batch check website online status, with per-site skip option
- **AI Smart Analysis** — AI auto-detects title, description, and recommends tags with auto-association on selection
- **Card Header Actions** — Edit/delete buttons on opposite sides of card header, drag handle centered
- **Tag Overflow Truncation** — Auto-truncate card tag bar with "..." when overflowing
- **Card Type Indicator** — Decorative icon in bottom-right corner showing site/social card type
- **Image Cropping** — Crop wallpaper, Logo, and Favicon uploads for precise display control
- **Hover Popover** — View description and tag info by hovering over website cards

</details>

<details>
<summary><strong>📱 Social Cards</strong></summary>

- **Twelve Card Types** — QQ, WeChat, Email, Bilibili, GitHub, Blog, Telegram, Xiaohongshu, Douyin, QQ Group, Enterprise WeChat, WeChat Official Account
- **Detail Page** — All cards feature dedicated detail pages showing account info and QR codes
- **Custom Hint Text** — Each card can have customized hint text
- **Drag & Drop Sorting** — Social cards and website cards share unified drag-to-reorder

</details>

<details>
<summary><strong>🔍 Search Functionality</strong></summary>

- **Custom Search Engines** — Add, edit, delete search engines with custom name, URL, icon, and card color
- **Multi-Engine Switching** — Quick switching between search engines, with Tab key hint
- **Local Search** — Search site names, descriptions, and tags within current view
- **Search Suggestions** — Floating search dialog with real-time suggestions and keyboard navigation
- **AI Smart Recommendations** — AI-powered site recommendations based on search keywords

</details>

<details>
<summary><strong>🔑 Third-party Login</strong></summary>

- **OAuth Login** — Support for GitHub, WeChat, Enterprise WeChat, Feishu, and DingTalk
- **Online Configuration** — Manage OAuth providers from the admin panel with connectivity testing
- **Account Binding/Unbinding** — Bind and unbind third-party accounts in profile settings
- **Login Mode Switching** — Switch User dialog supports both OAuth and username/password login

</details>

<details>
<summary><strong>👤 User Profile</strong></summary>

- **Profile Management** — Edit nickname, username, and password
- **Avatar Upload** — Upload custom avatars from local files
- **Third-party Account Management** — View and manage bound OAuth accounts
- **Data Clearing** — Clear current user's tags and card data

</details>

<details>
<summary><strong>💾 Data Management</strong></summary>

- **Wallpaper Upload** — Local wallpaper upload or download via URL
- **Config Import/Export** — Supports configuration data import and export (ZIP format, full storage directory packaging)
- **Bookmark Import** — Import browser bookmark files (HTML), edit individually before batch adding
- **Three Import Modes** — Full overwrite, incremental merge, and bookmark import
- **Config Reset** — One-click reset to default configuration

</details>

---

## 🛠 Tech Stack

| Category | Technology |
|:---------|:-----------|
| Frontend Framework | Next.js 16 · React 19 · TypeScript |
| Backend Architecture | Next.js App Router Route Handlers |
| Database | SQLite + better-sqlite3 (WAL mode) |
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

> 💡 This project was built and verified with Node `v25.8.1` and npm `11.11.0`

---

## 🚀 Quick Start

### Option 1: Source Code Deployment

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Configuration File

Copy the configuration template:

```bash
cp config.example.yml config.yml
```

> The admin account is created via the setup wizard on first visit, no need to configure in the file.

#### 3. Build and Start

```bash
node build-and-run.js
```

This command will automatically:
- ✅ Run code linting (ESLint)
- ✅ Build the project
- ✅ Start the server

<details>
<summary>Optional Parameters</summary>

```bash
# Skip code linting
node build-and-run.js --skip-lint

# Skip build (use existing build artifacts)
node build-and-run.js --skip-build
```

</details>

---

### Option 2: Docker Source Build

#### 1. Clone the Project

```bash
git clone https://github.com/QingYu-Su/SakuraNav.git
cd SakuraNav
```

#### 2. Build the Image

```bash
docker build -t sakuranav:latest .
```

#### 3. Start the Container

```bash
docker run -d \
  --name sakuranav \
  --restart unless-stopped \
  -p 8080:8080 \
  -v ./data:/app/data \
  -e NODE_ENV=production \
  -e TZ=Asia/Shanghai \
  sakuranav:latest
```

The `./data` directory and default configuration files will be created automatically on first run.

#### 4. Access the Application

- 🌐 Main page: http://localhost:8080
- 🔐 First visit will show the admin setup wizard to create your admin account

---

### Option 3: Docker Compose

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
      - ./data:/app/data   # Data directory, auto-created on first run
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
```

#### 2. Start the Service

```bash
docker compose up -d
```

The `./data` directory and default configuration files will be created automatically on first run.

#### 3. Access the Application

- 🌐 Main page: http://localhost:8080
- 🔐 First visit will show the admin setup wizard to create your admin account

> 📖 For detailed configuration and troubleshooting, see [Docker Deployment Guide](DOCKER.md)

---

### Login Management

| Deployment | Login URL |
|:-----------|:----------|
| Source code | `http://localhost:8080/login` |
| Docker | `http://localhost:8080/login` |

After successful login, you can use:

| Feature | Description |
|:--------|:------------|
| Edit button | Enter `/editor` admin dashboard |
| Logout | End current session |
| Hidden tags/sites | Visible after login |
| Drag & Drop sorting | Reorder tags and websites |
| AI Features | Smart analysis and recommendations |

---

## ⚙️ Configuration

The configuration file is located at `config.yml` in the project root. First-time users need to copy it from the template:

```bash
cp config.example.yml config.yml
```

### Configuration Details

```yaml
# Server Configuration
server:
  port: 8080                    # Service port (default 8080)
```

> 💡 **Admin Account**: Created via the setup wizard on first visit, no need to configure in the file.
>
> 💡 **AI Model Configuration**: Configure in the admin panel under "Settings → Site → AI Model", no need to modify the config file.

### First Run

The following initialization will be automatically completed on first run:

- 📦 Create SQLite database file: `storage/database/sakuranav.sqlite`
- 📁 Create upload directory: `storage/uploads`
- 🔄 Automatically execute database schema migrations
- 🔐 First visit will show the admin setup wizard

No manual table creation or migration execution needed.

---

## ❓ FAQ

### Does it support multi-user?

Yes. Starting from v1.5.5, SakuraNav supports multi-user registration and login, with each user having an independent data space (tags, websites, appearance settings, etc.). It also supports OAuth third-party login (GitHub, WeChat, Enterprise WeChat, Feishu, DingTalk), which administrators can enable and configure from the admin panel.

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
