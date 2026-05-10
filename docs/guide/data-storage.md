# 数据存储

## 数据库技术栈

| 项目 | 说明 |
|:-----|:-----|
| 数据库引擎 | SQLite（默认）/ MySQL / PostgreSQL，通过 `config.yml` 的 `database.type` 切换 |
| 抽象层 | `DatabaseAdapter` 接口统一 API（`query`/`queryOne`/`execute`/`exec`/`transaction`），各驱动实现适配器 |
| SQL 方言 | `sql-dialect.ts` 自动转换 `INSERT OR REPLACE/IGNORE`、命名参数 `@param` → `?`/`$1` 等 |
| SQLite 存储 | `storage/database/sakuranav.sqlite`（Docker 映射到 `/app/data/database/`）|
| WAL 模式 | SQLite 启用 WAL (Write-Ahead Logging) 提升并发读性能 |
| 并发控制 | SQLite 使用 Mutex 串行化避免 `SQLITE_BUSY`；MySQL/PG 使用连接池 |
| 智能初始化 | 空库自动建表+种子数据，已有数据直接使用，切回旧数据库可恢复旧数据 |

## 数据表结构

### `users` 表 — 注册用户

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                 -- 用户ID (user-UUID)
  username TEXT NOT NULL UNIQUE,       -- 用户名（唯一）
  password_hash TEXT NOT NULL,         -- 密码哈希 (scrypt, salt:key)
  role TEXT NOT NULL DEFAULT 'user',   -- 角色 (admin/user)
  nickname TEXT,                       -- 用户昵称（为空时显示用户名）
  avatar_asset_id TEXT,                -- 头像资源 ID
  avatar_color TEXT,                   -- 默认头像背景颜色（十六进制，注册时随机分配）
  username_changed INTEGER NOT NULL DEFAULT 0, -- 用户名是否已修改（0: 否, 1: 是，OAuth 用户可改一次）
  has_password INTEGER NOT NULL DEFAULT 1,     -- 是否已设置密码（OAuth 用户首次为 0）
  created_at TEXT NOT NULL             -- 创建时间 (ISO 8601)
);
```

> 💡 **角色说明**: `admin` 管理员（首次启动时通过引导页创建，存储在 `users` 表中，`id = ADMIN_USER_ID`）；`user` 普通用户。管理员的昵称和头像存储在 `app_settings` 表（`admin_nickname`、`admin_avatar_asset_id`）。管理员可在个人空间修改密码。

> 💡 **注册默认值**: 新用户注册时自动设置 `nickname = username`、`avatar_color` 从 15 种预定义颜色中随机选择。未上传头像时，前端显示昵称首字母 + 背景色。

> 💡 **OAuth 用户**: 通过第三方登录创建的用户默认 `has_password = 0`（未设置密码），可在个人空间首次设置密码（无需旧密码验证）。`username_changed = 0` 表示可修改一次用户名。

### `tags` 表 — 标签

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,                 -- 标签ID (UUID)
  name TEXT NOT NULL,                  -- 标签名称
  slug TEXT NOT NULL,                  -- URL友好的标识
  sort_order INTEGER NOT NULL,         -- 排序顺序
  is_hidden INTEGER NOT NULL DEFAULT 0, -- 是否隐藏 (0: 否, 1: 是)
  logo_url TEXT,                       -- Logo URL
  logo_bg_color TEXT,                  -- Logo 背景色
  description TEXT,                    -- 标签描述
  owner_id TEXT NOT NULL DEFAULT '__admin__' -- 数据所有者 ID
);
```

> 💡 **关键特性**: `sort_order` 支持拖拽排序 · `slug` URL 友好标识（多用户下不唯一） · `owner_id` 数据隔离，管理员为 `__admin__`
>
> ⚠️ `is_hidden` 字段保留在数据库中但前端已不再暴露该选项（多用户后隐藏标签功能废弃）

### `sites` 表 — 网站

```sql
CREATE TABLE sites (
  id TEXT PRIMARY KEY,                 -- 网站ID (UUID)
  name TEXT NOT NULL,                  -- 网站名称
  site_url TEXT NOT NULL,              -- 网站URL
  site_description TEXT,               -- 描述
  icon_url TEXT,                       -- 图标URL
  icon_bg_color TEXT,                  -- 图标背景色
  site_is_online INTEGER,              -- 在线状态 (0: 离线, 1: 在线, NULL: 未检测)
  site_skip_online_check INTEGER NOT NULL DEFAULT 0, -- 跳过在线检测
  site_online_check_frequency TEXT NOT NULL DEFAULT '1d', -- 检测频率 (5min / 1h / 1d)
  site_online_check_timeout INTEGER NOT NULL DEFAULT 3, -- 检测超时时间（秒）
  site_online_check_match_mode TEXT NOT NULL DEFAULT 'status', -- 在线判定模式
  site_online_check_keyword TEXT NOT NULL DEFAULT '', -- 在线判定关键词
  site_online_check_fail_threshold INTEGER NOT NULL DEFAULT 3, -- 连续失败判定离线阈值
  site_online_check_last_run TEXT,      -- 上次检测时间
  site_online_check_fail_count INTEGER NOT NULL DEFAULT 0, -- 连续失败计数
  site_offline_notify INTEGER NOT NULL DEFAULT 1, -- 离线通知开关
  site_is_pinned INTEGER NOT NULL DEFAULT 0, -- 是否置顶
  global_sort_order INTEGER NOT NULL,  -- 全局排序顺序
  card_type TEXT,                      -- 卡片类型 (NULL=普通网站, 社交卡片类型, note=笔记)
  card_data TEXT,                      -- 卡片载荷 JSON
  site_access_rules TEXT,              -- 访问规则 JSON (备选URL列表)
  site_recommend_context TEXT NOT NULL DEFAULT '', -- 推荐上下文
  site_recommend_context_enabled INTEGER NOT NULL DEFAULT 1,
  site_recommend_context_auto_gen INTEGER NOT NULL DEFAULT 1,
  site_pending_context_gen INTEGER NOT NULL DEFAULT 0,
  search_text TEXT NOT NULL DEFAULT '', -- 搜索文本（合并可搜索字段）
  site_ai_relation_enabled INTEGER NOT NULL DEFAULT 1,
  site_allow_linked_by_others INTEGER NOT NULL DEFAULT 1, -- [已废弃]
  site_related_sites_enabled INTEGER NOT NULL DEFAULT 1,
  site_pending_ai_analysis INTEGER NOT NULL DEFAULT 0,
  site_notes TEXT NOT NULL DEFAULT '',     -- 备忘备注
  site_notes_ai_enabled INTEGER NOT NULL DEFAULT 1,
  site_todos TEXT NOT NULL DEFAULT '[]',    -- 待办列表 JSON
  site_todos_ai_enabled INTEGER NOT NULL DEFAULT 1,
  social_hint TEXT,                      -- 社交卡片提示文本
  owner_id TEXT NOT NULL DEFAULT '__admin__',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### `card_tags` 表 — 网站标签关联

```sql
CREATE TABLE card_tags (
  site_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (site_id, tag_id),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

### `card_relations` 表 — 网站关联推荐

```sql
CREATE TABLE card_relations (
  id TEXT PRIMARY KEY,
  source_card_id TEXT NOT NULL,
  target_card_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  is_locked INTEGER NOT NULL DEFAULT 0,  -- [已废弃]
  source TEXT NOT NULL DEFAULT 'manual', -- 关联来源 (manual=手动, ai=AI推荐)
  reason TEXT NOT NULL DEFAULT '',      -- AI 推荐理由
  created_at TEXT NOT NULL,
  UNIQUE(source_card_id, target_card_id),
  FOREIGN KEY (source_card_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (target_card_id) REFERENCES sites(id) ON DELETE CASCADE
);
```

### `assets` 表 — 资源文件

```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,                  -- 资源类型 (wallpaper, logo, favicon, note-image, note-file, note-attachment)
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  original_name TEXT,
  note_id TEXT,
  file_size INTEGER,
  created_at TEXT NOT NULL
);
```

| kind | 说明 |
|:-----|:-----|
| `wallpaper` | 壁纸 |
| `logo` | Logo |
| `favicon` | Favicon |
| `note-image` | 笔记内联图片（≤10MB） |
| `note-file` | 笔记内联文件（≤100MB） |
| `note-attachment` | 笔记大文件附件（历史兼容） |

### `theme_appearances` 表 — 主题外观

```sql
CREATE TABLE theme_appearances (
  owner_id TEXT NOT NULL DEFAULT '__admin__',
  theme TEXT NOT NULL,                         -- 主题 (light, dark)
  desktop_wallpaper_asset_id TEXT,
  mobile_wallpaper_asset_id TEXT,
  font_preset TEXT NOT NULL,
  font_size REAL NOT NULL DEFAULT 16,
  overlay_opacity REAL NOT NULL,
  text_color TEXT NOT NULL,
  logo_asset_id TEXT,
  favicon_asset_id TEXT,
  desktop_card_frosted INTEGER NOT NULL DEFAULT 0,
  mobile_card_frosted INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (owner_id, theme)
);
```

> 💡 **多用户隔离**: `owner_id` + `theme` 为复合主键，每个用户拥有独立的 `light`/`dark` 外观配置行。

### `app_settings` 表 — 应用设置

```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

| key | 说明 |
|:----|:-----|
| `site_name` | 站点名称 |
| `floating_buttons` | 悬浮按钮配置（JSON） |
| `registration_enabled` | 注册功能是否开启 |
| `ai_api_key` | AI API 密钥（掩码） |
| `ai_base_url` | AI API 基础地址 |
| `ai_model` | AI 模型名称 |
| `admin_nickname` | 管理员昵称 |
| `oauth_providers` | OAuth 供应商配置（JSON） |
| `tokens_valid_after:<userId>` | Token 吊销时间戳 |

### `oauth_accounts` 表 — OAuth 第三方账号绑定

```sql
CREATE TABLE oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,              -- github/wechat/wecom/feishu/dingtalk
  provider_account_id TEXT NOT NULL,
  profile_data TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, provider_account_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### `snapshots` 表 — 数据快照

```sql
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  label TEXT NOT NULL,
  data TEXT NOT NULL,                  -- 快照数据 JSON
  created_at TEXT NOT NULL
);
```

### `url_online_cache` 表 — URL 在线状态缓存

```sql
CREATE TABLE url_online_cache (
  url TEXT PRIMARY KEY,
  is_online INTEGER NOT NULL,
  last_checked_at TEXT NOT NULL
);
```

## 虚拟标签

导航标签列表 API 会动态注入两个虚拟标签：

- `__social_cards__`：筛选显示所有社交卡片
- `__note_cards__`：筛选显示所有笔记卡片

虚拟标签的排序位置持久化到 `app_settings.virtual_tag_sort_orders`。标签名"社交卡片"和"笔记卡片"被系统保留，用户无法创建同名标签。

## 数据关系图

```
┌──────────┐           ┌──────────┐     ┌──────────┐
│  users   │           │  assets  │     │   tags   │
└────┬─────┘           └────┬─────┘     └──────────┘
     │                      │    │            │
     │                      │    │            ▼
     │                      │    ▼    ┌──────────┐
     │                      │   ┌──────────────┐ │card_tags │
     │                      │   │theme_appear- │ └──────────┘
     │                      │   │ances         │      │
     │                      │   └──────────────┘      │
     │                      │                          ▼
     │             ┌──────────────┐     ┌──────────────────┐
     │             │ app_settings │     │      sites       │
     │             └──────────────┘     └──────────────────┘
     │                      │                  ▲
     │                      └── note_id ───────┘
     │
     └──────────┐
                │
     ┌──────────┴──────┐
     │ oauth_accounts  │
     └─────────────────┘

     ┌──────────────┐
     │  snapshots   │  ← 独立表，通过 owner_id 关联用户
     └──────────────┘
```
