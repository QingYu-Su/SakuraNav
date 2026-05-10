/**
 * Admin 模块类型定义
 * @description 定义管理后台相关的类型、状态和默认值
 */

import { type FontPresetKey, type ThemeMode, type OnlineCheckFrequency, type OnlineCheckMatchMode, type AccessRules, type RelatedSiteItem, type TodoItem, type Card, DEFAULT_ONLINE_CHECK_FREQUENCY, DEFAULT_ONLINE_CHECK_TIMEOUT, DEFAULT_ONLINE_CHECK_MATCH_MODE, DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD, DEFAULT_NOTES_AI_ENABLED, DEFAULT_TODOS_AI_ENABLED, DEFAULT_RECOMMEND_CONTEXT_ENABLED } from "@/lib/base/types";

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
  siteUrl: string;
  siteDescription: string | null;
  iconUrl: string;
  iconBgColor: string;
  /** 当前选中的图标来源（UI 状态，不提交到 API） */
  iconSource: IconSource;
  /** 编辑模式下的原始图标 URL（UI 状态，不提交到 API） */
  originalIconUrl: string;
  siteSkipOnlineCheck: boolean;
  siteOnlineCheckFrequency: OnlineCheckFrequency;
  siteOnlineCheckTimeout: number;
  siteOnlineCheckMatchMode: OnlineCheckMatchMode;
  siteOnlineCheckKeyword: string;
  siteOnlineCheckFailThreshold: number;
  /** 离线通知开关（站点离线时通过通知配置发送提醒） */
  siteOfflineNotify: boolean;
  tagIds: string[];
  siteAccessRules: AccessRules | null;
  /** 推荐上下文 */
  siteRecommendContext: string;
  /** 推荐上下文开关（关闭时配置仍保留但不生效） */
  siteRecommendContextEnabled: boolean;
  /** 推荐上下文智能生成开关（仅传递给 API，前端 UI 不再展示） */
  siteRecommendContextAutoGen: boolean;
  /** 是否开启 AI 智能关联（仅传递给 API，前端 UI 不再展示） */
  siteAiRelationEnabled: boolean;
  /** 关联网站列表 */
  siteRelatedSites: RelatedSiteItem[];
  /** 关联网站总开关（关闭时不生效但仍保留配置） */
  siteRelatedSitesEnabled: boolean;
  /** 备忘便签 — 备注 */
  siteNotes: string;
  /** 备忘便签 — 备注 AI 可读开关 */
  siteNotesAiEnabled: boolean;
  /** 备忘便签 — 待办列表 */
  siteTodos: TodoItem[];
  /** 备忘便签 — 待办 AI 可读开关 */
  siteTodosAiEnabled: boolean;
  /** 是否置顶 */
  siteIsPinned: boolean;
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
  siteUrl: "",
  siteDescription: null,
  iconUrl: "",
  iconBgColor: "transparent",
  iconSource: null,
  originalIconUrl: "",
  siteSkipOnlineCheck: false,
  siteOnlineCheckFrequency: DEFAULT_ONLINE_CHECK_FREQUENCY,
  siteOnlineCheckTimeout: DEFAULT_ONLINE_CHECK_TIMEOUT,
  siteOnlineCheckMatchMode: DEFAULT_ONLINE_CHECK_MATCH_MODE,
  siteOnlineCheckKeyword: "",
  siteOnlineCheckFailThreshold: DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD,
  siteOfflineNotify: true,
  tagIds: [],
  siteAccessRules: null,
  siteRecommendContext: "",
  siteRecommendContextEnabled: DEFAULT_RECOMMEND_CONTEXT_ENABLED,
  siteRecommendContextAutoGen: true,
  siteAiRelationEnabled: true,
  siteRelatedSites: [],
  siteRelatedSitesEnabled: true,
  siteNotes: "",
  siteNotesAiEnabled: DEFAULT_NOTES_AI_ENABLED,
  siteTodos: [],
  siteTodosAiEnabled: DEFAULT_TODOS_AI_ENABLED,
  siteIsPinned: false,
};

/**
 * 标签表单默认值
 */
export const defaultTagForm: TagFormState = {
  name: "",
  description: "",
  siteIds: [],
};

/**
 * 将 Site 对象转换为 SiteFormState（用于编辑器表单初始化和删除快照构建）
 * 避免在多处重复 Site → SiteFormState 的映射逻辑
 */
export function siteToFormState(site: Card): SiteFormState {
  return {
    id: site.id,
    name: site.name,
    siteUrl: site.siteUrl,
    siteDescription: site.siteDescription,
    iconUrl: site.iconUrl ?? "",
    iconBgColor: site.iconBgColor ?? "transparent",
    iconSource: site.iconUrl ? "current" : null,
    originalIconUrl: site.iconUrl ?? "",
    siteSkipOnlineCheck: site.siteSkipOnlineCheck ?? false,
    siteOnlineCheckFrequency: site.siteOnlineCheckFrequency ?? DEFAULT_ONLINE_CHECK_FREQUENCY,
    siteOnlineCheckTimeout: site.siteOnlineCheckTimeout ?? DEFAULT_ONLINE_CHECK_TIMEOUT,
    siteOnlineCheckMatchMode: site.siteOnlineCheckMatchMode ?? DEFAULT_ONLINE_CHECK_MATCH_MODE,
    siteOnlineCheckKeyword: site.siteOnlineCheckKeyword ?? "",
    siteOnlineCheckFailThreshold: site.siteOnlineCheckFailThreshold ?? DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD,
    siteOfflineNotify: site.siteOfflineNotify ?? true,
    tagIds: site.tags.map((t) => t.id),
    siteAccessRules: site.siteAccessRules ?? null,
    siteRecommendContext: site.siteRecommendContext ?? "",
    siteRecommendContextEnabled: site.siteRecommendContextEnabled ?? DEFAULT_RECOMMEND_CONTEXT_ENABLED,
    siteRecommendContextAutoGen: site.siteRecommendContextAutoGen ?? true,
    siteAiRelationEnabled: site.siteAiRelationEnabled ?? true,
    siteRelatedSites: site.siteRelatedSites ?? [],
    siteRelatedSitesEnabled: site.siteRelatedSitesEnabled ?? true,
    siteNotes: site.siteNotes ?? "",
    siteNotesAiEnabled: site.siteNotesAiEnabled ?? DEFAULT_NOTES_AI_ENABLED,
    siteTodos: site.siteTodos ?? [],
    siteTodosAiEnabled: site.siteTodosAiEnabled ?? DEFAULT_TODOS_AI_ENABLED,
    siteIsPinned: site.siteIsPinned,
  };
}
