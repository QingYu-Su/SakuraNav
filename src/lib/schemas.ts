import { z } from "zod";

export const siteInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "网站名不能为空").max(80),
  url: z.url("请输入合法的 URL"),
  description: z.string().min(1, "请输入网站描述").max(200),
  iconUrl: z.string().trim().optional().nullable(),
  tagIds: z.array(z.string()).default([]),
});

export const tagInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "标签名不能为空").max(40),
  isHidden: z.boolean().default(false),
});

export const appearanceThemeSchema = z.object({
  wallpaperAssetId: z.string().nullable(),
  fontPreset: z.enum(["grotesk", "serif", "balanced"]),
  overlayOpacity: z.number().min(0).max(1),
  textColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "文字颜色需为 6 位十六进制颜色值"),
});

export const appearanceSchema = z.object({
  light: appearanceThemeSchema,
  dark: appearanceThemeSchema,
});

export const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});
