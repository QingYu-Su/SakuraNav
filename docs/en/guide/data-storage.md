# Data Storage

## Database Tech Stack

| Item | Description |
|:-----|:------------|
| Database Engine | SQLite (default) / MySQL / PostgreSQL, switchable via `config.yml` `database.type` |
| Abstraction Layer | `DatabaseAdapter` interface with unified API (`query`/`queryOne`/`execute`/`exec`/`transaction`), each driver implements an adapter |
| SQL Dialect | `sql-dialect.ts` auto-converts `INSERT OR REPLACE/IGNORE`, named params `@param` → `?`/`$1`, etc. |
| SQLite Storage | `storage/database/sakuranav.sqlite` (Docker maps to `/app/data/database/`) |
| WAL Mode | SQLite enables WAL (Write-Ahead Logging) for improved concurrent read performance |
| Concurrency Control | SQLite uses Mutex serialization to avoid `SQLITE_BUSY`; MySQL/PG use connection pooling |
| Smart Initialization | Empty database auto-creates tables + seed data; existing data is used directly; switching back to old database restores old data |

## Data Table Structure

### `users` Table — Registered Users

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                 -- User ID (user-UUID)
  username TEXT NOT NULL UNIQUE,       -- Username (unique)
  password_hash TEXT NOT NULL,         -- Password hash (scrypt, salt:key)
  role TEXT NOT NULL DEFAULT 'user',   -- Role (admin/user)
  nickname TEXT,                       -- User nickname (displays username when empty)
  avatar_asset_id TEXT,                -- Avatar asset ID
  avatar_color TEXT,                   -- Default avatar background color (hex, randomly assigned on registration)
  username_changed INTEGER NOT NULL DEFAULT 0, -- Whether username has been changed (0: no, 1: yes, OAuth users can change once)
  has_password INTEGER NOT NULL DEFAULT 1,     -- Whether password is set (0 for OAuth users initially)
  created_at TEXT NOT NULL             -- Creation time (ISO 8601)
);
```

> 💡 **Role Notes**: `admin` administrator (created via setup wizard on first startup, stored in `users` table with `id = ADMIN_USER_ID`); `user` regular user. Admin's nickname and avatar are stored in `app_settings` table (`admin_nickname`, `admin_avatar_asset_id`). Admin can change password in personal space.

> 💡 **Registration Defaults**: New users automatically get `nickname = username` and `avatar_color` randomly chosen from 15 predefined colors. When no avatar is uploaded, the frontend displays the first letter of the nickname + background color.

> 💡 **OAuth Users**: Users created via third-party login default to `has_password = 0` (no password set). They can set a password for the first time in personal space (no old password verification needed). `username_changed = 0` means they can change their username once.

### `tags` Table — Tags

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,                 -- Tag ID (UUID)
  name TEXT NOT NULL,                  -- Tag name
  slug TEXT NOT NULL,                  -- URL-friendly identifier
  sort_order INTEGER NOT NULL,         -- Sort order
  is_hidden INTEGER NOT NULL DEFAULT 0, -- Hidden flag (0: no, 1: yes)
  logo_url TEXT,                       -- Logo URL
  logo_bg_color TEXT,                  -- Logo background color
  description TEXT,                    -- Tag description
  owner_id TEXT NOT NULL DEFAULT '__admin__' -- Data owner ID
);
```

> 💡 **Key Features**: `sort_order` supports drag sorting · `slug` URL-friendly identifier (not unique across users) · `owner_id` data isolation, admin is `__admin__`
>
> ⚠️ `is_hidden` field is retained in the database but the frontend no longer exposes this option (hidden tag feature deprecated after multi-user)

### `sites` Table — Sites

```sql
CREATE TABLE sites (
  id TEXT PRIMARY KEY,                 -- Site ID (UUID)
  name TEXT NOT NULL,                  -- Site name
  url TEXT NOT NULL,                   -- Site URL
  description TEXT,                    -- Description
  icon_url TEXT,                       -- Icon URL
  icon_bg_color TEXT,                  -- Icon background color
  is_online INTEGER,                   -- Online status (0: offline, 1: online, NULL: unchecked)
  skip_online_check INTEGER NOT NULL DEFAULT 0, -- Skip online check
  online_check_frequency TEXT NOT NULL DEFAULT '1d', -- Check frequency (5min / 1h / 1d)
  online_check_timeout INTEGER NOT NULL DEFAULT 3, -- Check timeout (seconds)
  online_check_match_mode TEXT NOT NULL DEFAULT 'status', -- Online match mode
  online_check_keyword TEXT NOT NULL DEFAULT '', -- Online match keyword
  online_check_fail_threshold INTEGER NOT NULL DEFAULT 3, -- Consecutive failure threshold for offline
  online_check_last_run TEXT,           -- Last check time
  online_check_fail_count INTEGER NOT NULL DEFAULT 0, -- Consecutive failure count
  offline_notify INTEGER NOT NULL DEFAULT 1, -- Offline notification toggle
  is_pinned INTEGER NOT NULL DEFAULT 0, -- Pinned flag
  global_sort_order INTEGER NOT NULL,  -- Global sort order
  card_type TEXT,                      -- Card type (NULL=regular site, social card type, note=note card)
  card_data TEXT,                      -- Card payload JSON
  access_rules TEXT,                   -- Access rules JSON (alternate URL list)
  recommend_context TEXT NOT NULL DEFAULT '', -- Recommendation context
  recommend_context_enabled INTEGER NOT NULL DEFAULT 1,
  recommend_context_auto_gen INTEGER NOT NULL DEFAULT 1,
  pending_context_gen INTEGER NOT NULL DEFAULT 0,
  search_text TEXT NOT NULL DEFAULT '', -- Search text (merged searchable fields)
  ai_relation_enabled INTEGER NOT NULL DEFAULT 1,
  allow_linked_by_others INTEGER NOT NULL DEFAULT 1, -- [Deprecated]
  related_sites_enabled INTEGER NOT NULL DEFAULT 1,
  pending_ai_analysis INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',         -- Memo notes
  notes_ai_enabled INTEGER NOT NULL DEFAULT 1,
  todos TEXT NOT NULL DEFAULT '[]',       -- Todo list JSON
  todos_ai_enabled INTEGER NOT NULL DEFAULT 1,
  owner_id TEXT NOT NULL DEFAULT '__admin__',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### `card_tags` Table — Site-Tag Association

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

### `card_relations` Table — Site Related Recommendations

```sql
CREATE TABLE card_relations (
  id TEXT PRIMARY KEY,
  source_card_id TEXT NOT NULL,
  target_card_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  is_locked INTEGER NOT NULL DEFAULT 0,  -- [Deprecated]
  source TEXT NOT NULL DEFAULT 'manual', -- Relation source (manual=manual, ai=AI recommended)
  reason TEXT NOT NULL DEFAULT '',      -- AI recommendation reason
  created_at TEXT NOT NULL,
  UNIQUE(source_card_id, target_card_id),
  FOREIGN KEY (source_card_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (target_card_id) REFERENCES sites(id) ON DELETE CASCADE
);
```

### `assets` Table — Resource Files

```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,                  -- Resource type (wallpaper, logo, favicon, note-image, note-file, note-attachment)
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

| kind | Description |
|:-----|:------------|
| `wallpaper` | Wallpaper |
| `logo` | Logo |
| `favicon` | Favicon |
| `note-image` | Note inline image (≤10MB) |
| `note-file` | Note inline file (≤100MB) |
| `note-attachment` | Note large file attachment (legacy compat) |

### `theme_appearances` Table — Theme Appearance

```sql
CREATE TABLE theme_appearances (
  owner_id TEXT NOT NULL DEFAULT '__admin__',
  theme TEXT NOT NULL,                         -- Theme (light, dark)
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

> 💡 **Multi-User Isolation**: `owner_id` + `theme` is a composite primary key. Each user has independent `light`/`dark` appearance configuration rows.

### `app_settings` Table — App Settings

```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

| key | Description |
|:----|:------------|
| `site_name` | Site name |
| `floating_buttons` | Floating button config (JSON) |
| `registration_enabled` | Whether registration is enabled |
| `ai_api_key` | AI API key (masked) |
| `ai_base_url` | AI API base URL |
| `ai_model` | AI model name |
| `admin_nickname` | Admin nickname |
| `oauth_providers` | OAuth provider config (JSON) |
| `tokens_valid_after:<userId>` | Token revocation timestamp |

### `oauth_accounts` Table — OAuth Third-Party Account Bindings

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

### `snapshots` Table — Data Snapshots

```sql
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  label TEXT NOT NULL,
  data TEXT NOT NULL,                  -- Snapshot data JSON
  created_at TEXT NOT NULL
);
```

### `url_online_cache` Table — URL Online Status Cache

```sql
CREATE TABLE url_online_cache (
  url TEXT PRIMARY KEY,
  is_online INTEGER NOT NULL,
  last_checked_at TEXT NOT NULL
);
```

## Virtual Tags

The navigation tag list API dynamically injects two virtual tags:

- `__social_cards__`: Filters to show all social cards
- `__note_cards__`: Filters to show all note cards

Virtual tag sort positions are persisted to `app_settings.virtual_tag_sort_orders`. The tag names "Social Cards" and "Note Cards" are reserved by the system; users cannot create tags with the same names.

## Data Relationship Diagram

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
     │  snapshots   │  ← Independent table, linked to user via owner_id
     └──────────────┘
```
