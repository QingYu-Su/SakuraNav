/**
 * Admin 模块类型定义
 * @description 定义管理后台相关的类型、状态和默认值
 */

import { type FontPresetKey, type ThemeMode, type OnlineCheckFrequency, type OnlineCheckMatchMode, type AccessRules, type RelatedSiteItem, type TodoItem, DEFAULT_ONLINE_CHECK_FREQUENCY, DEFAULT_ONLINE_CHECK_TIMEOUT, DEFAULT_ONLINE_CHECK_MATCH_MODE, DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD, DEFAULT_NOTES_AI_ENABLED, DEFAULT_TODOS_AI_ENABLED, DEFAULT_RECOMMEND_CONTEXT_ENABLED } from "@/lib/base/types";

/**
 * 管理区域类型
 */
export type AdminSection = "sites" | "tags" | "appearance" | "config";

/**
 * 管理分组类型
 */
export type AdminGroup = "create" | "edit";

/**
 * 图标来源类型（UI 状态，持久化到表单以支持 Tab 切换恢复）
 */
export type IconSource = "current" | "text" | "upload" | "favicon" | null;

/**
 * 网站表单状态
 */
export type SiteFormState = {
  id?: string;
  name: string;
  url: string;
  description: string | null;
  iconUrl: string;
  iconBgColor: string;
  /** 当前选中的图标来源（UI 状态，不提交到 API） */
  iconSource: IconSource;
  /** 编辑模式下的原始图标 URL（UI 状态，不提交到 API） */
  originalIconUrl: string;
  skipOnlineCheck: boolean;
  onlineCheckFrequency: OnlineCheckFrequency;
  onlineCheckTimeout: number;
  onlineCheckMatchMode: OnlineCheckMatchMode;
  onlineCheckKeyword: string;
  onlineCheckFailThreshold: number;
  tagIds: string[];
  accessRules: AccessRules | null;
  /** 推荐上下文 */
  recommendContext: string;
  /** 推荐上下文开关（关闭时配置仍保留但不生效） */
  recommendContextEnabled: boolean;
  /** 推荐上下文智能生成开关（仅传递给 API，前端 UI 不再展示） */
  recommendContextAutoGen: boolean;
  /** 是否开启 AI 智能关联（仅传递给 API，前端 UI 不再展示） */
  aiRelationEnabled: boolean;
  /** 是否允许被其他网站关联 */
  allowLinkedByOthers: boolean;
  /** 关联网站列表 */
  relatedSites: RelatedSiteItem[];
  /** 关联网站总开关（关闭时不生效但仍保留配置） */
  relatedSitesEnabled: boolean;
  /** 备忘便签 — 备注 */
  notes: string;
  /** 备忘便签 — 备注 AI 可读开关 */
  notesAiEnabled: boolean;
  /** 备忘便签 — 待办列表 */
  todos: TodoItem[];
  /** 备忘便签 — 待办 AI 可读开关 */
  todosAiEnabled: boolean;
};

/**
 * 标签表单状态
 */
export type TagFormState = {
  id?: string;
  name: string;
  description: string;
  /** 关联的网站卡片 ID 列表（编辑标签时用于绑定/解绑站点） */
  siteIds: string[];
};

/**
 * 外观配置草稿（按主题区分）
 */
export type AppearanceDraft = Record<
  ThemeMode,
  {
    desktopWallpaperAssetId: string | null;
    desktopWallpaperUrl: string | null;
    mobileWallpaperAssetId: string | null;
    mobileWallpaperUrl: string | null;
    fontPreset: FontPresetKey;
    fontSize: number;
    overlayOpacity: number;
    textColor: string;
    logoAssetId: string | null;
    logoUrl: string | null;
    faviconAssetId: string | null;
    faviconUrl: string | null;
    /** 桌面端磨砂强度 (0-100) */
    desktopCardFrosted: number;
    /** 移动端磨砂强度 (0-100) */
    mobileCardFrosted: number;
    isDefault: boolean;
  }
>;

/**
 * 网站表单默认值
 */
export const defaultSiteForm: SiteFormState = {
  name: "",
  url: "",
  description: null,
  iconUrl: "",
  iconBgColor: "transparent",
  iconSource: null,
  originalIconUrl: "",
  skipOnlineCheck: false,
  onlineCheckFrequency: DEFAULT_ONLINE_CHECK_FREQUENCY,
  onlineCheckTimeout: DEFAULT_ONLINE_CHECK_TIMEOUT,
  onlineCheckMatchMode: DEFAULT_ONLINE_CHECK_MATCH_MODE,
  onlineCheckKeyword: "",
  onlineCheckFailThreshold: DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD,
  tagIds: [],
  accessRules: null,
  recommendContext: "",
  recommendContextEnabled: DEFAULT_RECOMMEND_CONTEXT_ENABLED,
  recommendContextAutoGen: true,
  aiRelationEnabled: true,
  allowLinkedByOthers: true,
  relatedSites: [],
  relatedSitesEnabled: true,
  notes: "",
  notesAiEnabled: DEFAULT_NOTES_AI_ENABLED,
  todos: [],
  todosAiEnabled: DEFAULT_TODOS_AI_ENABLED,
};

/**
 * 标签表单默认值
 */
export const defaultTagForm: TagFormState = {
  name: "",
  description: "",
  siteIds: [],
};
