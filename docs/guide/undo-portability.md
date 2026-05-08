# 撤销与数据可移植性

## 撤销系统 (`use-undo-stack.ts`)

撤销系统基于栈结构，支持网站/标签的创建、编辑、删除操作后通过 Ctrl+Z 撤销。

**核心架构**：

| 组件 | 文件 | 职责 |
|:-----|:-----|:-----|
| `useUndoStack` | `hooks/use-undo-stack.ts` | 撤销栈管理（push/pop/clear），返回栈引用 |
| `UndoAction` | `components/admin/types.ts` | 撤销操作类型定义（含 `toastSignature` 去重） |
| `SiteFormState` | `components/admin/types.ts` | 网站/标签表单快照类型，撤销操作的数据载体 |

**撤销触发方式**：
1. **Ctrl+Z 快捷键** — `use-sakura-nav-orchestrator.ts` 监听 `keydown`，调用 `undoStack.pop()` 执行最近的 undo 回调
2. **Toast 撤销按钮** — 操作成功后 Toast 显示「撤销」按钮，点击触发 undo

**撤销操作分类**：

| 操作 | 撤销方式 | 说明 |
|:-----|:---------|:-----|
| 创建网站 | DELETE 新网站 | 恢复全局排序 |
| 编辑网站 | PUT 原始快照 | 恢复图标资源 |
| 删除网站 | POST 重建网站 | 恢复全局排序 + 标签内排序 + 关联 |
| 创建标签 | DELETE 新标签 | — |
| 编辑标签 | PUT 原始快照 | — |
| 删除标签 | POST 重建标签 | 恢复标签排序 + 站点关联 |
| 删除标签+网站 | POST 先标签再网站 | **必须先恢复标签（FK 约束），再恢复网站** |

### 可扩展性约定

> 💡 **规则一：字段扩展** — 每种实体都有一个 **表单快照函数**，负责将实体对象映射为撤销可用的完整快照。新增字段时，只需在该实体的快照函数中添加映射，所有撤销逻辑会通过 `...snap` 展开自动跟随。

| 实体 | 快照函数 | 文件 |
|:-----|:---------|:-----|
| 网站/标签 | `siteToFormState()` | `components/admin/types.ts` |
| 社交卡片 | `cardToForm()` | `hooks/use-social-cards.ts` |
| 笔记卡片 | `noteCardToForm()` | `hooks/use-note-cards.ts` |

> 💡 **规则二：类型扩展** — 每种实体都有一个 **类型元数据注册表**，声明该实体的子类型及其字段映射。新增子类型时，只需在注册表中添加一条配置，CRUD 函数和撤销逻辑会由元数据驱动自动适配。

> 💡 **接入全新实体** — 撤销栈的 `UndoAction` 是 **类型无关的纯接口**（`{ label, undo, toastSignature? }`），不绑定任何数据结构。接入新实体只需：
> 1. 编写 CRUD hook，定义快照函数和（可选的）类型注册表
> 2. 通过 `setMessage(msg, undoAction)` 传入 undo 回调
> 3. 无需修改 `use-undo-stack.ts`、Ctrl+Z 监听、Toast 撤销按钮等任何基础设施

### 延迟资源删除

编辑/删除操作中使用 `pendingDeleteAssetIds`（React ref）暂存待删除的图标资源 ID，撤销时从中移除（避免误删）。资源在退出编辑模式或页面刷新时统一清理。

### 轻量刷新策略

| 场景 | 刷新方式 | 说明 |
|:-----|:---------|:-----|
| 网站卡片 PUT（编辑） | `updateSiteInCache()` 就地更新 | 仅替换对应条目 |
| 编辑后标签关联变化 | `syncNavigationData()` | 刷新标签列表更新 `siteCount` |
| 社交/笔记卡片 PUT | 本地 `setCards(prev => prev.map(...))` | 仅更新对应条目 |
| 新建/删除/撤销 | `syncNavigationData()` + `syncAdminBootstrap()` | 全量刷新 |

### 笔记附件延迟持久化

附件 Tab 的操作（上传/删除）在编辑模式下仅标记，不立即持久化：
1. 上传附件时不关联 `noteId`，统一通过 `pendingAttachmentIds` 跟踪
2. 删除附件仅标记到 `deletedAttachmentIds`，从本地列表移除但不调用 API
3. 点击「保存」时统一处理：关联新附件 + 软删除标记的附件
4. 撤销操作通过反向附件变更实现
5. 取消编辑时，未关联的孤立附件会在后续操作时被自动回收

---

## 数据可移植性（`data-portability-service.ts`）

数据导入/导出系统遵循统一的可扩展约束，适用于任何卡片类型和字段。

> 💡 **导出** — 使用 `SELECT *` 获取所有列 + 黑名单过滤。新增字段自动导出，无需改动。

> 💡 **clean 模式导入** — 使用 `dynamicInsert()` 动态检测目标表结构，只插入存在的列。新增字段自动导入。

> 💡 **增量/覆盖模式导入 · INSERT** — 使用 `dynamicInsert()` 动态检测，新增字段自动导入。

> 💡 **增量/覆盖模式导入 · UPDATE** — 动态构建 `SET` 子句，遍历导入数据的所有字段并与表结构比对。新增字段自动跟随。

> 💡 **增量/覆盖模式导入 · 去重匹配** — 由 `getCardIdentityKey()` 统一驱动：
>
> | card_type | 匹配策略 | identity key 格式 |
> |:----------|:---------|:------------------|
> | `IS NULL`（普通网站） | 归一化 URL | `url:<normalizedUrl>` |
> | 在 `SOCIAL_CARD_TYPE_META` 中（社交卡片） | `meta.idField` 提取值 | `<cardType>:<uniqueId>` |
> | `'note'`（笔记卡片） | 无匹配，总是 INSERT | — |
> | 未知类型（未来新卡片） | 无匹配，总是 INSERT | — |
>
> 新增卡片类型时，在 `SOCIAL_CARD_TYPE_META` 或 `getCardIdentityKey` 中注册身份提取策略即可参与去重。

> 💡 **card_data asset 引用映射** — `remapCardDataAssets()` 通用扫描 JSON payload 中的 asset 引用并映射。社交卡片使用 `/api/assets/{id}/file` 格式，笔记卡片使用 `/api/cards/note/img/{id}` 和 `/api/cards/note/file/{id}` 格式。

> 💡 **外观导入** — 动态构建 `INSERT ... ON CONFLICT DO UPDATE SET`，自动跟随 `theme_appearances` 表的新增列。

> 💡 **site_relations 导出/导入约定** — 已纳入可移植流程，新增字段时导出自动跟随（`SELECT *`），导入需同步更新各导入函数中的列列表。

### 笔记卡片可扩展性约定

| 扩展点 | 文件 | 说明 |
|:-------|:-----|:-----|
| 类型定义 `NoteCard` / `NoteCardFormState` | `lib/base/types.ts` + `hooks/use-note-cards.ts` | 新增字段时同步更新两处 |
| 转换函数 `siteToNoteCard()` | `lib/base/types.ts` | 从 `site.cardData` JSON 解析映射 |
| Repository 层 | `lib/services/site-repository.ts` | 纯 SQL 查询，新增字段无需改动 |
| API 路由 `/api/cards/note` | `app/api/cards/note/route.ts` | `cardData` JSON 序列化/反序列化 |
| SSR 标签注入 | `app/page.tsx` | 通过 `injectVirtualTags()` 统一注入 |
| 编辑器 / 快捷指令 | `components/sakura-nav/note-card-editor.tsx` | 输入 `/` 触发悬浮菜单，支持 todo/code/link/table 模板和文件上传 |
| 编辑器独立撤回 | `components/sakura-nav/note-card-editor.tsx` | Ctrl+Z 独立撤回栈（与全局无关，最多 30 条，500ms 防抖） |
