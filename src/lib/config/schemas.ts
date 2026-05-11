/**
 * @description 数据模式定义 - 使用 Zod 定义输入验证模式，用于 API 请求参数校验
 */

import { z } from "zod";
import { VIRTUAL_TAG_IDS } from "@/lib/base/types";

/** HTML 标签清理正则 — 移除 <script>, <iframe>, <img onerror=...> 等危险标签 */
const HTML_TAG_REGEX = /<(script|iframe|object|embed|form|input|button|meta|link|style|svg|math)\b[^>]*>|<\/(script|iframe|object|embed|form|input|button|meta|link|style|svg|math)>/gi;

/** 事件属性清理正则 — 移除 on* 事件处理器 */
const EVENT_ATTR_REGEX = /\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi;

/** javascript: 协议清理 */
const JS_PROTOCOL_REGEX = /href\s*=\s*["']?\s*javascript\s*:/gi;

/**
 * 清理用户输入中的危险 HTML 内容
 * - 移除危险标签（script, iframe, object 等）
 * - 移除事件处理器属性（onclick, onerror 等）
 * - 移除 javascript: 协议
 * 保留安全的格式化标签（p, br, b, i, a 等）
 */
export function sanitizeHtmlInput(input: string): string {
  return input
    .replace(HTML_TAG_REGEX, "")
    .replace(EVENT_ATTR_REGEX, "")
    .replace(JS_PROTOCOL_REGEX, 'href="about:blank"');
}


/** 备选 URL 条目 */
const alternateUrlSchema = z.object({
  id: z.string().min(1),
  url: z.url("请输入合法的 URL"),
  label: z.string().max(20).default(""),
});

/** 访问规则配置 */
export const accessRulesSchema = z.object({
  urls: z.array(alternateUrlSchema).default([]),
});

/** 关联站点条目校验 */
export const relatedSiteItemSchema = z.object({
  cardId: z.string().min(1),
  cardName: z.string(),
  cardIconUrl: z.string().nullable(),
  cardUrl: z.string(),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  source: z.enum(["ai", "manual"]).default("manual"),
  reason: z.string().default(""),
});

/** 网站输入验证模式 */
export const siteInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "网站名不能为空").max(80).transform(sanitizeHtmlInput),
  siteUrl: z.url("请输入合法的 URL"),
  siteDescription: z.string().max(200).transform(sanitizeHtmlInput).optional().nullable(),
  iconUrl: z.string().trim().max(500).optional().nullable(),
  iconBgColor: z.string().trim().max(30).optional().nullable(),
  siteIsPinned: z.boolean().default(false),
  siteSkipOnlineCheck: z.boolean().default(false),
  siteOnlineCheckFrequency: z.enum(["5min", "1h", "1d"]).default("1d"),
  siteOnlineCheckTimeout: z.number().int().min(1).max(30).default(3),
  siteOnlineCheckMatchMode: z.enum(["status", "keyword"]).default("status"),
  siteOnlineCheckKeyword: z.string().trim().max(200).default(""),
  siteOnlineCheckFailThreshold: z.number().int().min(1).max(10).default(3),
  siteOfflineNotify: z.boolean().default(true),
  tagIds: z.array(z.string()).default([]).refine(
    (ids) => !ids.some((id) => VIRTUAL_TAG_IDS.has(id)),
    { message: "不允许关联社交卡片或笔记卡片标签" },
  ),
  siteAccessRules: accessRulesSchema.nullable().optional(),
  siteRecommendContext: z.string().max(2000).default(""),
  siteRecommendContextEnabled: z.boolean().default(true),
  siteRecommendContextAutoGen: z.boolean().default(true),
  siteAiRelationEnabled: z.boolean().default(true),
  siteRelatedSites: z.array(relatedSiteItemSchema).default([]),
  siteRelatedSitesEnabled: z.boolean().default(true),
  /** 编辑前的原始 URL（用于检测 URL 变更） */
  originalUrl: z.string().optional(),
  /** 备忘便签 — 备注 */
  siteNotes: z.string().max(5000).transform(sanitizeHtmlInput).default(""),
  /** 备忘便签 — 待办列表 */
  siteTodos: z.array(z.object({
    id: z.string().min(1),
    text: z.string().max(500).transform(sanitizeHtmlInput),
    completed: z.boolean(),
    /** 引用的笔记卡片 ID（由笔记引用自动生成的 todo 项） */
    noteId: z.string().optional(),
  })).default([]),
});

export const tagInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "标签名不能为空").max(40).transform(sanitizeHtmlInput),
  logoUrl: z.string().trim().max(500).optional().nullable(),
  logoBgColor: z.string().trim().max(30).optional().nullable(),
  description: z.string().trim().max(200).transform(sanitizeHtmlInput).optional().nullable(),
});

export const appearanceThemeSchema = z.object({
  desktopWallpaperAssetId: z.string().nullable(),
  mobileWallpaperAssetId: z.string().nullable(),
  fontPreset: z.enum(["grotesk", "serif", "balanced"]),
  fontSize: z.number().min(12).max(24),
  overlayOpacity: z.number().min(0).max(1),
  textColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "文字颜色需为 6 位十六进制颜色值"),
  logoAssetId: z.string().nullable().optional(),
  faviconAssetId: z.string().nullable().optional(),
  /** 磨砂强度 0-100 */
  desktopCardFrosted: z.number().min(0).max(100).optional(),
  /** 磨砂强度 0-100 */
  mobileCardFrosted: z.number().min(0).max(100).optional(),
  isDefault: z.boolean().optional(),
});

export const appearanceSchema = z.object({
  light: appearanceThemeSchema,
  dark: appearanceThemeSchema,
});

export const appSettingsSchema = z.object({
  lightLogoAssetId: z.string().nullable(),
  darkLogoAssetId: z.string().nullable(),
  faviconAssetId: z.string().nullable().optional(),
  siteName: z.string().trim().max(30).transform(sanitizeHtmlInput).nullable().optional(),
  onlineCheckEnabled: z.boolean().optional(),
  onlineCheckTime: z.number().min(0).max(23).optional(),
  socialTagDescription: z.string().trim().max(100).transform(sanitizeHtmlInput).nullable().optional(),
  registrationEnabled: z.boolean().optional(),
  aiApiKey: z.string().max(500).optional(),
  aiApiKeyMasked: z.boolean().optional(),
  aiBaseUrl: z.string().trim().max(500).optional(),
  aiModel: z.string().trim().max(100).optional(),
});

/** 密码强度校验：至少包含大写字母、小写字母和数字 */
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
const PASSWORD_STRENGTH_MSG = "密码需包含大写字母、小写字母和数字";

/** 管理员初始化校验 */
export const setupInputSchema = z.object({
  username: z.string()
    .min(2, "用户名至少 2 个字符")
    .max(10, "用户名最多 10 个字符")
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  password: z.string().min(6, "密码至少 6 位").regex(PASSWORD_STRENGTH_REGEX, PASSWORD_STRENGTH_MSG),
  confirmPassword: z.string().min(6, "确认密码至少 6 位"),
}).refine((d) => d.password === d.confirmPassword, { message: "两次输入的密码不一致", path: ["confirmPassword"] });

/** 导出密码校验常量，供前后端复用 */
export const PASSWORD_RULES = {
  minLength: 6,
  pattern: PASSWORD_STRENGTH_REGEX,
  message: PASSWORD_STRENGTH_MSG,
} as const;

export const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

/** 悬浮按钮单项校验 */
const floatingButtonItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(20),
  enabled: z.boolean(),
  editable: z.boolean(),
  customData: z.record(z.string(), z.string()).optional(),
});

/** 悬浮按钮配置校验 */
export const floatingButtonsSchema = z.object({
  buttons: z.array(floatingButtonItemSchema).min(1),
});

/** 社交卡片输入验证模式 */
export const socialCardInputSchema = z.object({
  id: z.string().optional(),
  cardType: z.enum(["qq", "wechat", "email", "bilibili", "github", "blog", "wechat-official", "telegram", "xiaohongshu", "douyin", "qq-group", "enterprise-wechat"]),
  label: z.string().min(1).max(40).transform(sanitizeHtmlInput),
  iconUrl: z.string().trim().max(500).optional().nullable(),
  iconBgColor: z.string().trim().max(30).optional().nullable(),
  /** 自定义提示文字，单行、最多 40 字，留空则不显示 */
  hint: z.string().trim().max(40).transform(sanitizeHtmlInput).nullable().optional(),
  payload: z.object({
    type: z.enum(["qq", "wechat", "email", "bilibili", "github", "blog", "wechat-official", "telegram", "xiaohongshu", "douyin", "qq-group", "enterprise-wechat"]),
    qqNumber: z.string().max(20).optional(),
    wechatId: z.string().max(100).optional(),
    email: z.string().max(200).email("请输入合法的邮箱地址").optional().or(z.literal("")),
    url: z.url("请输入合法的 URL").optional().or(z.literal("")),
    accountName: z.string().max(100).optional(),
    xhsId: z.string().max(100).optional(),
    douyinId: z.string().max(100).optional(),
    groupNumber: z.string().max(20).optional(),
    ewcId: z.string().max(100).optional(),
    qrCodeUrl: z.string().trim().max(500).optional(),
  }),
});

/** OAuth 供应商配置校验 */
export const oauthProviderConfigSchema = z.object({
  enabled: z.boolean(),
  clientId: z.string().min(1).max(200).optional().default(""),
  clientSecret: z.string().min(1).max(200).optional().default(""),
  appId: z.string().min(1).max(200).optional().default(""),
  appSecret: z.string().min(1).max(200).optional().default(""),
  corpId: z.string().min(1).max(200).optional().default(""),
  agentId: z.string().min(1).max(200).optional().default(""),
  appKey: z.string().min(1).max(200).optional().default(""),
  secret: z.string().min(1).max(200).optional().default(""),
});

/** OAuth 配置整体校验 */
export const oauthConfigSchema = z.object({
  github: oauthProviderConfigSchema.optional(),
  wechat: oauthProviderConfigSchema.optional(),
  wecom: oauthProviderConfigSchema.optional(),
  feishu: oauthProviderConfigSchema.optional(),
  dingtalk: oauthProviderConfigSchema.optional(),
});

/* ── 通知配置 ── */

export const notificationChannelSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(50, "名称不能超过 50 字").transform(sanitizeHtmlInput),
  type: z.enum(["webhook"]).default("webhook"),
  url: z.string().trim().min(1, "请求地址不能为空").max(500, "请求地址不能超过 500 字").url("请输入合法的 URL"),
  method: z.enum(["POST", "PUT", "GET"]).default("POST"),
  contentType: z.enum(["application/json", "application/x-www-form-urlencoded"]).default("application/json"),
  titleParam: z.string().trim().min(1, "标题参数名不能为空").max(50, "标题参数名不能超过 50 字"),
  contentParam: z.string().trim().min(1, "内容参数名不能为空").max(50, "内容参数名不能超过 50 字"),
});

/* ── API Token ── */

export const createApiTokenSchema = z.object({
  name: z.string().trim().min(1, "令牌名称不能为空").max(50, "令牌名称不能超过 50 字").transform(sanitizeHtmlInput),
  expiresIn: z.enum(["30d", "90d", "1y", "never"]),
});




