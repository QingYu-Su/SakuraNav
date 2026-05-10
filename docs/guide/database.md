# 数据库与服务层

## 数据库模块 (`lib/database`)

> 💡 **多数据库支持**：项目通过 `DatabaseAdapter` 接口支持 SQLite（默认）、MySQL、PostgreSQL 三种数据库。在 `config.yml` 中配置 `database.type` 即可切换，所有仓储层代码无需修改。
>
> **可扩展性约定**：
> - 新增数据库支持只需在 `src/lib/database/` 下新增适配器文件并实现 `DatabaseAdapter` 接口，然后在 `connection.ts` 的 `createAndInitializeAdapter()` 中添加对应的 case 即可
> - SQL 方言差异在 `sql-dialect.ts` 中集中处理，新增方言只需添加转换函数
> - 仓储层全部使用 `async` + `DatabaseAdapter` API，无需关心底层驱动

| 文件 | 职责 |
|:-----|:-----|
| `adapter.ts` | `DatabaseAdapter` 接口定义，统一 `query`/`queryOne`/`execute`/`exec`/`transaction` 等 API |
| `sql-dialect.ts` | SQL 方言转换工具，处理 `INSERT OR REPLACE/IGNORE`、`@param` 命名参数、`?` → `$1` 位置参数等差异 |
| `sqlite-adapter.ts` | SQLite 适配器，包装 better-sqlite3 为异步 API，内置 Mutex 串行化和事务重入支持 |
| `mysql-adapter.ts` | MySQL 适配器，使用 mysql2/promise 连接池 |
| `postgresql-adapter.ts` | PostgreSQL 适配器，使用 pg.Pool 连接池 |
| `connection.ts` | 连接管理工厂，根据 `config.yml` 的 `database.type` 创建对应适配器，全局单例 + 并发初始化去重 |
| `schema.ts` | 创建所有数据表（`CREATE TABLE IF NOT EXISTS`，兼容三种数据库） |
| `migrations.ts` | 检测表结构变化（通过 `hasColumn`/`hasTable`），自动执行 `ALTER TABLE`，幂等化 |
| `seed.ts` | 空库时初始化示例标签、示例网站和默认主题配置 |

## Repository 模式 (`lib/services`)

### SiteRepository — 网站数据访问

```typescript
// 获取分页网站列表（按 owner_id 隔离）
// 搜索匹配字段：名称、描述、标签名、已启用的推荐上下文、备注、待办
function getPaginatedCards(options: {
  ownerId: string;
  scope: "all" | "tag";
  tagId?: string | null;
  query?: string | null;
  cursor?: string | null;
}): PaginatedCards

// 获取所有网站（传入 ownerId 按用户隔离）
function getAllSitesForAdmin(ownerId?: string): Site[]

// 获取单个网站 / 创建 / 更新 / 删除
function getSiteById(id: string): Site | null
function createSite(input: {..., ownerId: string}): Site | null
function updateSite(input: {...}): Site | null
function deleteSite(id: string): void

// 仅更新备忘便签字段（轻量更新）
function updateSiteMemo(id: string, data: { notes?; notesAiEnabled?; todos?; todosAiEnabled? }): void

// 仅更新推荐上下文字段
function updateSiteRecommendContext(id: string, context: string): void

// 重建搜索文本（将可搜索字段合并到 search_text 列）
function recomputeSearchText(siteId: string): void

// 排序 / 在线检测 / 社交卡片 / 笔记卡片
function reorderSitesGlobal(siteIds: string[]): void
function reorderSitesInTag(tagId: string, siteIds: string[]): void
function updateSiteOnlineStatus(siteId: string, isOnline: boolean): void
function getSocialCardCount(ownerId?: string): number
function getNoteCardCount(ownerId?: string): number
function deleteAllSocialCardSites(ownerId: string): void
function deleteAllNoteCardSites(ownerId: string): void
```

### TagRepository — 标签数据访问

```typescript
function getVisibleTags(ownerId: string): Tag[]
function getTagById(id: string): Tag | null
function createTag(input: {..., ownerId: string}): Tag
function updateTag(input: {...}): Tag | null
function deleteTag(id: string): void
function reorderTags(tagIds: string[]): void
function restoreTagSites(tagId: string, siteIds: string[]): void
```

### AppearanceRepository — 外观数据访问

```typescript
function getAppearances(ownerId: string): Record<ThemeMode, ThemeAppearance>
function updateAppearances(ownerId: string, appearances: {...}): void
function getDefaultTheme(): ThemeMode
function getAppSettings(): AppSettings
function updateAppSettings(settings: {...}): AppSettings
function getVirtualTagSortOrders(): Record<string, number>
function saveVirtualTagSortOrders(orders: Record<string, number>): void
function insertVirtualTagsBySortOrder(tags, virtualTags): void
async function injectVirtualTags(tags: Tag[], ownerId: string): Promise<void>
```

### AssetRepository — 资源数据访问

```typescript
function createAsset(input): { id, kind, url }
function getAsset(id: string): StoredAsset | null
function deleteAsset(id: string): void
function getNoteAttachments(noteId: string): StoredAsset[]
function associateAssetsWithNote(assetIds: string[], noteId: string): void
function findOrphanNoteAssets(referencedAssetIds: Set<string>): StoredAsset[]
```

### 其他 Repository

| Repository | 文件 | 职责 |
|:-----|:-----|:-----|
| CardRepository | `card-repository.ts` | 社交卡片数据访问（兼容 cards 表 + sites 表社交卡片） |
| UserRepository | `user-repository.ts` | 注册用户 CRUD、密码哈希验证、角色管理、OAuth 用户创建、数据复制 |
| OAuthRepository | `oauth-repository.ts` | OAuth 账号绑定/解绑/查询 |
| SnapshotRepository | `snapshot-repository.ts` | 快照创建/恢复/删除/重命名/过期清理 |

## 服务层

| 服务 | 文件 | 职责 |
|:-----|:-----|:-----|
| ConfigService | `config-service.ts` | 重置默认配置、重置用户数据、从 ZIP 增量/覆盖导入配置 |
| DataPortabilityService | `data-portability-service.ts` | 用户数据可移植性：可扩展导出、clean/增量/覆盖导入、HMAC-SHA256 签名校验 |
| SearchService | `search-service.ts` | 获取搜索建议 |
| NotificationRepository | `notification-repository.ts` | 通知配置 CRUD + Webhook 发送 |
| OnlineCheckScheduler | `online-check-scheduler.ts` | 在线检查定时调度器（每天 4 AM 批量检查 + 重试） |
| UrlOnlineCacheRepository | `url-online-cache-repository.ts` | URL 在线状态缓存管理 |
| OAuthProviders | `oauth-providers.ts` | OAuth 供应商配置读写、授权 URL 构建、Token 交换（server-only） |
