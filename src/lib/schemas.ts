import { z } from "zod";

export const siteInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "网站名不能为空").max(80),
  url: z.url("请输入合法的 URL"),
  description: z.string().max(200).optional().nullable(),
  iconUrl: z.string().trim().optional().nullable(),
  isPinned: z.boolean().default(false),
  tagIds: z.array(z.string()).default([]),
});

export const tagInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "标签名不能为空").max(40),
  isHidden: z.boolean().default(false),
  logoUrl: z.string().trim().optional().nullable(),
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
  desktopCardFrosted: z.boolean().optional(),
  mobileCardFrosted: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const appearanceSchema = z.object({
  light: appearanceThemeSchema,
  dark: appearanceThemeSchema,
});

export const appSettingsSchema = z.object({
  lightLogoAssetId: z.string().nullable(),
  darkLogoAssetId: z.string().nullable(),
});

export const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const configArchiveSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  tags: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      sortOrder: z.number(),
      isHidden: z.boolean(),
      logoUrl: z.string().nullable(),
    }),
  ),
  sites: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      url: z.url(),
      description: z.string().nullable(),
      iconUrl: z.string().nullable(),
      isPinned: z.boolean().default(false),
      globalSortOrder: z.number(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  siteTags: z.array(
    z.object({
      siteId: z.string(),
      tagId: z.string(),
      sortOrder: z.number(),
    }),
  ),
  appearances: z.object({
    light: z.object({
      theme: z.literal("light"),
      desktopWallpaperAssetId: z.string().nullable(),
      mobileWallpaperAssetId: z.string().nullable(),
      fontPreset: z.enum(["grotesk", "serif", "balanced"]),
      fontSize: z.number().min(12).max(24).default(16),
      overlayOpacity: z.number().min(0).max(1),
      textColor: z.string(),
      logoAssetId: z.string().nullable().default(null),
      faviconAssetId: z.string().nullable().default(null),
      desktopCardFrosted: z.boolean().default(false),
      mobileCardFrosted: z.boolean().default(false),
      isDefault: z.boolean().default(false),
    }),
    dark: z.object({
      theme: z.literal("dark"),
      desktopWallpaperAssetId: z.string().nullable(),
      mobileWallpaperAssetId: z.string().nullable(),
      fontPreset: z.enum(["grotesk", "serif", "balanced"]),
      fontSize: z.number().min(12).max(24).default(16),
      overlayOpacity: z.number().min(0).max(1),
      textColor: z.string(),
      logoAssetId: z.string().nullable().default(null),
      faviconAssetId: z.string().nullable().default(null),
      desktopCardFrosted: z.boolean().default(false),
      mobileCardFrosted: z.boolean().default(false),
      isDefault: z.boolean().default(false),
    }),
  }),
  settings: z.object({
    lightLogoAssetId: z.string().nullable(),
    darkLogoAssetId: z.string().nullable(),
  }),
  assets: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      mimeType: z.string(),
      createdAt: z.string(),
      archivePath: z.string(),
    }),
  ),
});
