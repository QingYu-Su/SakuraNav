<p align="center">
  <img src="../public/browser-tab-logo.png" alt="SakuraNav Logo" width="120">
</p>

<h1 align="center">SakuraNav</h1>

<p align="center">
  <strong>An Elegant Personal Navigation Page</strong>
</p>

<p align="center">
  A full-stack navigation page project based on Next.js + TypeScript + SQLite, supporting public browsing and login management modes
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#configuration">Configuration</a> •
  <a href="DEVELOPMENT.md">Development Docs</a> •
  <a href="../README.md">中文</a>
</p>

---

## 📑 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Configuration](#configuration)

## ✨ Features

### 🎨 User Interface

- **Responsive Design** - Perfectly adapts to desktop and mobile devices
- **Light/Dark Themes** - Support for light/dark theme switching
- **Theme Customization** - Separate configuration for wallpaper, font, opacity, and text color for each theme
- **Progressive Loading** - Supports progressive loading in both "All Sites" mode and tag view

### 🔐 Authentication

- **Hidden Login Route** - Customizable login entry path invisible to visitors
- **Single User Login** - Supports 30-day remember login
- **Permission Control** - Hidden tags and sites are visible after login

### 🏷️ Tag Management

- **Tag Classification** - Websites displayed by tag categories
- **Drag & Drop Sorting** - Supports drag-to-reorder tags after login
- **Hidden Tags** - Can set hidden tags visible only after login

### 🌐 Website Management

- **Website CRUD** - Manage website information after login
- **Drag & Drop Sorting** - Drag to reorder websites within a single tag after login
- **Batch Management** - Supports associating websites with multiple tags

### 🔍 Search Functionality

- **Multi-Engine Support** - Switch between Google / Baidu / Local search
- **Local Search** - Search site names, descriptions, and tags within current view

### 📤 Data Management

- **Wallpaper Upload** - Local wallpaper upload
- **Config Import/Export** - Supports configuration data import and export

## 🛠️ Tech Stack

| Category | Technology |
|---------|-----------|
| Frontend Framework | Next.js 16, React 19, TypeScript |
| Backend Architecture | Next.js App Router Route Handlers |
| Database | SQLite + better-sqlite3 |
| Drag & Drop | @dnd-kit |
| Authentication | jose + HttpOnly Cookie |
| Styling | Tailwind CSS 4 |
| Config Files | YAML |

## 📋 Requirements

- Node.js `>= 20`
- npm `>= 10`

> This project was built and verified with Node `v25.8.1` and npm `11.11.0`

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configuration File

Copy the configuration template:

```bash
cp config.example.yml config.yml
```

Modify the admin credentials in `config.yml`:

```yaml
admin:
  username: admin
  password: sakura
```

### 3. Start the Project

**Development Environment:**

```bash
npm run dev
```

Access URL: http://localhost:3000

**Production Environment (Recommended):**

```bash
npm run build:start
```

This command will automatically:
- Run code linting (ESLint)
- Build the project
- Start the server

**Optional Parameters:**

```bash
# Skip code linting
npm run build:start:skip-lint

# Skip build (use existing build artifacts)
npm run build:start:skip-build

# Silent mode startup
npm run start:silent
```

### 4. Login Management

Default login URL: `http://localhost:3000/sakura-entry`

After successful login, you can use:
- Edit button
- Logout button
- View hidden tags and sites
- Drag to reorder tags
- Drag to reorder websites

## ⚙️ Configuration

### Configuration File Description

The configuration file is located at `config.yml` in the project root. First-time users need to copy it from `config.example.yml`:

```bash
cp config.example.yml config.yml
```

### Configuration Details

```yaml
# Server Configuration
server:
  # Service port (default 8080)
  port: 8080

# Admin Account Configuration
admin:
  # Admin username
  username: admin
  # Admin password (default sakura, recommend changing to a strong password)
  password: sakura
```

### Configuration Recommendations

**Before deploying to production, make sure to change:**

1. `admin.password` - Set a strong password
2. `server.port` - Modify the port as needed

### First Run

The following initialization will be automatically completed on first run:

- Create SQLite database file: `storage/sakuranav.sqlite`
- Create upload directory: `storage/uploads`
- Write sample tags, sample websites, and default theme configuration

No manual table creation or migration execution needed.

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=QingYu-Su/SakuraNav&type=Date)](https://star-history.com/#QingYu-Su/SakuraNav&Date)

## 📄 License

This project is released under the [MIT License](../LICENSE).