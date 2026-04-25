/**
 * @description 数据模式定义 - 使用 Zod 定义输入验证模式，用于 API 请求参数校验
 */

import { z } from "zod";

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
  tagIds: z.array(z.string()).default([]),
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
});

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


