# Online Check

## Note Reference Todo Sync

Note cards can reference site cards via `sakura-site://` link syntax. When saving/deleting a note, the backend automatically syncs todo items to the referenced site cards.

**Data Flow**:

```
[text](sakura-site://siteId) reference in note content
        ↓ syncSiteTodosFromNotes()
Site card TodoItem.noteId field (linked to note ID)
```

**Core Conventions** (extensibility):

| Convention | Description |
|:-----------|:------------|
| `TodoItem.noteId` | Optional field in `types.ts`. Has value = note-referenced auto-generated todo; no value = user manually added |
| `siteInputSchema` + `memoUpdateSchema` | Both Zod schemas include `noteId`, ensuring the field is not lost during API saves |
| `syncSiteTodosFromNotes()` | Called after every note CRUD operation, auto-adds/removes/retains todos |
| UI distinction | Note-referenced todos use indigo background, user-added todos use default color |

**Constraint**: Note-referenced todos cannot be edited/deleted, only their completion status can be toggled.

## Online Check

Online checking is managed centrally through the `url_online_cache` cache table. Multiple site cards with the same URL share check results, avoiding redundant checks within 20 hours.

**Batch Check** (scheduled/manual/post-import):

| Component | File | Responsibility |
|:----------|:-----|:---------------|
| `useOnlineCheck` | `hooks/use-online-check.ts` | Client-side batch check trigger, refreshes page on completion |
| `POST /api/sites/check-online` | `app/api/sites/check-online/route.ts` | Synchronous single-round batch check |
| `OnlineCheckScheduler` | `lib/services/online-check-scheduler.ts` | Daily 4 AM scheduled check with retries |
| `updateSitesOnlineStatus` | `lib/services/site-repository.ts` | Batch update + offline notification trigger |

**Instant Check** (new site/URL change):

| Component | File | Responsibility |
|:----------|:-----|:---------------|
| `useSiteTagEditor` | `hooks/use-site-tag-editor.ts` | Trigger condition evaluation |
| `POST /api/sites/check-online-single` | `app/api/sites/check-online-single/route.ts` | Single site check, HEAD → GET fallback |
| `updateSiteOnlineStatus` | `lib/services/site-repository.ts` | Directly set site online status |

**Trigger Scenarios**:

| Scenario | Mode | Trigger Condition |
|:---------|:-----|:------------------|
| Admin manual trigger | Batch | `useOnlineCheck.handleRunOnlineCheck()` |
| Post-import/reset | Batch | `useConfigActions.triggerPostImportOnlineCheck()` |
| Daily 4 AM | Batch (background) | `OnlineCheckScheduler` scheduled trigger |
| New site creation | Instant | `skipOnlineCheck=false`, URL cache miss |
| Site URL change | Instant | Main URL differs from original snapshot, URL cache miss |

**UI States**:

| State | Color | Condition |
|:------|:------|:----------|
| Online | `text-emerald-400` | `isOnline=true` |
| Offline | `text-red-400` | `isOnline=false` |
| Not shown | — | `skipOnlineCheck=true` or `isOnline=null` (unchecked) |

**Cache Maintenance** (provided by `url-online-cache-repository.ts`):

| Function | Responsibility |
|:---------|:---------------|
| `getUrlOnlineStatusIfFresh(url)` | Query single URL cache (valid for 20 hours) |
| `getUrlsOnlineStatusBatch(urls)` | Batch query URL cache |
| `upsertUrlOnlineCache(url, isOnline)` | Single URL cache write |
| `upsertUrlOnlineCacheBatch(results)` | Batch URL cache write |
| `cleanOrphanUrlCache()` | Clean URL cache entries no longer used by any site |
| `applyUrlCacheToSites()` | Apply cache to all sites |

> 💡 **Extensibility Convention** — The `url_online_cache` table is registered in `sql-dialect.ts`'s `UPSERT_CONFLICT_COLUMNS`, ensuring `INSERT OR REPLACE` is correctly translated to UPSERT on MySQL/PostgreSQL.
