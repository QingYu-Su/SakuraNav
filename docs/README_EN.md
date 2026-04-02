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
  <a href="../README.md">中文</a> •
  <a href="../CHANGELOG.md">Changelog</a>
</p>

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Configuration](#configuration)

## Features

### User Interface

- **Responsive Design** - Perfectly adapts to desktop and mobile devices
- **Light/Dark Themes** - Support for light/dark theme switching, with system preference detection
- **Theme Customization** - Separate configuration for wallpaper, font, opacity, and text color for each theme
- **Dynamic Background** - Falling sakura petals in light mode, twinkling stars in dark mode
- **Frosted Glass Cards** - Independent toggle for frosted glass card effect on desktop and mobile
- **Separate Desktop/Mobile Wallpapers** - Different wallpapers for desktop and mobile devices
- **Three Font Presets** - Space Grotesk (tech), Noto Serif SC (editorial), Noto Sans SC (daily)
- **Custom Logo / Favicon** - Upload custom Logo and Favicon
- **Progressive Loading** - Infinite scroll pagination in both "All Sites" mode and tag view

### Authentication

- **Hidden Login Route** - Customizable login entry path (`admin.path`) invisible to visitors
- **Single User Login** - Supports 30-day remember login
- **Admin Re-authentication** - Password confirmation required for sensitive operations
- **Permission Control** - Hidden tags and sites are visible after login
- **Editor Console** - Dedicated `/editor` admin dashboard page

### Tag Management

- **Tag Classification** - Websites displayed by tag categories
- **Drag & Drop Sorting** - Supports drag-to-reorder tags after login
- **Hidden Tags** - Can set hidden tags visible only after login

### Website Management

- **Website CRUD** - Manage website information after login
- **Drag & Drop Sorting** - Drag to reorder websites within a single tag after login
- **Pinned Sites** - Support for pinning websites to the top
- **Batch Management** - Supports associating websites with multiple tags

### Search Functionality

- **Multi-Engine Support** - Switch between Google / Baidu / Local search
- **Local Search** - Search site names, descriptions, and tags within current view
- **Search Suggestions** - Floating search dialog with real-time suggestions and keyboard navigation

### Data Management

- **Wallpaper Upload** - Local wallpaper upload or download via URL
- **Config Import/Export** - Supports configuration data import and export (ZIP format)
- **Config Reset** - One-click reset to default configuration

## Tech Stack

| Category | Technology |
|---------|-----------|
| Frontend Framework | Next.js 16, React 19, TypeScript |
| Backend Architecture | Next.js App Router Route Handlers |
| Database | SQLite + better-sqlite3 (WAL mode) |
| Drag & Drop | @dnd-kit |
| Authentication | jose + HttpOnly Cookie |
| Styling | Tailwind CSS 4 |
| Performance | React Compiler |
| Config Files | YAML |

## Requirements

- Node.js `>= 20`
- npm `>= 10`

> This project was built and verified with Node `v25.8.1` and npm `11.11.0`

## Quick Start

### Option 1: Docker Deployment (Recommended)

#### 1. Create docker-compose.yml

```yaml
services:
  sakuranav:
    image: sqingyu/sakuranav:latest
    container_name: sakuranav
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      # Data directory: stores database, config files, and uploaded files
      # Automatically created on first run
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
```

#### 2. Start the Service

```bash
docker compose up -d
```

The `./data` directory and default configuration files will be created automatically on first run.

#### 3. Change Admin Password

```bash
# Edit configuration file
vim ./data/config.yml

# Restart container after changing admin.password
docker compose restart
```

#### 4. Access the Application

- Main page: http://localhost:8080
- Login page: http://localhost:8080/login (default, customizable in config)

> 💡 For detailed configuration and troubleshooting, see [Docker Deployment Guide](DOCKER.md)

---

### Option 2: Source Code Deployment

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Configuration File

Copy the configuration template:

```bash
cp config.example.yml config.yml
```

Modify the admin credentials in `config.yml`:

```yaml
admin:
  username: "admin"
  password: "sakura"
```

#### 3. Build and Start

```bash
node build-and-run.js
```

This command will automatically:
- Run code linting (ESLint)
- Build the project
- Start the server

**Optional Parameters:**

```bash
# Skip code linting
node build-and-run.js --skip-lint

# Skip build (use existing build artifacts)
node build-and-run.js --skip-build
```

---

### Login Management

Default login URL: `http://localhost:3000/login` (source deployment) or `http://localhost:8080/login` (Docker deployment)

After successful login, you can use:
- Edit button to enter `/editor` admin dashboard
- Logout button
- View hidden tags and sites
- Drag to reorder tags
- Drag to reorder websites

## Configuration

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
  username: "admin"
  # Admin password (default sakura, recommend changing to a strong password)
  password: "sakura"
  # Login entry path (default login, access URL is /login)
  path: "login"
```

### Configuration Recommendations

**Before deploying to production, make sure to change:**

1. `admin.password` - Set a strong password
2. `admin.path` - Customize the login entry path for better security
3. `server.port` - Modify the port as needed

### First Run

The following initialization will be automatically completed on first run:

- Create SQLite database file: `storage/sakuranav.sqlite`
- Create upload directory: `storage/uploads`
- Write sample tags, sample websites, and default theme configuration
- Automatically execute database schema migrations

No manual table creation or migration execution needed.

## License

This project is released under the [MIT License](../LICENSE).

## Contributors

Thanks to all the contributors who have helped with this project!

<a href="https://github.com/QingYu-Su/SakuraNav/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=QingYu-Su/SakuraNav" />
</a>
