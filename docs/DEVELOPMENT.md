# SakuraNav 开发文档

本文档详细介绍 SakuraNav 项目的架构设计、数据存储和开发指南。

## 目录

- [项目架构](#项目架构)
- [目录结构](#目录结构)
- [数据存储](#数据存储)
- [核心模块](#核心模块)
- [API 接口](#api-接口)
- [开发指南](#开发指南)

---

## 项目架构

SakuraNav 是一个基于 **Next.js 16 + React 19** 的全栈导航页应用,采用以下架构:

### 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端层 (Client)                      │
│  React 19 + TypeScript + Tailwind CSS 4 + @dnd-kit     │
└─────────────────────────────────────────────────────────┘
                            ↓ HTTP/JSON
┌─────────────────────────────────────────────────────────┐
│                  后端层 (Next.js App Router)              │
│         Route Handlers + Server Actions + API           │
└─────────────────────────────────────────────────────────┘
                            ↓ SQL Queries
┌─────────────────────────────────────────────────────────┐
│                 数据层 (SQLite + better-sqlite3)          │
│            Repository Pattern + WAL Mode                │
└─────────────────────────────────────────────────────────┘
```

### 核心设计原则

1. **Repository Pattern**: 数据访问层采用 Repository 模式封装
2. **Server-Only Config**: 敏感配置只在服务端可访问
3. **Progressive Enhancement**: 渐进式加载和增强
4. **Type Safety**: 全栈 TypeScript 类型安全

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
│   │   ├── page.tsx                 # 首页
│   │   ├── layout.tsx               # 根布局
│   │   ├── globals.css              # 全局样式
│   │   ├── [...slug]/page.tsx       # 隐藏登录路由
│   │   └── api/                     # 后端接口
│   │       ├── auth/                # 认证接口
│   │       │   ├── login/           # 登录
│   │       │   ├── logout/          # 登出
│   │       │   └── session/         # 会话状态
│   │       ├── sites/               # 网站管理
│   │       ├── tags/                # 标签管理
│   │       ├── appearance/          # 外观配置
│   │       ├── settings/            # 应用设置
│   │       ├── navigation/          # 导航数据
│   │       ├── assets/              # 资源管理
│   │       ├── config/              # 配置导入导出
│   │       ├── search/              # 搜索功能
│   │       └── admin/               # 管理员接口
│   │
│   ├── components/                  # React 组件
│   │   ├── sakura-nav-app.tsx       # 主应用组件
│   │   ├── header.tsx               # 顶部导航栏
│   │   ├── sidebar.tsx              # 侧边栏
│   │   ├── login-screen.tsx         # 登录界面
│   │   ├── editor-console.tsx       # 编辑器控制台
│   │   ├── admin/                   # 管理面板组件
│   │   │   ├── sites-admin-panel.tsx
│   │   │   ├── tags-admin-panel.tsx
│   │   │   ├── appearance-admin-panel.tsx
│   │   │   ├── config-admin-panel.tsx
│   │   │   ├── site-editor-form.tsx
│   │   │   └── tag-editor-form.tsx
│   │   ├── dialogs/                 # 对话框组件
│   │   │   ├── floating-search-dialog.tsx
│   │   │   ├── config-confirm-dialog.tsx
│   │   │   ├── wallpaper-url-dialog.tsx
│   │   │   └── notification-toast.tsx
│   │   └── ui/                      # UI 组件
│   │       ├── site-card-content.tsx
│   │       ├── site-card-shell.tsx
│   │       ├── sortable-site-card.tsx
│   │       ├── sortable-tag-row.tsx
│   │       └── tag-row-card.tsx
│   │
│   ├── lib/                         # 工具库
│   │   ├── db.ts                    # 数据库操作(旧版)
│   │   ├── auth.ts                  # 认证模块
│   │   ├── types.ts                 # TypeScript 类型
│   │   ├── schemas.ts               # Zod 验证模式
│   │   ├── config.ts                # 客户端配置
│   │   ├── server-config.ts         # 服务端配置
│   │   ├── utils.ts                 # 工具函数
│   │   ├── api.ts                   # API 请求封装
│   │   ├── logger.ts                # 日志记录
│   │   ├── theme-styles.ts          # 主题样式
│   │   ├── core/                    # 核心模块
│   │   │   └── database/            # 数据库核心
│   │   │       ├── connection.ts    # 连接管理
│   │   │       ├── schema.ts        # 表结构定义
│   │   │       ├── migrations.ts    # 迁移脚本
│   │   │       └── seed.ts          # 种子数据
│   │   └── services/                # 服务层
│   │       └── repositories/        # 数据仓库
│   │           ├── site-repository.ts
│   │           ├── tag-repository.ts
│   │           ├── appearance-repository.ts
│   │           └── asset-repository.ts
│   │
│   ├── hooks/                       # 自定义 Hooks
│   │   ├── use-site-list.ts         # 网站列表管理
│   │   ├── use-search-suggestions.ts # 搜索建议
│   │   ├── use-dialogs.ts           # 对话框状态管理
│   │   ├── use-edit-mode.ts         # 编辑模式
│   │   ├── use-tag-filter.ts        # 标签筛选
│   │   └── use-theme-toggle.ts      # 主题切换
│   │
│   └── contexts/                    # React Context
│       └── app-context.tsx          # 应用全局状态
│
├── storage/                         # 数据存储(运行后生成)
│   ├── sakuranav.sqlite             # SQLite 数据库
│   └── uploads/                     # 上传文件目录
│
├── config.example.yml               # 配置文件模板
├── build-and-run.js                 # 构建并运行脚本
└── package.json                     # 项目配置
```

---

## 数据存储

### 数据库技术栈

- **数据库引擎**: SQLite (better-sqlite3)
- **存储位置**: `storage/sakuranav.sqlite`
- **模式**: WAL (Write-Ahead Logging)

### 数据表结构

#### 1. tags 表 - 标签

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,                 -- 标签ID (UUID)
  name TEXT NOT NULL,                  -- 标签名称
  slug TEXT NOT NULL UNIQUE,           -- URL友好的标识
  sort_order INTEGER NOT NULL,         -- 排序顺序
  is_hidden INTEGER NOT NULL DEFAULT 0, -- 是否隐藏 (0: 否, 1: 是)
  logo_url TEXT                        -- Logo URL
);
```

**用途**: 存储导航标签分类信息

**关键特性**:
- `is_hidden`: 控制标签对游客的可见性
- `sort_order`: 支持拖拽排序
- `slug`: URL 友好的唯一标识

#### 2. sites 表 - 网站

```sql
CREATE TABLE sites (
  id TEXT PRIMARY KEY,                 -- 网站ID (UUID)
  name TEXT NOT NULL,                  -- 网站名称
  url TEXT NOT NULL,                   -- 网站URL
  description TEXT,                    -- 描述
  icon_url TEXT,                       -- 图标URL
  is_pinned INTEGER NOT NULL DEFAULT 0, -- 是否置顶 (0: 否, 1: 是)
  global_sort_order INTEGER NOT NULL,  -- 全局排序顺序
  created_at TEXT NOT NULL,            -- 创建时间 (ISO 8601)
  updated_at TEXT NOT NULL             -- 更新时间 (ISO 8601)
);
```

**用途**: 存储网站基本信息

**关键特性**:
- `is_pinned`: 置顶显示
- `global_sort_order`: 全局排序,支持拖拽调整

#### 3. site_tags 表 - 网站标签关联

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

**用途**: 网站与标签的多对多关系

**关键特性**:
- 支持一个网站关联多个标签
- 每个标签内独立的排序顺序
- 级联删除保证数据一致性

#### 4. assets 表 - 资源文件

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

**用途**: 存储上传的资源文件元数据

**支持的资源类型**:
- `wallpaper`: 壁纸
- `logo`: Logo
- `favicon`: Favicon

#### 5. theme_appearances 表 - 主题外观

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

**用途**: 存储明暗主题的外观配置

**关键特性**:
- 支持桌面和移动端分别设置壁纸
- 三种字体预设可选
- 卡片毛玻璃效果开关
- `is_default`: 控制默认显示的主题

#### 6. app_settings 表 - 应用设置

```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,                -- 设置键名
  value TEXT                           -- 设置值 (JSON)
);
```

**用途**: 存储应用级别的键值对设置

**当前使用的键**:
- `site_logo_light_asset_id`: 明亮主题 Logo
- `site_logo_dark_asset_id`: 暗黑主题 Logo

### 数据关系图

```
┌──────────┐
│   tags   │───────────┐
└──────────┘           │
     │                 │
     │                 │
     ↓                 ↓
┌──────────┐    ┌──────────┐
│site_tags │    │  assets  │
└──────────┘    └──────────┘
     │                 │
     │                 │
     ↓                 ↓
┌──────────┐    ┌───────────────────┐
│  sites   │    │theme_appearances  │
└──────────┘    └───────────────────┘
                         │
                         ↓
                 ┌──────────────┐
                 │ app_settings │
                 └──────────────┘
```

---

## 核心模块

### 1. 认证模块 (lib/auth.ts)

**技术栈**: JWT (jose) + HTTP-Only Cookie

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
   ↓
后续请求 → 读取 Cookie → 验证 JWT → 获取会话信息
```

### 2. 数据库模块 (lib/core/database)

**连接管理** (connection.ts):
- 单例模式管理数据库连接
- 自动启用 WAL 模式
- 启用外键约束

**表结构定义** (schema.ts):
- 创建所有数据表
- 定义外键关系
- 设置索引

**迁移脚本** (migrations.ts):
- 检测表结构变化
- 自动执行 ALTER TABLE
- 版本化管理

**种子数据** (seed.ts):
- 初始化示例标签
- 初始化示例网站
- 初始化默认主题配置

### 3. Repository 模式 (lib/services/repositories)

#### SiteRepository (site-repository.ts)

```typescript
// 获取分页网站列表
function getPaginatedSites(options: {
  isAuthenticated: boolean;
  scope: "all" | "tag";
  tagId?: string | null;
  query?: string | null;
  cursor?: string | null;
}): PaginatedSites

// 获取所有网站(管理员)
function getAllSitesForAdmin(): Site[]

// 创建网站
function createSite(input: {...}): Site | null

// 更新网站
function updateSite(input: {...}): Site | null

// 删除网站
function deleteSite(id: string): void

// 全局排序
function reorderSitesGlobal(siteIds: string[]): void

// 标签内排序
function reorderSitesInTag(tagId: string, siteIds: string[]): void
```

#### TagRepository (tag-repository.ts)

```typescript
// 获取可见标签
function getVisibleTags(isAuthenticated: boolean): Tag[]

// 创建标签
function createTag(input: {...}): Tag

// 更新标签
function updateTag(input: {...}): Tag | null

// 删除标签
function deleteTag(id: string): void

// 标签排序
function reorderTags(tagIds: string[]): void
```

#### AppearanceRepository (appearance-repository.ts)

```typescript
// 获取外观配置
function getAppearances(): Record<ThemeMode, ThemeAppearance>

// 更新外观配置
function updateAppearances(appearances: {...}): void

// 获取应用设置
function getAppSettings(): AppSettings

// 更新应用设置
function updateAppSettings(settings: {...}): AppSettings
```

### 4. 全局状态管理 (contexts/app-context.tsx)

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

```typescript
// 主题相关
function useTheme(): { theme, setTheme, appearance }

// 认证相关
function useAuth(): { isAuthenticated, setIsAuthenticated }

// 标签相关
function useTags(): { tags, setTags }

// 外观相关
function useAppearances(): { appearances, setAppearances }

// 设置相关
function useSettings(): { settings, setSettings }
```

---

## API 接口

### 认证接口

#### POST /api/auth/login
登录接口

**请求**:
```json
{
  "username": "admin",
  "password": "your-password"
}
```

**响应**:
```json
{
  "ok": true,
  "username": "admin"
}
```

#### POST /api/auth/logout
登出接口

#### GET /api/auth/session
获取会话状态

**响应**:
```json
{
  "isAuthenticated": true,
  "username": "admin"
}
```

### 导航接口

#### GET /api/navigation/sites
获取分页网站列表

**查询参数**:
- `scope`: "all" | "tag"
- `tagId`: 标签ID (scope=tag 时必需)
- `q`: 搜索关键词
- `cursor`: 分页游标

**响应**:
```json
{
  "items": [Site],
  "total": 100,
  "nextCursor": "eyJvZmZzZXQiOjEyfQ=="
}
```

#### GET /api/navigation/tags
获取可见标签列表

**响应**:
```json
{
  "items": [Tag]
}
```

### 管理接口

#### GET /api/sites
获取所有网站(管理员)

#### POST /api/sites
创建网站

#### PUT /api/sites
更新网站

#### DELETE /api/sites?id=xxx
删除网站

#### GET /api/tags
获取所有标签(管理员)

#### POST /api/tags
创建标签

#### PUT /api/tags
更新标签

#### DELETE /api/tags?id=xxx
删除标签

#### GET /api/appearance
获取外观配置

#### PUT /api/appearance
更新外观配置

#### POST /api/sites/reorder-global
全局网站排序

#### POST /api/tags/reorder
标签排序

#### POST /api/tags/[tagId]/sites/reorder
标签内网站排序

### 资源接口

#### POST /api/assets/wallpaper
上传壁纸/Logo

**支持格式**:
- FormData: 文件上传
- JSON: URL 下载

**请求示例**:
```typescript
// FormData
const formData = new FormData();
formData.append('file', file);
formData.append('kind', 'wallpaper');

// JSON
{
  "sourceUrl": "https://example.com/image.jpg",
  "kind": "wallpaper"
}
```

#### GET /api/assets/[assetId]/file
获取资源文件

### 配置接口

#### POST /api/config/export
导出配置为 ZIP

#### POST /api/config/import
从 ZIP 导入配置

#### POST /api/config/reset
重置到默认配置

### 搜索接口

#### GET /api/search/suggest
获取搜索建议

**查询参数**:
- `q`: 搜索关键词
- `engine`: "google" | "baidu" | "local"

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

1. **TypeScript**: 全栈使用 TypeScript,确保类型安全
2. **ESLint**: 使用 Next.js 推荐配置
3. **命名规范**:
   - 组件: PascalCase
   - 函数: camelCase
   - 文件: kebab-case
   - 常量: UPPER_SNAKE_CASE

### 添加新功能

1. 在 `src/lib/types.ts` 定义类型
2. 在 `src/lib/schemas.ts` 添加验证模式
3. 在 `src/lib/services/repositories/` 添加数据访问层
4. 在 `src/app/api/` 添加 API 路由
5. 在 `src/components/` 添加 UI 组件
6. 在 `src/hooks/` 添加自定义 Hook

### 数据库迁移

修改表结构时:

1. 更新 `src/lib/core/database/schema.ts`
2. 在 `src/lib/core/database/migrations.ts` 添加迁移逻辑
3. 更新相关的 Repository

### 测试

```bash
# 运行 lint
npm run lint

# 构建测试
npm run build
```

### 部署

```bash
# 生产构建并启动
npm run build:start
```

---

## 常见问题

### 1. 数据库锁定

**原因**: SQLite WAL 模式下的并发问题

**解决**: 使用 better-sqlite3 的同步 API,避免并发写入

### 2. 主题闪烁

**原因**: 服务端渲染与客户端主题不一致

**解决**: 使用 `beforeInteractive` 脚本提前初始化主题

### 3. 拖拽性能

**原因**: 大量元素时的性能问题

**解决**: 使用虚拟化和延迟更新

---

## 贡献指南

欢迎提交 Issue 和 Pull Request!

---

## 许可证

MIT License
