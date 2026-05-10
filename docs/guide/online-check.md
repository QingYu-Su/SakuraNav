# 在线检查机制

## 笔记引用 Todo 同步

笔记卡片可通过 `sakura-site://` 链接语法引用网站卡片。保存/删除笔记时，后端自动同步 todo 项到被引用的网站卡片。

**数据流**：

```
笔记内容中 [文字](sakura-site://siteId) 引用
        ↓ syncSiteTodosFromNotes()
网站卡片 TodoItem.noteId 字段（关联到笔记 ID）
```

**核心约定**（可扩展性）：

| 约定 | 说明 |
|:-----|:-----|
| `TodoItem.noteId` | `types.ts` 中的可选字段。有值 = 笔记引用自动生成的 todo，无值 = 用户手动添加 |
| `siteInputSchema` + `memoUpdateSchema` | 两处 Zod schema 均已包含 `noteId`，确保 API 保存时不会丢失该字段 |
| `syncSiteTodosFromNotes()` | 每次笔记 CRUD 后调用，自动添加/移除/保留 todo |
| UI 区分 | 笔记引用的 todo 使用 indigo 底色，用户手动的使用默认色 |

**约束**：笔记引用的 todo 不可编辑/删除，只能切换完成状态。

## 在线检查

在线检查通过 `url_online_cache` 缓存表统一管理，同一 URL 的多个站点卡片共享检查结果，20 小时内免重复检查。

**批量检查**（定时/手动/导入后）：

| 组件 | 文件 | 职责 |
|:-----|:-----|:-----|
| `useOnlineCheck` | `hooks/use-online-check.ts` | 客户端触发批量检查，完成后刷新页面 |
| `POST /api/site-cards/check-online` | `app/api/site-cards/check-online/route.ts` | 同步执行单轮批量检查 |
| `OnlineCheckScheduler` | `lib/services/online-check-scheduler.ts` | 每天 4 AM 定时检查，含重试 |
| `updateSitesOnlineStatus` | `lib/services/site-repository.ts` | 批量更新 + 离线通知触发 |

**即时检查**（新建/URL 变更）：

| 组件 | 文件 | 职责 |
|:-----|:-----|:-----|
| `useCardTagEditor` | `hooks/use-site-tag-editor.ts` | 前端触发条件判断 |
| `performSingleSiteOnlineCheck` | `lib/services/online-check-service.ts` | 单站在线检查服务（缓存查询 → HEAD→GET 回退 → 重试 → 更新状态 → 离线通知） |
| `POST /api/site-cards/check-online-single` | `app/api/site-cards/check-online-single/route.ts` | API 路由层（鉴权+限流+调用服务） |
| `updateSiteOnlineStatus` | `lib/services/site-repository.ts` | 直接设置站点在线状态 |

> 💡 **可扩展性约定** — `performSingleSiteOnlineCheck(siteId)` 是统一的单站在线检查服务函数，前端（通过 API 路由）、API Token 调用、MCP 工具均通过此函数执行在线检查，触发条件一致（新建站点 / URL 变更 / siteSkipOnlineCheck 从关→开）。前端额外调用 `check-online-single` 时会命中 URL 缓存，不会重复检查。

**触发时机**：

| 场景 | 模式 | 触发条件 |
|:-----|:-----|:---------|
| 管理员手动触发 | 批量 | `useOnlineCheck.handleRunOnlineCheck()` |
| 导入/重置后 | 批量 | `useConfigActions.triggerPostImportOnlineCheck()` |
| 每天 4 AM | 批量（后台） | `OnlineCheckScheduler` 定时触发 |
| 新建站点 | 即时 | `siteSkipOnlineCheck=false`，前端/API/MCP 均触发 |
| 站点 URL 变更 | 即时 | 主站 URL 与原始快照不同，前端/API/MCP 均触发 |
| siteSkipOnlineCheck 从关→开 | 即时 | API/MCP 更新时检测开关变化 |
| MCP 创建/批量创建 | 即时 | 创建成功后异步触发 `performSingleSiteOnlineCheck` |

**UI 状态**：

| 状态 | 颜色 | 条件 |
|:-----|:-----|:-----|
| 在线 | `text-emerald-400` | `siteIsOnline=true` |
| 离线 | `text-red-400` | `siteIsOnline=false` |
| 不显示 | — | `siteSkipOnlineCheck=true` 或 `siteIsOnline=null`（未检测） |

**缓存维护**（由 `url-online-cache-repository.ts` 提供）：

| 函数 | 职责 |
|:-----|:-----|
| `getUrlOnlineStatusIfFresh(url)` | 查询单个 URL 的缓存（20 小时内有效） |
| `getUrlsOnlineStatusBatch(urls)` | 批量查询 URL 缓存 |
| `upsertUrlOnlineCache(url, siteIsOnline)` | 单个 URL 缓存写入 |
| `upsertUrlOnlineCacheBatch(results)` | 批量 URL 缓存写入 |
| `cleanOrphanUrlCache()` | 清理不再被任何站点使用的 URL 缓存 |
| `applyUrlCacheToSites()` | 将缓存应用到所有站点 |

> 💡 **可扩展性约定** — `url_online_cache` 表已在 `sql-dialect.ts` 的 `UPSERT_CONFLICT_COLUMNS` 中注册，确保 `INSERT OR REPLACE` 在 MySQL/PostgreSQL 上正确翻译为 UPSERT。
