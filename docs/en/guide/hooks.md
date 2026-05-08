# Hooks & React 19

## Custom Hooks (`hooks/`)

| Hook | Purpose |
|:-----|:--------|
| `useSakuraNavOrchestrator` | Orchestrator Hook (Composition Root), integrates all hook calls, state management and effects, provides data to the application-level Context |
| `useTheme` | Theme switching and appearance config |
| `useSiteList` | Site list management (paginated loading, infinite scroll) |
| `useAppearance` | Appearance config management |
| `useDragSort` | Drag & drop sorting (tags/sites) |
| `useSearchBar` | Search bar state management (engine switching, suggestions, AI recommendations) |
| `useSearchEngineConfig` | Custom search engine config (localStorage persisted) |
| `useAiRecommend` | AI smart recommendations |
| `useToastNotify` | Toast notifications (works with undo stack) |
| `useUndoStack` | Operation undo stack (push/pop/clear, works with Ctrl+Z and Toast) |
| `useConfigActions` | Config import/export/reset operations, AI bookmark analysis import |
| `useSiteTagEditor` | Site tag editor (includes undo logic for create/edit/delete) |
| `useSiteName` | Site name management |
| `useOnlineCheck` | Batch online check (manual trigger, refreshes page state via `syncNavigationData()`) |
| `useEditorConsole` | Editor console (batch manage tags and sites) |
| `useTagDelete` | Tag deletion (normal tag three-option confirmation + social tag dedicated dialog) |
| `useSocialCards` | Social card management (CRUD, click behavior, in-place refresh via `updateSiteInCache` after edit) |
| `useNoteCards` | Note card management (CRUD, view dialog checkbox interaction, attachment delayed persistence) |
| `useSwitchUser` | User switching (persisted list, dialog state) |
| `useSessionExpired` | Session expiry detection and dialog management (SSR detection, API 401 interception) |
| `useSnapshots` | Snapshot management (create/list/restore/delete/rename + edit mode tracking + page unload sendBeacon save) |

## React 19 Features

| Feature | Usage Location | Description |
|:--------|:---------------|:------------|
| `useEffectEvent` | `use-site-list.ts`, `use-appearance.ts` | Safely reference latest state inside Effects |
| `useTransition` | Page switching | Low-priority transitions |
| React Compiler | `next.config.ts` | `reactCompiler: true`, automatic component memoization |
