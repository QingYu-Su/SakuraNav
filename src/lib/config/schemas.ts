/**
 * @description 数据模式定义 - 使用 Zod 定义输入验证模式，用于 API 请求参数校验
 */

import { z } from "zod";

/** 访问条件 — 时间段 */
const timeConditionSchema = z.object({
  type: z.literal("schedule"),
  weekDays: z.array(z.number().int().min(0).max(7)).default([]),
  startHour: z.number().int().min(0).max(23).default(0),
  endHour: z.number().int().min(0).max(23).default(23),
  startDate: z.string().nullable().default(null),
  endDate: z.string().nullable().default(null),
});

/** 访问条件 — 设备 */
const deviceConditionSchema = z.object({
  type: z.literal("device"),
  device: z.enum(["desktop", "mobile"]),
});

/** 访问条件联合 */
const accessConditionSchema = z.discriminatedUnion("type", [timeConditionSchema, deviceConditionSchema]);

/** 备选 URL 条目 */
const alternateUrlSchema = z.object({
  id: z.string().min(1),
  url: z.url("请输入合法的 URL"),
  label: z.string().max(20).default(""),
  enabled: z.boolean().default(true),
  isOnline: z.boolean().nullable().default(null),
  lastCheckTime: z.string().nullable().default(null),
  latency: z.number().nullable().default(null),
  condition: accessConditionSchema.nullable().default(null),
});

/** 访问规则配置 */
export const accessRulesSchema = z.object({
  mode: z.enum(["auto", "conditional"]).default("auto"),
  autoConfig: z.object({
    revertOnRecovery: z.boolean().default(true),
  }).default({ revertOnRecovery: true }),
  urls: z.array(alternateUrlSchema).default([]),
});

/** 网站输入验证模式 */
export const siteInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "网站名不能为空").max(80),
  url: z.url("请输入合法的 URL"),
  description: z.string().max(200).optional().nullable(),
  iconUrl: z.string().trim().optional().nullable(),
  iconBgColor: z.string().trim().optional().nullable(),
  isPinned: z.boolean().default(false),
  skipOnlineCheck: z.boolean().default(false),
  onlineCheckFrequency: z.enum(["5min", "1h", "1d"]).default("1d"),
  onlineCheckTimeout: z.number().int().min(1).max(30).default(3),
  onlineCheckMatchMode: z.enum(["status", "keyword"]).default("status"),
  onlineCheckKeyword: z.string().trim().max(200).default(""),
  onlineCheckFailThreshold: z.number().int().min(1).max(10).default(3),
  tagIds: z.array(z.string()).default([]),
  accessRules: accessRulesSchema.nullable().optional(),
});

export const tagInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "标签名不能为空").max(40),
  logoUrl: z.string().trim().optional().nullable(),
  logoBgColor: z.string().trim().optional().nullable(),
  description: z.string().trim().max(200).optional().nullable(),
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
  siteName: z.string().trim().max(30).nullable().optional(),
  onlineCheckEnabled: z.boolean().optional(),
  onlineCheckTime: z.number().min(0).max(23).optional(),
  socialTagDescription: z.string().trim().max(100).nullable().optional(),
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
export const cardInputSchema = z.object({
  id: z.string().optional(),
  cardType: z.enum(["qq", "wechat", "email", "bilibili", "github", "blog", "wechat-official", "telegram", "xiaohongshu", "douyin", "qq-group", "enterprise-wechat"]),
  label: z.string().min(1).max(40),
  iconUrl: z.string().trim().optional().nullable(),
  iconBgColor: z.string().trim().optional().nullable(),
  /** 自定义提示文字，单行、最多 40 字，留空则不显示 */
  hint: z.string().trim().max(40).nullable().optional(),
  payload: z.object({
    type: z.enum(["qq", "wechat", "email", "bilibili", "github", "blog", "wechat-official", "telegram", "xiaohongshu", "douyin", "qq-group", "enterprise-wechat"]),
    qqNumber: z.string().optional(),
    wechatId: z.string().optional(),
    email: z.string().optional(),
    url: z.string().optional(),
    accountName: z.string().optional(),
    xhsId: z.string().optional(),
    douyinId: z.string().optional(),
    groupNumber: z.string().optional(),
    ewcId: z.string().optional(),
    qrCodeUrl: z.string().trim().optional(),
  }),
});

/** OAuth 供应商配置校验 */
export const oauthProviderConfigSchema = z.object({
  enabled: z.boolean(),
  clientId: z.string().max(200).optional().default(""),
  clientSecret: z.string().max(200).optional().default(""),
  appId: z.string().max(200).optional().default(""),
  appSecret: z.string().max(200).optional().default(""),
  corpId: z.string().max(200).optional().default(""),
  agentId: z.string().max(200).optional().default(""),
  appKey: z.string().max(200).optional().default(""),
  secret: z.string().max(200).optional().default(""),
});

/** OAuth 配置整体校验 */
export const oauthConfigSchema = z.object({
  github: oauthProviderConfigSchema.optional(),
  wechat: oauthProviderConfigSchema.optional(),
  wecom: oauthProviderConfigSchema.optional(),
  feishu: oauthProviderConfigSchema.optional(),
  dingtalk: oauthProviderConfigSchema.optional(),
});



