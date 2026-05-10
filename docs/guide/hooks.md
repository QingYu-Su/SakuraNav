# Hooks 与 React 19

## 自定义 Hooks (`hooks/`)

| Hook | 用途 |
|:-----|:-----|
| `useSakuraNavOrchestrator` | 编排 Hook（Composition Root），整合全部 hooks 调用、状态管理和 effects，为应用级 Context 提供数据 |
| `useTheme` | 主题切换和外观配置 |
| `useSiteList` | 网站列表管理（分页加载、无限滚动） |
| `useAppearance` | 外观配置管理 |
| `useDragSort` | 拖拽排序（标签/网站） |
| `useSearchBar` | 搜索栏状态管理（引擎切换、建议、AI 推荐） |
| `useSearchEngineConfig` | 自定义搜索引擎配置（localStorage 持久化） |
| `useAiRecommend` | AI 智能推荐 |
| `useToastNotify` | 通知提示（配合撤销栈） |
| `useUndoStack` | 操作撤销栈（push/pop/clear，配合 Ctrl+Z 和 Toast） |
| `useConfigActions` | 配置导入/导出/重置操作、AI 书签分析导入 |
| `useCardTagEditor` | 网站标签编辑器（含创建/编辑/删除的撤销逻辑） |
| `useSiteName` | 站点名称管理 |
| `useOnlineCheck` | 批量在线检测（手动触发，通过 `syncNavigationData()` 刷新页面状态） |
| `useEditorConsole` | 编辑器控制台（批量管理标签和网站） |
| `useTagDelete` | 标签删除（普通标签三选项确认 + 社交标签专用对话框） |
| `useSocialCards` | 社交卡片管理（CRUD、点击行为，编辑后调用 `updateSiteInCache` 就地刷新） |
| `useNoteCards` | 笔记卡片管理（CRUD、查看弹窗 checkbox 交互，附件操作延迟持久化） |
| `useSwitchUser` | 用户切换（列表持久化、弹窗状态） |
| `useSessionExpired` | 会话失效检测与弹窗管理（SSR 检测、API 401 拦截） |
| `useSnapshots` | 快照管理（创建/列表/恢复/删除/重命名 + 编辑模式追踪 + 页面卸载 sendBeacon 保存） |

## React 19 特性使用

| 特性 | 使用位置 | 说明 |
|:-----|:---------|:-----|
| `useEffectEvent` | `use-site-list.ts`、`use-appearance.ts` | Effect 内安全引用最新状态 |
| `useTransition` | 页面切换 | 低优先级过渡 |
| React Compiler | `next.config.ts` | `reactCompiler: true`，自动组件记忆化 |
