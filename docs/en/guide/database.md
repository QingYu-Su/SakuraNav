# Database & Service Layer

## Database Module (`lib/database`)

> 💡 **Multi-Database Support**: The project supports SQLite (default), MySQL, and PostgreSQL through the `DatabaseAdapter` interface. Configure `database.type` in `config.yml` to switch — all repository layer code remains unchanged.
>
> **Extensibility Convention**:
> - To add a new database, create an adapter file in `src/lib/database/` implementing the `DatabaseAdapter` interface, then add the corresponding case in `connection.ts`'s `createAndInitializeAdapter()`
> - SQL dialect differences are handled centrally in `sql-dialect.ts`; add a conversion function for new dialects
> - Repository layer uses `async` + `DatabaseAdapter` API exclusively, with no need to worry about underlying drivers

| File | Responsibility |
|:-----|:---------------|
| `adapter.ts` | `DatabaseAdapter` interface definition with unified `query`/`queryOne`/`execute`/`exec`/`transaction` APIs |
| `sql-dialect.ts` | SQL dialect conversion utility handling `INSERT OR REPLACE/IGNORE`, `@param` named parameters, `?` → `$1` positional parameters, etc. |
| `sqlite-adapter.ts` | SQLite adapter wrapping better-sqlite3 as async API with built-in Mutex serialization and transaction reentry support |
| `mysql-adapter.ts` | MySQL adapter using mysql2/promise connection pool |
| `postgresql-adapter.ts` | PostgreSQL adapter using pg.Pool connection pool |
| `connection.ts` | Connection management factory creating the appropriate adapter based on `config.yml` `database.type`, global singleton + concurrent init dedup |
| `schema.ts` | Creates all data tables (`CREATE TABLE IF NOT EXISTS`, compatible with all three databases) |
| `migrations.ts` | Detects schema changes (via `hasColumn`/`hasTable`), auto-executes `ALTER TABLE`, idempotent |
| `seed.ts` | Initializes sample tags, sample sites, and default theme config for empty databases |

## Repository Pattern (`lib/services`)

### SiteRepository — Site Data Access

```typescript
// Get paginated site list (isolated by owner_id)
// Search matches: name, description, tag name, enabled recommendation context, notes, todos
function getPaginatedSites(options: {
  ownerId: string;
  scope: "all" | "tag";
  tagId?: string | null;
  query?: string | null;
  cursor?: string | null;
}): PaginatedSites

// Get all sites (isolated by ownerId when provided)
function getAllSitesForAdmin(ownerId?: string): Site[]

// Get/Create/Update/Delete single site
function getSiteById(id: string): Site | null
function createSite(input: {..., ownerId: string}): Site | null
function updateSite(input: {...}): Site | null
function deleteSite(id: string): void

// Update memo fields only (lightweight update)
function updateSiteMemo(id: string, data: { notes?; notesAiEnabled?; todos?; todosAiEnabled? }): void

// Update recommendation context field only
function updateSiteRecommendContext(id: string, context: string): void

// Rebuild search text (merge searchable fields into search_text column)
function recomputeSearchText(siteId: string): void

// Sorting / Online check / Social cards / Note cards
function reorderSitesGlobal(siteIds: string[]): void
function reorderSitesInTag(tagId: string, siteIds: string[]): void
function updateSiteOnlineStatus(siteId: string, isOnline: boolean): void
function getSocialCardCount(ownerId?: string): number
function getNoteCardCount(ownerId?: string): number
function deleteAllSocialCardSites(ownerId: string): void
function deleteAllNoteCardSites(ownerId: string): void
```

### TagRepository — Tag Data Access

```typescript
function getVisibleTags(ownerId: string): Tag[]
function getTagById(id: string): Tag | null
function createTag(input: {..., ownerId: string}): Tag
function updateTag(input: {...}): Tag | null
function deleteTag(id: string): void
function reorderTags(tagIds: string[]): void
function restoreTagSites(tagId: string, siteIds: string[]): void
```

### AppearanceRepository — Appearance Data Access

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

### AssetRepository — Asset Data Access

```typescript
function createAsset(input): { id, kind, url }
function getAsset(id: string): StoredAsset | null
function deleteAsset(id: string): void
function getNoteAttachments(noteId: string): StoredAsset[]
function associateAssetsWithNote(assetIds: string[], noteId: string): void
function findOrphanNoteAssets(referencedAssetIds: Set<string>): StoredAsset[]
```

### Other Repositories

| Repository | File | Responsibility |
|:-----------|:-----|:---------------|
| CardRepository | `card-repository.ts` | Social card data access (compatible with cards table + sites table social cards) |
| UserRepository | `user-repository.ts` | Registered user CRUD, password hash verification, role management, OAuth user creation, data copying |
| OAuthRepository | `oauth-repository.ts` | OAuth account binding/unbinding/queries |
| SnapshotRepository | `snapshot-repository.ts` | Snapshot create/restore/delete/rename/expiry cleanup |

## Service Layer

| Service | File | Responsibility |
|:--------|:-----|:---------------|
| ConfigService | `config-service.ts` | Reset default config, reset user data, incremental/overwrite config import from ZIP |
| DataPortabilityService | `data-portability-service.ts` | User data portability: extensible export, clean/incremental/overwrite import, HMAC-SHA256 signature verification |
| SearchService | `search-service.ts` | Search suggestions |
| NotificationRepository | `notification-repository.ts` | Notification config CRUD + Webhook dispatch |
| OnlineCheckScheduler | `online-check-scheduler.ts` | Online check scheduled scheduler (daily 4 AM batch check + retries) |
| UrlOnlineCacheRepository | `url-online-cache-repository.ts` | URL online status cache management |
| OAuthProviders | `oauth-providers.ts` | OAuth provider config read/write, authorization URL construction, token exchange (server-only) |
