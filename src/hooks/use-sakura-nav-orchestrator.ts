/**
 * SakuraNav 编排 Hook — 应用的 Composition Root
 * @description 封装全部 hooks 调用、状态管理、effects 和事件处理
 * 新增功能时在此添加 hook 调用 + 在 Context 类型中扩展字段，主组件无需修改
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { siteConfig } from "@/lib/config/config";
import type { AppSettings, AdminBootstrap, SessionUser, Tag, ThemeAppearance, ThemeMode, FloatingButtonItem } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import { applyRoundedFavicon } from "@/lib/utils/crop-utils";
import { useTheme } from "@/hooks/use-theme";
import { useSiteList } from "@/hooks/use-site-list";
import { useAppearance } from "@/hooks/use-appearance";
import { useDragSort } from "@/hooks/use-drag-sort";
import { useSearchBar } from "@/hooks/use-search-bar";
import { useToastNotify } from "@/hooks/use-toast-notify";
import { useUndoStack } from "@/hooks/use-undo-stack";
import { useConfigActions } from "@/hooks/use-config-actions";
import { useSiteTagEditor, type SiteDeleteSortContext } from "@/hooks/use-site-tag-editor";
import { useSiteName } from "@/hooks/use-site-name";
import { useSearchEngineConfig } from "@/hooks/use-search-engine-config";
import { useSocialCards } from "@/hooks/use-social-cards";
import { useNoteCards } from "@/hooks/use-note-cards";
import { useSwitchUser } from "@/hooks/use-switch-user";
import { useSessionExpired } from "@/hooks/use-session-expired";
import { useTagDelete } from "@/hooks/use-tag-delete";
import { useDialogLayerState } from "@/components/sakura-nav/sakura-dialog-layer";
import type { SakuraNavContextValue } from "@/components/sakura-nav/sakura-nav-context";

// ── Props（与页面组件一致） ──

export type OrchestratorProps = {
  initialTags: Tag[];
  initialAppearances: Record<ThemeMode, ThemeAppearance>;
  initialSettings: AppSettings;
  initialFloatingButtons: FloatingButtonItem[];
  initialSession: SessionUser | null;
  sessionInvalidated?: boolean;
  defaultTheme: ThemeMode;
};

// ── 主 Hook ──

export function useSakuraNavOrchestrator(props: OrchestratorProps): SakuraNavContextValue {
  const {
    initialTags, initialAppearances, initialSettings,
    initialFloatingButtons, initialSession,
    sessionInvalidated, defaultTheme,
  } = props;

  /* ========== 主题 ========== */
  const { themeMode, setThemeMode } = useTheme(defaultTheme);

  /* ========== 认证状态 ========== */
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialSession?.isAuthenticated));
  const [role, setRole] = useState<import("@/lib/base/types").UserRole | null>(initialSession?.role ?? null);
  const [nickname, setNickname] = useState<string | null>(initialSession?.nickname ?? null);
  const [username, setUsername] = useState<string | null>(initialSession?.username ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialSession?.avatarUrl ?? null);
  const [avatarColor, setAvatarColor] = useState<string | null>(initialSession?.avatarColor ?? null);

  /* ========== 基础状态 ========== */
  const [tags, setTags] = useState(initialTags);
  const [appearances, setAppearances] = useState(initialAppearances);
  const [settings, setSettings] = useState(initialSettings);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [mobileTagsOpen, setMobileTagsOpen] = useState(false);
  const contentScrollRef = useRef<HTMLElement | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [floatingButtons, setFloatingButtons] = useState<FloatingButtonItem[]>(initialFloatingButtons);

  /* ========== 弹窗层状态 ========== */
  const [dlState, dlCallbacks] = useDialogLayerState();

  /* ========== 切换用户 ========== */
  const {
    switchUserOpen, setSwitchUserOpen,
    switchableUsers,
    handleUserSwitched,
    handleRemoveSwitchableUser,
  } = useSwitchUser(isAuthenticated, initialSession);

  /* ========== 会话失效检测 ========== */
  const {
    sessionExpiredOpen, expiredMode,
    showTargetGone, handleSessionExpiredConfirm,
  } = useSessionExpired(sessionInvalidated, () => void handleLogout());

  /* ========== 搜索引擎配置 ========== */
  const { engineConfigs, setEngineConfigs } = useSearchEngineConfig();

  /* ========== 搜索栏 ========== */
  const searchBar = useSearchBar({ engines: engineConfigs });

  /* ========== 主题切换 ========== */
  const toggleThemeMode = useCallback(() => {
    searchBar.setSearchMenuOpen(false);
    setThemeMode((c) => (c === "light" ? "dark" : "light"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchBar]);

  /* ========== Toast + 撤销栈 ========== */
  const { toasts, dismissToast, decrementToast, decrementBySignature, dismissUndoToasts, setErrorMessage, notifySuccess } = useToastNotify();
  const undoStack = useUndoStack();

  const notify = useCallback((msg: string, undo?: import("@/hooks/use-undo-stack").UndoAction) => {
    if (undo) {
      const signature = `success::操作成功::${msg}`;
      undoStack.push({ ...undo, toastSignature: signature });
    }
    notifySuccess(msg, undo);
  }, [undoStack, notifySuccess]);

  const handleToastUndo = useCallback((toastId: number) => {
    decrementToast(toastId);
    const entry = undoStack.pop();
    if (entry) void entry.undo();
  }, [decrementToast, undoStack]);

  /* ========== 站点列表 ========== */
  const siteListState = useSiteList({
    activeTagId,
    isAuthenticated,
    localSearchActive: searchBar.localSearchActive,
    localSearchQuery: searchBar.localSearchQuery,
    refreshNonce,
    onError: setErrorMessage,
    scrollRootRef: contentScrollRef,
  });

  /* ========== 管理核心状态 ========== */
  const [adminData, setAdminData] = useState<AdminBootstrap | null>(null);

  /* ========== 外观草稿 ========== */
  const appearance = useAppearance({
    initialAppearances,
    initialSettings,
    isAuthenticated,
    appearances,
    adminData,
    setAppearances,
    setSettings,
    setAdminData,
    setErrorMessage,
  });

  /* ========== 数据同步辅助 ========== */
  const applyAdminBootstrap = useCallback(
    (data: AdminBootstrap) => {
      setAdminData(data);
      appearance.applyAppearanceBootstrap(data.appearances, data.settings);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const syncNavigationData = useCallback(async () => {
    const r = await requestJson<{ items: Tag[] }>("/api/navigation/tags");
    setTags(r.items);
    setRefreshNonce((v) => v + 1);
  }, []);

  const syncAdminBootstrap = useCallback(async () => {
    if (!isAuthenticated) {
      setAdminData(null);
      return;
    }
    applyAdminBootstrap(await requestJson<AdminBootstrap>("/api/admin/bootstrap"));
    try {
      const btns = await requestJson<FloatingButtonItem[]>("/api/floating-buttons");
      setFloatingButtons(btns);
    } catch { /* 未授权时静默忽略 */ }
  }, [isAuthenticated, applyAdminBootstrap]);

  /* ========== 站点/标签编辑器 ========== */
  const editor = useSiteTagEditor({
    activeTagId,
    getAllSites: useCallback(() => adminData?.sites ?? [], [adminData]),
    setMessage: notify,
    setErrorMessage,
    syncNavigationData,
    syncAdminBootstrap,
  });

  /* ========== 配置操作 ========== */
  const config = useConfigActions({
    applyAdminBootstrap,
    setAppearances,
    setTags,
    setSettings,
    setSettingsDraft: appearance.setSettingsDraft,
    setSiteForm: editor.setSiteForm,
    setTagForm: editor.setTagForm,
    setSiteAdminGroup: editor.setSiteAdminGroup,
    setTagAdminGroup: editor.setTagAdminGroup,
    searchBarSetQuery: searchBar.setQuery,
    setRefreshNonce,
    syncNavigationData,
    syncAdminBootstrap,
    getExistingSites: useCallback(() => adminData?.sites ?? [], [adminData]),
  });

  /* ========== 站点名称 ========== */
  const siteName = useSiteName({ settings });

  /* ========== 社交卡片 ========== */
  const socialCards = useSocialCards({
    isAuthenticated,
    setMessage: notify,
    setErrorMessage,
    syncNavigationData,
    syncAdminBootstrap,
    getGlobalSiteIds: useCallback(() => {
      if (!adminData) return [];
      return [...adminData.sites].sort((l, r) => l.globalSortOrder - r.globalSortOrder).map((s) => s.id);
    }, [adminData]),
  });

  /* ========== 笔记卡片 ========== */
  const noteCards = useNoteCards({
    isAuthenticated,
    setMessage: notify,
    setErrorMessage,
    syncNavigationData,
    syncAdminBootstrap,
    getGlobalSiteIds: useCallback(() => {
      if (!adminData) return [];
      return [...adminData.sites].sort((l, r) => l.globalSortOrder - r.globalSortOrder).map((s) => s.id);
    }, [adminData]),
  });

  /* ========== 标签删除 ========== */
  const tagDelete = useTagDelete({
    adminData,
    editor,
    onDeleteSocialTag: () => void socialCards.deleteAllCards(),
    onDeleteNoteTag: () => void noteCards.deleteAllCards(),
  });

  /* ========== 拖拽 ========== */
  const drag = useDragSort({
    tags,
    setTags,
    adminData,
    setAdminData,
    siteList: siteListState.siteList,
    setSiteList: siteListState.setSiteList,
    activeTagId,
    debouncedQuery: siteListState.debouncedQuery,
    isAuthenticated,
    editMode: editor.editMode,
    setMessage: notify,
    setErrorMessage,
    onSortError: async () => {
      await Promise.all([syncNavigationData(), syncAdminBootstrap()]);
    },
  });

  /* ========== 排序上下文 ========== */
  const buildSortContext = useCallback((siteId: string): SiteDeleteSortContext | undefined => {
    if (!adminData) return undefined;
    const globalSiteIds = [...adminData.sites]
      .sort((l, r) => l.globalSortOrder - r.globalSortOrder)
      .map((s) => s.id);
    const tagSiteIds: Record<string, string[]> = {};
    for (const tag of adminData.tags) {
      const ids = adminData.sites
        .filter((s) => s.tags.some((t) => t.id === tag.id))
        .sort((l, r) => (l.tags.find((t) => t.id === tag.id)?.sortOrder ?? 0) - (r.tags.find((t) => t.id === tag.id)?.sortOrder ?? 0))
        .map((s) => s.id);
      if (ids.includes(siteId)) tagSiteIds[tag.id] = ids;
    }
    return { globalSiteIds, tagSiteIds };
  }, [adminData]);

  /* ========== 登出处理 ========== */
  const handleLogout = useCallback(async () => {
    await requestJson("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    setRole(null);
    setNickname(null);
    setUsername(null);
    setAvatarUrl(null);
    setAvatarColor(null);
    config.discardPendingAnalysis();
    editor.resetEditor();
    setAdminData(null);
    await syncNavigationData();
  }, [config, editor, syncNavigationData]);

  // ── Effects ──

  /* Ctrl+Z / Cmd+Z 撤销 */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const entry = undoStack.pop();
        if (!entry) return;
        if (entry.toastSignature) decrementBySignature(entry.toastSignature);
        void entry.undo();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undoStack, decrementBySignature]);

  /* 编辑模式关闭时清空撤销栈 */
  useEffect(() => {
    if (!editor.editMode) {
      undoStack.clear();
      dismissUndoToasts();
    }
  }, [editor.editMode, undoStack, dismissUndoToasts]);

  /* 页面卸载前刷新待清理资源 */
  useEffect(() => {
    function handleBeforeUnload() {
      editor.flushPendingAssetCleanupSync();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editor]);

  /* 当前标签被删除时重置 */
  useEffect(() => {
    if (activeTagId && !tags.some((t) => t.id === activeTagId)) {
      setActiveTagId(null);
    }
  }, [activeTagId, tags]);

  /* 滚动检测 — 显示/隐藏回到顶部按钮 */
  useEffect(() => {
    const checkScroll = () => {
      const el = contentScrollRef.current;
      dlCallbacks.setShowScrollTopButton((el ? el.scrollTop > 260 : false) || window.scrollY > 260);
    };
    checkScroll();
    const el = contentScrollRef.current;
    el?.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("scroll", checkScroll, { passive: true });
    return () => {
      el?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("scroll", checkScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 点击搜索栏外部关闭建议菜单 */
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (!searchBar.searchFormRef.current?.contains(e.target as Node)) searchBar.closeSuggestionMenus();
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [searchBar]);

  /* 同步页面标题 */
  useEffect(() => {
    document.title = siteName.siteNameDraft || siteConfig.appName;
  }, [siteName.siteNameDraft]);

  /* 同步 Favicon */
  const faviconUrl = appearance.settingsDraft.faviconUrl || siteConfig.defaultFaviconSrc;
  useEffect(() => {
    void applyRoundedFavicon(faviconUrl);
  }, [faviconUrl]);

  /* 认证后加载管理数据 */
  useEffect(() => {
    if (!isAuthenticated) return;
    void (async () => {
      applyAdminBootstrap(await requestJson<AdminBootstrap>("/api/admin/bootstrap"));
    })();
  }, [isAuthenticated, applyAdminBootstrap]);

  // ── 组装 Context 值 ──

  return {
    themeMode,
    appearances,
    settings,
    toggleThemeMode,
    isAuthenticated,
    role,
    initialSession: initialSession,
    nickname,
    username,
    avatarUrl,
    avatarColor,
    handleLogout,
    tags,
    activeTagId,
    setActiveTagId,
    mobileTagsOpen,
    setMobileTagsOpen,
    contentScrollRef,
    adminData,
    appearance,
    config,
    editor,
    socialCards,
    noteCards,
    searchBar,
    siteListState,
    siteName,
    drag,
    toasts,
    dismissToast,
    handleToastUndo,
    dlState,
    dlCallbacks,
    switchUserOpen,
    setSwitchUserOpen,
    switchableUsers,
    handleUserSwitched,
    handleRemoveSwitchableUser,
    sessionExpiredOpen,
    expiredMode,
    showTargetGone,
    handleSessionExpiredConfirm,
    syncNavigationData,
    syncAdminBootstrap,
    buildSortContext,
    notify,
    setErrorMessage,
    engineConfigs,
    setEngineConfigs,
    floatingButtons,
    setFloatingButtons,
    tagDelete,
  };
}
