# 📖 SakuraNav 开发文档

本文档详细介绍 SakuraNav 项目的架构设计、数据存储和开发指南。

## 目录

- [项目架构](#项目架构)
- [目录结构](#目录结构)
- [数据存储](#数据存储)
- [核心模块](#核心模块)
- [API 接口](#api-接口)
- [开发指南](#开发指南)
- [常见问题](#常见问题)

---

## 项目架构

SakuraNav 是一个基于 **Next.js 16 + React 19** 的全栈导航页应用。

### 技术架构

```
┌──────────────────────────────────────────────────────────┐
│                    🖥 前端层 (Client)                      │
│      React 19 · TypeScript · Tailwind CSS 4 · @dnd-kit   │
└──────────────────────────────────────────────────────────┘
                              │  HTTP / JSON
                              ▼
┌──────────────────────────────────────────────────────────┐
│               ⚙️ 后端层 (Next.js App Router)               │
│          Route Handlers · Server Actions · API            │
│          Vercel AI SDK (智能分析 / 智能推荐)                │
└──────────────────────────────────────────────────────────┘
                              │  SQL Queries
                              ▼
┌──────────────────────────────────────────────────────────┐
│              💾 数据层 (SQLite + better-sqlite3)            │
│              Repository Pattern · WAL Mode                │
└──────────────────────────────────────────────────────────┘
```

### 核心设计原则

| 原则 | 说明 |
|:-----|:-----|
| **Repository Pattern** | 数据访问层采用 Repository 模式封装 |
| **Server-Only Config** | 敏感配置使用 `server-only` 包保护，仅在服务端可访问 |
| **Progressive Enhancement** | 渐进式加载和增强 |
| **Type Safety** | 全栈 TypeScript 类型安全 |
| **React Compiler** | 启用 `reactCompiler: true` 自动优化渲染性能 |
| **Standalone Output** | 使用 `output: "standalone"` 模式构建，适配 Docker 部署 |
| **Zod Validation** | API 请求参数使用 Zod 进行运行时校验 |

---

## 目录结构

```
SakuraNav/
├── public/                          # 静态资源
│   ├── browser-tab-logo.png         # 浏览器标签 Logo
│   └── default-site-logo.png        # 站点默认 Logo
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── page.tsx                 # 首页（SSR 初始数据加载）
│   │   ├── layout.tsx               # 根布局（3 种 Google 字体、主题初始化脚本）
│   │   ├── globals.css              # 全局样式（Tailwind CSS 4、自定义动画）
│   │   ├── icon.png                 # App Icon
│   │   ├── editor/page.tsx          # 编辑器管理后台（需管理员认证）
│   │   ├── card/[id]/page.tsx       # 社交卡片详情页（QQ 卡片详情）
│   │   ├── [...slug]/page.tsx       # 隐藏登录路由（动态路径匹配）
│   │   └── api/                     # 后端接口
│   │       ├── health/              # 健康检查
│   │       ├── auth/                # 认证接口
│   │       │   ├── login/           # 登录
│   │       │   ├── logout/          # 登出
│   │       │   └── session/         # 会话状态
│   │       ├── sites/               # 网站管理
│   │       │   ├── route.ts         # CRUD
│   │       │   ├── check-online/      # 批量在线检测
│   │       │   ├── check-online-single/ # 单站点在线检测（即时检测）
│   │       │   └── reorder-global/  # 全局排序
│   │       ├── tags/                # 标签管理
│   │       │   ├── route.ts         # CRUD
│   │       │   ├── reorder/         # 标签排序
│   │       │   └── [tagId]/sites/reorder/  # 标签内排序
│   │       ├── appearance/          # 外观配置
│   │       ├── settings/            # 应用设置
│   │       ├── navigation/          # 导航数据（公开接口）
│   │       │   ├── sites/           # 分页网站列表
│   │       │   ├── tags/            # 可见标签列表
│   │       │   └── cards/           # 公开社交卡片列表
│   │       ├── assets/              # 资源管理
│   │       │   ├── wallpaper/       # 壁纸上传
│   │       │   └── [assetId]/file/  # 资源文件访问
│   │       ├── config/              # 配置导入导出
│   │       │   ├── export/          # 导出 ZIP
│   │       │   ├── import/          # 导入 ZIP
│   │       │   └── reset/           # 重置默认
│   │       ├── search/              # 搜索功能
│   │       │   └── suggest/         # 搜索建议
│   │       ├── cards/               # 社交卡片管理
│   │       │   ├── route.ts         # CRUD（GET / POST / PUT / DELETE）
│   │       │   ├── [id]/route.ts    # 单卡片公开接口（无需认证）
│   │       │   └── reorder/         # 卡片排序
│   │       ├── admin/               # 管理员接口
│   │       │   └── bootstrap/       # 初始化引导数据
│   │       └── ai/                  # AI 接口
│   │           ├── recommend/       # AI 智能推荐
│   │           └── analyze-site/    # AI 网站分析
│   │
│   ├── components/                  # React 组件
│   │   ├── sakura-nav/              # 主应用组件（拆分为独立模块）
│   │   │   ├── index.ts             # 统一导出
│   │   │   ├── sakura-nav-app.tsx   # 主编排组件（核心前端逻辑）
│   │   │   ├── app-header.tsx       # 顶部导航栏（响应式桌面/移动布局）
│   │   │   ├── background-layer.tsx # 动态背景（樱花/星星）
│   │   │   ├── sidebar-tags.tsx     # 侧边栏（标签列表、DnD 排序）
│   │   │   ├── search-bar-section.tsx # 搜索栏（引擎切换、建议、AI 推荐）
│   │   │   ├── site-content-area.tsx  # 网站内容区域（卡片网格、分页）
│   │   │   ├── site-footer.tsx      # 页脚
│   │   │   ├── floating-actions.tsx # 浮动操作按钮
│   │   │   ├── content-title-bar.tsx # 内容区标题栏
│   │   │   ├── toast-layer.tsx      # 通知提示层
│   │   │   ├── appearance-drawer.tsx  # 外观设置抽屉
│   │   │   ├── config-drawer.tsx    # 配置管理抽屉
│   │   │   ├── editor-modal.tsx     # 编辑器弹窗
│   │   │   ├── admin-drawer.tsx     # 管理面板抽屉
│   │   │   ├── drawer-sections.tsx  # 抽屉分区定义
│   │   │   ├── social-card-type-picker.tsx # 社交卡片类型选择器
│   │   │   ├── social-card-editor.tsx      # 社交卡片编辑器
│   │   │   └── style-helpers.ts     # 样式工具函数（主题感知的弹窗、抽屉、Toast、磨砂效果等样式适配）
│   │   ├── admin/                   # 管理面板组件
│   │   │   ├── index.ts             # 统一导出
│   │   │   ├── types.ts             # 管理面板类型定义
│   │   │   ├── editor-console.tsx   # 编辑器控制台（标签/网站批量管理）
│   │   │   ├── editor-sites-tab.tsx # 编辑器网站标签页
│   │   │   ├── editor-tags-tab.tsx  # 编辑器标签标签页
│   │   │   ├── sites-admin-panel.tsx   # 网站管理面板
│   │   │   ├── tags-admin-panel.tsx    # 标签管理面板
│   │   │   ├── site-editor-form.tsx    # 网站编辑表单
│   │   │   ├── tag-editor-form.tsx     # 标签编辑表单
│   │   │   ├── appearance-admin-panel.tsx # 外观管理面板
│   │   │   ├── config-admin-panel.tsx    # 配置管理面板
│   │   │   ├── search-engine-editor.tsx  # 搜索引擎编辑器
│   │   │   ├── site-icon-selector.tsx    # 网站图标选择器
│   │   │   ├── wallpaper-slot-card.tsx   # 壁纸插槽卡片
│   │   │   ├── asset-slot-card.tsx       # 资源插槽卡片
│   │   │   ├── sortable-site-row.tsx     # 可排序网站行
│   │   │   └── admin-subsection.tsx      # 子区块通用组件
│   │   ├── auth/                    # 认证相关组件
│   │   │   ├── index.ts             # 统一导出
│   │   │   ├── login-screen.tsx     # 登录界面
│   │   │   ├── already-logged-in.tsx # 已登录提示组件
│   │   │   └── dynamic-background.tsx # 动态背景（樱花/星星）
│   │   ├── dialogs/                 # 对话框组件
│   │   │   ├── index.ts             # 统一导出
│   │   │   ├── floating-search-dialog.tsx # 浮动搜索弹窗
│   │   │   ├── notification-toast.tsx     # 通知提示
│   │   │   ├── config-confirm-dialog.tsx  # 配置确认对话框
│   │   │   ├── wallpaper-url-dialog.tsx   # 壁纸 URL 输入对话框
│   │   │   ├── asset-url-dialog.tsx       # 资源 URL 输入对话框
│   │   │   ├── image-crop-dialog.tsx      # 图片裁剪对话框（裁剪、旋转、缩放）
│   │   │   └── delete-social-tag-dialog.tsx # 删除社交标签确认对话框
│   │   └── ui/                      # UI 基础组件
│   │       ├── index.ts             # 统一导出
│   │       ├── site-card-content.tsx # 网站卡片内容（图标、名称、描述、标签、悬浮弹窗）
│   │       ├── site-card-shell.tsx   # 网站卡片壳
│   │       ├── site-card-popover.tsx # 通用悬浮弹窗（描述/标签交互，支持 top/bottom/right）
│   │       ├── tag-row-card.tsx      # 标签行卡片壳
│   │       ├── tag-row-content.tsx   # 标签行内容（名称、描述、悬浮弹窗）
│   │       ├── sortable-site-card.tsx # 可排序网站卡片（自动区分网站/社交卡片）
│   │       ├── sortable-tag-row.tsx  # 可排序标签行
│   │       └── social-card-content.tsx # 社交卡片内容（放大的品牌 Logo + 提示文字 + 标题）
│   │
│   ├── lib/                         # 工具库
│   │   ├── base/                    # 基础模块
│   │   │   ├── types.ts             # TypeScript 类型定义
│   │   │   ├── api.ts               # API 请求封装（客户端）
│   │   │   ├── auth.ts              # 认证模块（JWT + Cookie）
│   │   │   └── logger.ts            # 日志记录器
│   │   ├── config/                  # 配置模块
│   │   │   ├── server-config.ts     # 服务端配置（从 YAML 加载）
│   │   │   ├── schemas.ts           # Zod 验证模式
│   │   │   └── config.ts            # 客户端配置
│   │   ├── database/                # 数据库核心
│   │   │   ├── connection.ts        # 连接管理（单例、WAL）
│   │   │   ├── schema.ts            # 表结构定义
│   │   │   ├── migrations.ts        # 迁移脚本
│   │   │   ├── seed.ts              # 种子数据
│   │   │   └── index.ts             # 统一导出
│   │   ├── utils/                   # 工具函数
│   │   │   ├── utils.ts             # 通用工具函数
│   │   │   ├── appearance-utils.ts  # 外观相关工具
│   │   │   ├── icon-utils.ts        # 图标处理工具
│   │   │   ├── crop-utils.ts        # 图片裁剪工具（Canvas 裁剪、旋转）
│   │   │   └── theme-styles.ts      # 主题样式工具
│   │   └── services/                # 服务层
│   │       ├── index.ts             # 统一导出
│   │       ├── repositories/        # 数据仓库
│   │       │   ├── site-repository.ts   # 网站数据访问
│   │       │   ├── tag-repository.ts    # 标签数据访问
│   │       │   ├── card-repository.ts   # 社交卡片数据访问
│   │       │   ├── appearance-repository.ts # 外观数据访问
│   │       │   └── asset-repository.ts  # 资源数据访问
│   │       ├── config-service.ts    # 配置导入导出服务
│   │       └── search-service.ts    # 搜索服务
│   │
│   ├── hooks/                       # 自定义 Hooks
│   │   ├── index.ts                 # 统一导出
│   │   ├── use-theme.ts             # 主题切换
│   │   ├── use-site-list.ts         # 网站列表管理（分页加载）
│   │   ├── use-appearance.ts        # 外观配置
│   │   ├── use-drag-sort.ts         # 拖拽排序
│   │   ├── use-search-bar.ts        # 搜索栏状态管理
│   │   ├── use-search-engine-config.ts # 搜索引擎配置管理
│   │   ├── use-ai-recommend.ts      # AI 智能推荐
│   │   ├── use-toast-notify.ts      # 通知提示
│   │   ├── use-config-actions.ts    # 配置操作
│   │   ├── use-site-tag-editor.ts   # 网站标签编辑器
│   │   ├── use-site-name.ts         # 站点名称管理
│   │   ├── use-online-check.ts      # 网站在线检测
│   │   ├── use-editor-console.ts    # 编辑器控制台
│   │   └── use-social-cards.ts      # 社交卡片管理
│   │
│   └── contexts/                    # React Context
│       └── app-context.tsx          # 应用全局状态
│
├── storage/                         # 数据存储（运行后生成）
│   ├── database/
│   │   └── sakuranav.sqlite         # SQLite 数据库
│   └── uploads/                     # 上传文件目录
│
├── config.example.yml               # 配置文件模板
├── build-and-run.js                 # 构建并运行脚本
└── package.json                     # 项目配置
```

---

## 数据存储

### 数据库技术栈

| 项目 | 说明 |
|:-----|:-----|
| 数据库引擎 | SQLite (better-sqlite3) |
| 存储位置 | `storage/database/sakuranav.sqlite` |
| Docker 映射 | 通过软链接映射到 `/app/data/database/` |
| 模式 | WAL (Write-Ahead Logging) |

### 数据表结构

#### 1️⃣ `tags` 表 — 标签

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,                 -- 标签ID (UUID)
  name TEXT NOT NULL,                  -- 标签名称
  slug TEXT NOT NULL UNIQUE,           -- URL友好的标识
  sort_order INTEGER NOT NULL,         -- 排序顺序
  is_hidden INTEGER NOT NULL DEFAULT 0, -- 是否隐藏 (0: 否, 1: 是)
  logo_url TEXT,                       -- Logo URL
  logo_bg_color TEXT,                  -- Logo 背景色
  description TEXT                     -- 标签描述
);
```

> 💡 **关键特性**: `is_hidden` 控制游客可见性 · `sort_order` 支持拖拽排序 · `slug` URL 友好唯一标识 · `logo_url` + `logo_bg_color` 标签 Logo 自定义

#### 2️⃣ `sites` 表 — 网站

```sql
CREATE TABLE sites (
  id TEXT PRIMARY KEY,                 -- 网站ID (UUID)
  name TEXT NOT NULL,                  -- 网站名称
  url TEXT NOT NULL,                   -- 网站URL
  description TEXT,                    -- 描述
  icon_url TEXT,                       -- 图标URL
  icon_bg_color TEXT,                  -- 图标背景色
  is_online INTEGER,                   -- 在线状态 (0: 离线, 1: 在线, NULL: 未检测)
  skip_online_check INTEGER NOT NULL DEFAULT 0, -- 跳过在线检测 (0: 不跳过, 1: 跳过)
  is_pinned INTEGER NOT NULL DEFAULT 0, -- 是否置顶 (0: 否, 1: 是)
  global_sort_order INTEGER NOT NULL,  -- 全局排序顺序
  card_type TEXT,                      -- 卡片类型 (NULL=普通网站, qq/email/bilibili/github=社交卡片)
  card_data TEXT,                      -- 卡片载荷 JSON (仅社交卡片)
  created_at TEXT NOT NULL,            -- 创建时间 (ISO 8601)
  updated_at TEXT NOT NULL             -- 更新时间 (ISO 8601)
);
```

> 💡 **关键特性**: `is_pinned` 置顶显示 · `global_sort_order` 全局拖拽排序 · `icon_bg_color` 图标背景色自定义 · `is_online` 批量在线检测 · `skip_online_check` 单站点跳过在线检测 · `card_type`/`card_data` 社交卡片合并存储

#### 3️⃣ `site_tags` 表 — 网站标签关联

```sql
CREATE TABLE site_tags (
  site_id TEXT NOT NULL,               -- 网站ID
  tag_id TEXT NOT NULL,                -- 标签ID
  sort_order INTEGER NOT NULL,         -- 标签内的排序顺序
  PRIMARY KEY (site_id, tag_id),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

> 💡 **关键特性**: 一个网站可关联多个标签 · 每个标签内独立排序 · 级联删除保证一致性

#### 4️⃣ `assets` 表 — 资源文件

```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,                 -- 资源ID (UUID)
  kind TEXT NOT NULL,                  -- 资源类型 (wallpaper, logo, favicon)
  file_path TEXT NOT NULL,             -- 文件路径
  mime_type TEXT NOT NULL,             -- MIME类型
  width INTEGER,                       -- 宽度 (像素)
  height INTEGER,                      -- 高度 (像素)
  created_at TEXT NOT NULL             -- 创建时间 (ISO 8601)
);
```

| kind | 说明 |
|:-----|:-----|
| `wallpaper` | 壁纸 |
| `logo` | Logo |
| `favicon` | Favicon |

#### 5️⃣ `theme_appearances` 表 — 主题外观

```sql
CREATE TABLE theme_appearances (
  theme TEXT PRIMARY KEY,              -- 主题 (light, dark)
  wallpaper_asset_id TEXT,             -- 壁纸资源ID (已废弃)
  desktop_wallpaper_asset_id TEXT,     -- 桌面壁纸资源ID
  mobile_wallpaper_asset_id TEXT,      -- 移动壁纸资源ID
  font_preset TEXT NOT NULL,           -- 字体预设 (grotesk, serif, balanced)
  font_size REAL NOT NULL DEFAULT 16,  -- 字体大小
  overlay_opacity REAL NOT NULL,       -- 遮罩透明度 (0.0 - 1.0)
  text_color TEXT NOT NULL,            -- 文字颜色 (十六进制)
  logo_asset_id TEXT,                  -- Logo资源ID
  favicon_asset_id TEXT,               -- Favicon资源ID
  card_frosted INTEGER NOT NULL DEFAULT 0, -- 卡片毛玻璃 (已废弃)
  desktop_card_frosted INTEGER NOT NULL DEFAULT 0, -- 桌面卡片毛玻璃
  mobile_card_frosted INTEGER NOT NULL DEFAULT 0,  -- 移动卡片毛玻璃
  is_default INTEGER NOT NULL DEFAULT 0, -- 是否为默认主题
  FOREIGN KEY (wallpaper_asset_id) REFERENCES assets(id) ON DELETE SET NULL
);
```

#### 6️⃣ `app_settings` 表 — 应用设置

```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,                -- 设置键名
  value TEXT                           -- 设置值 (JSON)
);
```

| key | 说明 |
|:----|:-----|
| `site_logo_light_asset_id` | 明亮主题 Logo |
| `site_logo_dark_asset_id` | 暗黑主题 Logo |
| `site_name` | 站点名称 |
| `online_check_enabled` | 是否启用在线检测 |
| `online_check_time` | 在线检测时间（小时） |
| `online_check_last_run` | 上次检测时间 |

#### 7️⃣ `cards` 表 — 社交卡片（已废弃）

> ⚠️ **已废弃**: 社交卡片已合并到 `sites` 表（通过 `card_type` + `card_data` 字段），`cards` 表仅保留以防降级。新建的社交卡片直接存入 `sites` 表。

```sql
CREATE TABLE cards (
  id TEXT PRIMARY KEY,                 -- 卡片ID (card-UUID)
  card_type TEXT NOT NULL,             -- 卡片类型 (qq, email, bilibili, github)
  label TEXT NOT NULL,                 -- 显示名称
  icon_url TEXT,                       -- 自定义图标 URL
  icon_bg_color TEXT,                  -- 图标背景色
  payload TEXT NOT NULL,               -- JSON 载荷（不同类型有不同字段）
  global_sort_order INTEGER NOT NULL,  -- 排序顺序
  created_at TEXT NOT NULL,            -- 创建时间 (ISO 8601)
  updated_at TEXT NOT NULL             -- 更新时间 (ISO 8601)
);
```

**payload 类型**（现存储在 `sites.card_data` 字段中）:

| card_type | payload 字段 | 说明 |
|:----------|:-------------|:-----|
| `qq` | `qqNumber`, `qrCodeUrl?` | QQ 号 + 可选二维码图片 |
| `email` | `email` | 邮箱地址 |
| `bilibili` | `url` | B站个人空间 URL |
| `github` | `url` | GitHub 个人主页 URL |

> 💡 **虚拟标签**: 导航标签列表 API 会动态注入一个 `__social_cards__` 虚拟标签，点击后筛选显示所有社交卡片（通过 `sites.card_type IS NOT NULL` 过滤）。删除该标签会同时删除所有社交卡片。

### 数据关系图

```
┌──────────┐           ┌──────────┐
│   tags   │───────────│  assets  │
└──────────┘           └──────────┘
     │                       │
     ▼                       ▼
┌──────────┐     ┌───────────────────┐
│site_tags │     │theme_appearances  │
└──────────┘     └───────────────────┘
     │
     ▼
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  sites   │     │ app_settings │     │  cards   │
└──────────┘     └──────────────┘     └──────────┘
```

---

## 核心模块

### 1. 认证模块 (`lib/base/auth.ts`)

**技术栈**: JWT (jose, HS256) + HTTP-Only Cookie

**隐藏登录路由机制**: 通过 `config.yml` 的 `admin.path` 配置登录入口路径，`[...slug]/page.tsx` 动态匹配该路径并渲染登录界面。

**核心函数**:

```typescript
// 创建会话令牌
async function createSessionToken(username: string): Promise<string>

// 验证会话令牌
async function verifySessionToken(token: string): Promise<{ username?: string }>

// 获取当前会话
async function getSession(): Promise<SessionUser | null>

// 设置会话 Cookie
async function setSessionCookie(username: string): Promise<void>

// 清除会话 Cookie
async function clearSessionCookie(): Promise<void>

// 要求管理员会话
async function requireAdminSession(): Promise<SessionUser>

// 要求管理员二次确认
async function requireAdminConfirmation(password: string | null): Promise<void>
```

**认证流程**:

```
登录请求 → 验证用户名密码 → 创建 JWT → 设置 Cookie → 返回成功
   │
   ▼
后续请求 → 读取 Cookie → 验证 JWT → 获取会话信息
```

### 2. 数据库模块 (`lib/database`)

| 文件 | 职责 |
|:-----|:-----|
| `connection.ts` | 单例模式管理数据库连接，自动启用 WAL 模式和外键约束 |
| `schema.ts` | 创建所有数据表，定义外键关系和索引 |
| `migrations.ts` | 检测表结构变化，自动执行 ALTER TABLE，版本化管理 |
| `seed.ts` | 初始化示例标签、示例网站和默认主题配置 |

### 3. Repository 模式 (`lib/services/repositories`)

<details>
<summary><strong>SiteRepository</strong> — 网站数据访问</summary>

```typescript
// 获取分页网站列表
function getPaginatedSites(options: {
  isAuthenticated: boolean;
  scope: "all" | "tag";
  tagId?: string | null;
  query?: string | null;
  cursor?: string | null;
}): PaginatedSites

// 获取所有网站（管理员）
function getAllSitesForAdmin(): Site[]

// 获取单个网站
function getSiteById(id: string): Site | null

// 创建 / 更新 / 删除网站
function createSite(input: {...}): Site | null
function updateSite(input: {...}): Site | null
function deleteSite(id: string): void

// 排序
function reorderSitesGlobal(siteIds: string[]): void
function reorderSitesInTag(tagId: string, siteIds: string[]): void

// 在线检测
function getAllSiteUrls(): { id: string; url: string }[]
function getSkippedOnlineCheckSiteIds(): string[]
function updateSiteOnlineStatus(siteId: string, isOnline: boolean): void
function updateSitesOnlineStatus(statuses: { id: string; isOnline: boolean }[]): void

// 社交卡片（card_type 非空的 sites 记录）
function getSocialCardCount(): number
function getSocialCardSites(): Site[]
function deleteAllSocialCardSites(): void
```

</details>

<details>
<summary><strong>TagRepository</strong> — 标签数据访问</summary>

```typescript
function getVisibleTags(isAuthenticated: boolean): Tag[]
function getTagById(id: string): Tag | null
function createTag(input: {...}): Tag
function updateTag(input: {...}): Tag | null
function deleteTag(id: string): void
function reorderTags(tagIds: string[]): void
function getSiteTagsForIds(tagIds: string[]): SiteTag[]
```

</details>

<details>
<summary><strong>AppearanceRepository</strong> — 外观数据访问</summary>

```typescript
function getAppearances(): Record<ThemeMode, ThemeAppearance>
function updateAppearances(appearances: {...}): void
function getAppSettings(): AppSettings
function updateAppSettings(settings: {...}): AppSettings
```

</details>

<details>
<summary><strong>AssetRepository</strong> — 资源数据访问</summary>

```typescript
function createAsset(input: {...}): StoredAsset
function getAsset(id: string): StoredAsset | null
function listStoredAssets(): StoredAsset[]
function deleteAsset(id: string): void
```

</details>

<details>
<summary><strong>CardRepository</strong> — 社交卡片数据访问</summary>

```typescript
// 获取所有社交卡片
function getAllCards(): SocialCard[]

// 获取单个卡片
function getCardById(id: string): SocialCard | null

// 创建 / 更新 / 删除卡片
function createCard(input: {...}): SocialCard
function updateCard(input: {...}): SocialCard | null
function deleteCard(id: string): void

// 排序
function reorderCards(cardIds: string[]): void

// 统计
function getCardCount(): number

// 批量删除
function deleteAllCards(): void
```

</details>

### 4. 服务层

| 服务 | 文件 | 职责 |
|:-----|:-----|:-----|
| ConfigService | `config-service.ts` | 构建配置归档、替换配置归档、重置默认配置 |
| SearchService | `search-service.ts` | 获取搜索建议 |

### 5. 全局状态管理 (`contexts/app-context.tsx`)

**AppContext 提供的状态**:

```typescript
type AppState = {
  // 主题
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // 认证
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;

  // 标签
  tags: Tag[];
  setTags: (tags: Tag[]) => void;

  // 外观
  appearances: Record<ThemeMode, ThemeAppearance>;
  setAppearances: (appearances: {...}) => void;

  // 设置
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;

  // 刷新控制
  refreshNonce: number;
  triggerRefresh: () => void;
};
```

**派生 Hooks**:

| Hook | 说明 |
|:-----|:-----|
| `useTheme` | 主题和外观配置 |
| `useAuth` | 认证状态 |
| `useTags` | 标签数据 |
| `useAppearances` | 外观配置 |
| `useSettings` | 应用设置 |

### 6. 自定义 Hooks (`hooks/`)

| Hook | 用途 |
|:-----|:-----|
| `useTheme` | 主题切换和外观配置 |
| `useSiteList` | 网站列表管理（分页加载、无限滚动） |
| `useAppearance` | 外观配置管理 |
| `useDragSort` | 拖拽排序（标签/网站） |
| `useSearchBar` | 搜索栏状态管理（引擎切换、建议、AI 推荐） |
| `useSearchEngineConfig` | 自定义搜索引擎配置（localStorage 持久化） |
| `useAiRecommend` | AI 智能推荐 |
| `useToastNotify` | 通知提示 |
| `useConfigActions` | 配置导入/导出/重置操作 |
| `useSiteTagEditor` | 网站标签编辑器 |
| `useSiteName` | 站点名称管理 |
| `useOnlineCheck` | 网站在线检测 |
| `useEditorConsole` | 编辑器控制台（批量管理标签和网站） |
| `useSocialCards` | 社交卡片管理（CRUD、点击行为，列表由 useSiteList 统一管理） |

### 7. React 19 特性使用

| 特性 | 使用位置 | 说明 |
|:-----|:---------|:-----|
| `useEffectEvent` | `sakura-nav-app.tsx`、`use-site-list.ts` | Effect 内安全引用最新状态 |
| `useTransition` | 页面切换 | 低优先级过渡 |
| React Compiler | `next.config.ts` | `reactCompiler: true`，自动组件记忆化 |

---

## API 接口

### 认证接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `POST` | `/api/auth/login` | 登录 |
| `POST` | `/api/auth/logout` | 登出 |
| `GET` | `/api/auth/session` | 获取会话状态 |

<details>
<summary>请求/响应示例</summary>

**POST /api/auth/login**

```json
// 请求
{ "username": "admin", "password": "your-password" }

// 响应
{ "ok": true, "username": "admin" }
```

**GET /api/auth/session**

```json
{ "isAuthenticated": true, "username": "admin" }
```

</details>

### 导航接口（公开）

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/navigation/sites` | 分页网站列表 |
| `GET` | `/api/navigation/tags` | 可见标签列表 |

<details>
<summary>查询参数与响应示例</summary>

**GET /api/navigation/sites**

| 参数 | 说明 |
|:-----|:-----|
| `scope` | `"all"` 或 `"tag"` |
| `tagId` | 标签ID（scope=tag 时必需） |
| `q` | 搜索关键词 |
| `cursor` | 分页游标 |

```json
{ "items": [Site], "total": 100, "nextCursor": "eyJvZmZzZXQiOjEyfQ==" }
```

**GET /api/navigation/tags**

```json
{ "items": [Tag] }
```

</details>

### 管理接口（需认证）

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET / POST` | `/api/sites` | 获取所有 / 创建网站 |
| `PUT / DELETE` | `/api/sites` | 更新 / 删除网站 |
| `POST` | `/api/sites/check-online` | 批量在线检测 |
| `POST` | `/api/sites/check-online-single` | 单站点即时在线检测 |
| `POST` | `/api/sites/reorder-global` | 全局网站排序 |
| `GET / POST` | `/api/tags` | 获取所有 / 创建标签 |
| `PUT / DELETE` | `/api/tags` | 更新 / 删除标签 |
| `POST` | `/api/tags/reorder` | 标签排序 |
| `POST` | `/api/tags/[tagId]/sites/reorder` | 标签内排序 |
| `GET / PUT` | `/api/appearance` | 获取 / 更新外观配置 |
| `GET / PUT` | `/api/settings` | 获取 / 更新应用设置 |

### 管理员引导接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/admin/bootstrap` | 获取编辑器初始化所需的所有数据 |

```json
{
  "tags": [Tag],
  "sites": [Site],
  "appearances": { "light": {...}, "dark": {...} },
  "settings": AppSettings
}
```

> 💡 社交卡片已合并到 `sites` 数组中（通过 `cardType` 字段区分），不再单独返回。

### 资源接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `POST` | `/api/assets/wallpaper` | 上传壁纸/Logo（FormData 或 JSON URL） |
| `GET` | `/api/assets/[assetId]/file` | 获取资源文件 |

### 配置接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `POST` | `/api/config/export` | 导出配置为 ZIP |
| `POST` | `/api/config/import` | 从 ZIP 导入配置 |
| `POST` | `/api/config/reset` | 重置到默认配置 |

### 搜索接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/search/suggest?q=keyword` | 获取搜索建议 |

### AI 接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `POST` | `/api/ai/recommend` | AI 智能推荐网站 |
| `POST` | `/api/ai/analyze-site` | AI 分析网站 |

<details>
<summary>请求/响应示例</summary>

**POST /api/ai/recommend**

```json
// 请求
{ "keyword": "设计工具" }

// 响应
{ "recommendations": [{ "name": "Figma", "url": "https://figma.com", "reason": "..." }] }
```

**POST /api/ai/analyze-site**

```json
// 请求
{ "url": "https://example.com" }

// 响应
{ "title": "Example Site", "description": "网站描述", "suggestedTags": ["工具", "设计"], "newTags": ["推荐新标签"] }
```

</details>

### 社交卡片接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/cards` | 获取所有社交卡片（需认证） |
| `POST` | `/api/cards` | 创建社交卡片（需认证） |
| `PUT` | `/api/cards` | 更新社交卡片（需认证） |
| `DELETE` | `/api/cards?id=xxx` | 删除单张卡片（需认证） |
| `DELETE` | `/api/cards` | 删除全部社交卡片（需认证） |
| `PUT` | `/api/cards/reorder` | 卡片拖拽排序（需认证） |
| `GET` | `/api/cards/[id]` | 获取单张卡片（公开，无需认证） |

<details>
<summary>请求/响应示例</summary>

**POST /api/cards（创建 QQ 卡片）**:

```json
// 请求
{
  "cardType": "qq",
  "label": "QQ",
  "iconUrl": null,
  "iconBgColor": "#12B7F5",
  "payload": {
    "type": "qq",
    "qqNumber": "123456789",
    "qrCodeUrl": "/api/assets/xxx/file"
  }
}

// 响应
{ "item": SocialCard }
```

**PUT /api/cards/reorder（排序）**:

```json
{ "ids": ["card-uuid-1", "card-uuid-2", "card-uuid-3"] }
```

**GET /api/cards/[id]（QQ 卡片详情，公开接口）**:

```json
{ "item": { "id": "card-xxx", "cardType": "qq", "label": "QQ", "payload": { "type": "qq", "qqNumber": "123456789" } } }
```

</details>

### 健康检查

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/health` | Docker HEALTHCHECK 使用 |

---

## 开发指南

### 本地开发

```bash
# 安装依赖
npm install

# 复制配置文件
cp config.example.yml config.yml

# 启动开发服务器
npm run dev
```

### 代码规范

| 规范 | 说明 |
|:-----|:-----|
| TypeScript | 全栈使用，确保类型安全 |
| ESLint | Next.js 推荐配置（core-web-vitals + typescript） |
| Zod | API 请求参数运行时校验 |

**命名规范**:

| 类型 | 风格 | 示例 |
|:-----|:-----|:-----|
| 组件 | PascalCase | `SiteCard` |
| 函数 | camelCase | `getSiteById` |
| 文件 | kebab-case | `site-repository.ts` |
| 常量 | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` |

### 添加新功能

```
1. src/lib/base/types.ts          → 定义类型
2. src/lib/config/schemas.ts      → 添加 Zod 验证模式
3. src/lib/services/repositories/ → 添加数据访问层
4. src/app/api/                   → 添加 API 路由
5. src/components/                → 添加 UI 组件
6. src/hooks/                     → 添加自定义 Hook
```

### 数据库迁移

修改表结构时：

```
1. src/lib/database/schema.ts     → 更新表结构定义
2. src/lib/database/migrations.ts → 添加迁移逻辑
3. 相关 Repository                → 更新数据访问层
```

### 构建 & 部署

```bash
# 生产构建并启动
npm run build:start

# 跳过 lint 的快速构建
npm run build:start:skip-lint

# 跳过构建（使用已有产物）
npm run build:start:skip-build
```

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|:-----|:-----|:---------|
| 数据库锁定 | SQLite WAL 模式并发问题 | 使用 better-sqlite3 同步 API，避免并发写入 |
| 主题闪烁 | 服务端渲染与客户端主题不一致 | 使用 `beforeInteractive` 脚本提前初始化主题 |
| 拖拽卡顿 | 大量元素时性能问题 | 使用虚拟化和延迟更新 |
| AI 功能不可用 | 未配置 `model` 配置项 | 在 `config.yml` 中添加 `model.apiKey`、`model.baseUrl`、`model.model` |

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

---

## 许可证

MIT License
