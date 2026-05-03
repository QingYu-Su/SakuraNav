/**
 * 导航站应用级 Context
 * @description 提供主组件的全部共享状态，由 Orchestrator Hook 统一注入
 * 新增功能时只需扩展此接口 + 对应的 Orchestrator Hook，主组件无需修改
 */

"use client";

import { createContext, useContext } from "react";
import type {
  ThemeMode, Tag, AdminBootstrap, AppSettings, FloatingButtonItem,
  SessionUser, SearchEngineConfig,
} from "@/lib/base/types";
import type { SiteDeleteSortContext } from "@/hooks/use-site-tag-editor";
import type { UseAppearanceReturn } from "@/hooks/use-appearance";
import type { UseConfigActionsReturn } from "@/hooks/use-config-actions";
import type { UseSiteTagEditorReturn } from "@/hooks/use-site-tag-editor";
import type { UseSocialCardsReturn } from "@/hooks/use-social-cards";
import type { UseNoteCardsReturn } from "@/hooks/use-note-cards";
import type { UseSearchBarReturn } from "@/hooks/use-search-bar";
import type { UseDragSortReturn } from "@/hooks/use-drag-sort";
import type { UseSiteListReturn } from "@/hooks/use-site-list";
import type { UseSiteNameReturn } from "@/hooks/use-site-name";
import type { UndoAction } from "@/hooks/use-undo-stack";
import type { ToastState } from "@/components/dialogs/notification-toast";
import type { SwitchableUser } from "@/components/dialogs/switch-user-dialog";
import type { DialogLayerOpenState, DialogLayerCallbacks } from "./sakura-dialog-layer";

/** 应用级 Context 数据 */
export interface SakuraNavContextValue {
  // ── 主题 ──
  themeMode: ThemeMode;
  appearances: Record<ThemeMode, import("@/lib/base/types").ThemeAppearance>;
  settings: AppSettings;
  toggleThemeMode: () => void;

  // ── 认证 ──
  isAuthenticated: boolean;
  role: import("@/lib/base/types").UserRole | null;
  initialSession: SessionUser | null;
  nickname: string | null;
  username: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  handleLogout: () => Promise<void>;

  // ── 导航 ──
  tags: Tag[];
  activeTagId: string | null;
  setActiveTagId: React.Dispatch<React.SetStateAction<string | null>>;
  mobileTagsOpen: boolean;
  setMobileTagsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  contentScrollRef: React.RefObject<HTMLElement | null>;

  // ── 管理数据 ──
  adminData: AdminBootstrap | null;

  // ── Feature Hooks ──
  appearance: UseAppearanceReturn;
  config: UseConfigActionsReturn;
  editor: UseSiteTagEditorReturn;
  socialCards: UseSocialCardsReturn;
  noteCards: UseNoteCardsReturn;
  searchBar: UseSearchBarReturn;
  siteListState: UseSiteListReturn;
  siteName: UseSiteNameReturn;
  drag: UseDragSortReturn;

  // ── Toast ──
  toasts: ToastState[];
  dismissToast: (id: number) => void;
  handleToastUndo: (toastId: number) => void;

  // ── 弹窗层 ──
  dlState: DialogLayerOpenState;
  dlCallbacks: DialogLayerCallbacks;

  // ── 切换用户 ──
  switchUserOpen: boolean;
  setSwitchUserOpen: React.Dispatch<React.SetStateAction<boolean>>;
  switchableUsers: SwitchableUser[];
  handleUserSwitched: (user: { username: string; userId: string; role: string }) => void;
  handleRemoveSwitchableUser: (userId: string) => void;

  // ── 会话失效 ──
  sessionExpiredOpen: boolean;
  expiredMode: "session" | "target";
  showTargetGone: () => void;
  handleSessionExpiredConfirm: () => void;

  // ── 数据同步 ──
  syncNavigationData: () => Promise<void>;
  syncAdminBootstrap: () => Promise<void>;
  buildSortContext: (siteId: string) => SiteDeleteSortContext | undefined;

  // ── 消息通知 ──
  notify: (msg: string, undo?: UndoAction) => void;
  setErrorMessage: (msg: string) => void;

  // ── 搜索引擎 ──
  engineConfigs: SearchEngineConfig[];
  setEngineConfigs: React.Dispatch<React.SetStateAction<SearchEngineConfig[]>>;

  // ── 悬浮按钮 ──
  floatingButtons: FloatingButtonItem[];
  setFloatingButtons: React.Dispatch<React.SetStateAction<FloatingButtonItem[]>>;

  // ── 标签删除 ──
  tagDelete: {
    deleteSocialTagDialogOpen: boolean;
    confirmDeleteSocialTag: () => void;
    closeSocialTagDialog: () => void;
    openSocialTagDialog: () => void;
    deleteNoteTagDialogOpen: boolean;
    confirmDeleteNoteTag: () => void;
    closeNoteTagDialog: () => void;
    openNoteTagDialog: () => void;
    deleteTagDialogOpen: boolean;
    deleteTagTarget: Tag | null;
    handleDeleteTag: (tag: Tag) => void;
    confirmDeleteTag: (mode: import("@/components/dialogs/delete-tag-dialog").DeleteTagMode) => void;
    closeDeleteTagDialog: () => void;
  };
}

export const SakuraNavContext = createContext<SakuraNavContextValue | null>(null);

/** 消费应用级 Context */
export function useSakuraNavContext(): SakuraNavContextValue {
  const ctx = useContext(SakuraNavContext);
  if (!ctx) throw new Error("useSakuraNavContext must be used within <SakuraNavContext.Provider>");
  return ctx;
}
