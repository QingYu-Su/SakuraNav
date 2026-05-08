# Changelog

## [1.6.5] - 2026-05-05

### ✨ New Features

- **Note Cards** — Full note card module with Markdown editing & preview, image/file paste upload, lightbox, attachment management, site card reference with auto Todo sync
- **Multi-Database Support** — SQLite / MySQL / PostgreSQL one-click switch, unified DatabaseAdapter API and SQL dialect layer
- **Version Snapshots** — Version history snapshots with create, restore, and delete support
- **Virtual Tag Drag Sorting** — Virtual tags (all cards, social cards) support drag sorting with persistent positions
- **Online Check Optimization** — Online check only triggers on new site creation, URL change, or access control field change
- **AI Analysis Related Sites Reset** — AI analysis always resets non-locked related sites and auto-selects bidirectional associations

### 🐛 Bug Fixes

- **Export/Import Related Sites Missing** — Fixed export/import missing related site data
- **Display Not Refreshed After Edit** — Fixed card display not immediately updated after editing
- **Multi-User Data Isolation** — Fixed site data query not isolated by user
- **scrypt Memory Exceeded** — Reduced scrypt cost factor to fix memory overflow
- **Security Hardening** — Strengthened CSRF/SSRF/XSS protection, rate limiting, token revocation
- **Edit Modal Page Jump** — Fixed page jump on modal close, attachment download validation, and form change detection

### 🔧 Improvements

- **Session Secret Independent Storage** — Session secret stored in separate `.secret` file
- **Editor Refresh Strategy** — Optimized single card edit refresh, eliminated second full refresh from online check
- **UI Optimization** — Unified homepage title to "All Cards", simplified new card picker
- **Rendering Stability** — Optimized backdrop-filter rendering stability and transition animations
- **Startup Banner** — Refactored startup banner to unified script with dynamic version display
- **Seed Data Update** — Updated seed data with current database actual data

## [1.6.0] - 2026-05-03

### ✨ New Features

- **Site Memo Notes** — Add notes and todo lists to sites, todo items show badge on card, AI readable toggle
- **AI Workflow Assistant** — AI-assisted automated task planning
- **Related Recommendations** — Site card related recommendations based on AI analysis, recommend context participates in search
- **Access Control Rules** — Alternate URLs, context menu, exclusive hover popup
- **Context Menu** — Right-click quick action menu for site cards
- **Alternate URLs** — Set alternate access addresses with conditional auto-switching
- **Enhanced Export/Import** — Support site-only export/import, HMAC signature verification, AI duplicate removal
- **Tag Edit Dual Tab** — Tag edit modal redesigned as dual tab layout (basic info + related sites)
- **Site-Level Online Check** — Per-site online check configuration with timeout, match mode, and failure threshold
- **Duplicate URL Detection** — Auto-detect duplicate URLs on site creation
- **Enhanced Duplicate Card** — Enhanced duplicate card prompt with edit, delete, and jump options
- **Quick Search Filter** — User management, tag related sites, bookmark import list all support quick search filter
- **Enhanced Validation** — Enhanced username and password format validation rules
- **Custom Tooltip** — New Tooltip component replacing native title attribute

### 🐛 Bug Fixes

- **Undo Failure** — Fixed undo failure when deleting tag and sites simultaneously
- **Search Flicker** — Fixed flickering unrelated cards during search
- **Icon Selected State** — Fixed icon selected state lost after Tab switch
- **Tooltip Positioning** — Fixed Tooltip positioning failure due to display:contents
- **Alternate URL Toggle** — Fixed alternate URL toggle logic

### 🔧 Improvements

- **Frontend Architecture Refactor** — Main app components split into Composition Root architecture
- **Unified AI Analysis Entry** — Unified AI analysis entry, removed deprecated analysis API
- **Search Performance** — Optimized first search performance
- **Card Match Strategy** — Unified import card match strategy with dynamic import construction

## [1.5.5] - 2026-04-27

### ✨ New Features

- **Multi-User Registration & Login** — Support multi-user registration with independent data spaces
- **User Data Isolation** — Tags, sites, appearance config isolated by user
- **Switch User** — New user switch popup with password-free quick switch
- **Personal Space** — New profile page with avatar upload and password change
- **Account Deletion** — Support user self-service account deletion
- **OAuth Login** — OAuth login system supporting GitHub, WeChat, Feishu, DingTalk
- **Third-Party Account Binding** — Profile supports bind/unbind third-party accounts
- **OAuth Admin Panel** — Admin panel OAuth configuration management with connectivity test
- **AI Model Online Config** — AI model config migrated from config.yml to database
- **AI Provider + Model Selection** — Two-level AI config (provider + model)
- **Clear Data** — New "Clear Data" function for clearing user tags and cards

### 🐛 Bug Fixes

- **OAuth Callback URL** — Fixed OAuth callback redirecting to 0.0.0.0
- **GitHub OAuth Test** — Fixed GitHub OAuth test connectivity 404
- **OAuth Binding Flow** — Fixed OAuth binding creating new user incorrectly
- **Multi-User Experience** — Fixed 9 multi-user experience issues

## [1.5.0] - 2026-04-22

### ✨ New Features

- **Unified Settings Modal** — Appearance and system settings merged into one modal
- **Configurable Floating Buttons** — Custom floating action buttons
- **Tag Delete Confirmation** — Confirmation popup before tag deletion
- **Tag Delete Sort Recovery** — Auto-recover site sort positions on tag deletion
- **Card Header Redesign** — Edit button top-left, delete top-right, drag handle centered
- **Tag Overflow Truncation** — Auto-calculate displayable tag count with "..." suffix
- **Card Type Decoration** — Site/social type logo at card bottom-right

## [1.4.5] - 2026-04-21

### ✨ New Features

- **Unified Card Creation** — Card type picker on new card creation
- **Social Card Expansion** — 6 new card types (Telegram, Xiaohongshu, Douyin, QQ Group, Enterprise WeChat, WeChat Official), total 12
- **Bookmark Import** — Import browser bookmark files (HTML) with per-item editing
- **Three Import Modes** — Full overwrite, incremental merge, bookmark import
- **ZIP Import/Export** — Config import/export changed to ZIP format

## [1.4.0] - 2026-04-19

### ✨ New Features

- **Social Card System** — New social card feature for displaying social accounts
- **Six Card Types** — QQ, WeChat, Email, Bilibili, GitHub, Blog
- **QQ/WeChat Detail Page** — Independent detail pages with account info and QR codes
- **Hover Popup** — Site card hover popup showing description and tags

## [1.3.5] - 2026-04-18

### ✨ New Features

- **AI Tag Auto-Associate** — AI-recommended tags auto-created and associated on site save
- **Single Site Skip Online Check** — Per-site skip online check setting
- **Image Cropping** — Crop wallpaper, Logo, Favicon uploads
- **Independent Frosted Glass** — Frosted glass decoupled from wallpaper, desktop/mobile independent

## [1.3.0] - 2026-04-18

### ✨ New Features

- **Editor Console** — New `/editor` admin page for batch managing tags and sites
- **Config Service Layer** — New ConfigService for unified config management
- **Search Engine Persistence** — Search engine config persisted via localStorage
- **Site Name Hook** — New useSiteName hook for custom site name with debounce save

### 🔧 Improvements

- **lib Directory Refactor** — Reorganized into base/config/database/services/utils subdirectories
- **Component Reorganization** — Components split by function: sakura-nav/admin/dialogs/ui
- **Database to Repository** — Database operations migrated to Repository pattern

## [1.2.0] - 2026-04-17

### ✨ New Features

- **Custom Search Engine** — Search engine management panel with CRUD
- **Search Engine Icon System** — Text icons, official Favicon, custom upload
- **AI Smart Recommend** — AI keyword-based site recommendations
- **Online Status Detection** — Batch online status detection in admin panel

## [1.1.5] - 2026-04-16

### ✨ New Features

- **AI Smart Analysis** — AI auto-identify site title, description, related tags
- **Inline Tag Management** — Create/edit tags directly in site editor

## [1.1.0] - 2026-04-16

### ✨ New Features

- **Site Name Customization** — Custom site name in settings, auto-save
- **Site Icon Background Color** — Custom icon background color
- **Text Icons** — Auto-generate icon from site name first character
- **Tag Switch Animation** — Pjax-like transition effect with sweep progress bar

## [1.0.5] - 2025-04-02

### 🐛 Bug Fixes

- **Config Not Taking Effect** — Fixed config changes not taking effect after restart
- **Custom Login Path 404** — Fixed YAML parsing numbers as non-string types
- **Build Log Truncation** — Fixed incomplete error logs during build
- **Ctrl+C Lock Issue** — Fixed .next directory locked after forced exit

## [1.0.0] - 2025-04-01

### 🎉 First Official Release

SakuraNav is an elegant personal navigation page based on Next.js + React + TypeScript + SQLite.

- Responsive design with light/dark themes
- Dynamic backgrounds (sakura petals / stars)
- Frosted glass card effects
- Tag-based site categorization with drag & drop sorting
- Multi-engine search with suggestions
- AI-powered site analysis and recommendations
- Configuration import/export (ZIP format)
- Docker deployment support
- JWT authentication with HttpOnly cookies
